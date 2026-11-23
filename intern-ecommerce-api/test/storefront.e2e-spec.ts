import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { ExceptionInterceptor } from 'src/common/interceptors/exception.interceptor';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

/** Server cart, checkout, payments and reviews */
describe('Storefront (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let token: string;

  const server = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set({ Authorization: `Bearer ${adminToken}` });
  const asCustomer = (r: request.Test) => r.set({ Authorization: `Bearer ${token}` });
  const asGuest = (r: request.Test, cartToken?: string) =>
    cartToken ? r.set({ 'X-Cart-Token': cartToken }) : r;

  const delivery = {
    customerName: 'Tester',
    phone: '0901234567',
    shippingAddress: '1 Test street',
  };

  const createProduct = async (body: Record<string, unknown>) =>
    (
      await asAdmin(server().post('/product'))
        .send({ basePrice: 10, stock: 10, ...body })
        .expect(201)
    ).body;

  const setStatus = (orderId: string, status: string) =>
    asAdmin(server().patch(`/order/${orderId}/status`)).send({ status }).expect(200);

  const deliver = async (orderId: string) => {
    for (const status of ['CONFIRMED', 'SHIPPING', 'DELIVERED']) {
      await setStatus(orderId, status);
    }
  };

  const order = async (items: { productId: string; quantity: number }[], extra = {}) =>
    (
      await asCustomer(server().post('/order'))
        .send({ items, ...delivery, ...extra })
        .expect(201)
    ).body;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalInterceptors(new ExceptionInterceptor());
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.cart.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    for (const email of ['admin@example.com', 'tester@example.com']) {
      await server().post('/user').send({ email, password: 'abc123456' });
    }
    await prisma.user.update({ where: { email: 'admin@example.com' }, data: { role: 'ADMIN' } });
    await prisma.user.update({
      where: { email: 'tester@example.com' },
      data: { role: 'USER', name: 'Nguyen Van Tester' },
    });
    adminToken = (
      await server().post('/login').send({ email: 'admin@example.com', password: 'abc123456' })
    ).body.accessToken;
    token = (
      await server().post('/login').send({ email: 'tester@example.com', password: 'abc123456' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Cart', () => {
    it('should keep a guest cart by token and merge it after sign in', async () => {
      const chair = await createProduct({ name: 'Chair', basePrice: 50, discountPercentage: 10 });
      const lamp = await createProduct({ name: 'Lamp', basePrice: 20 });

      // Guest adds items: a token is created and must be sent back
      let res = await server()
        .post('/cart/items')
        .send({ productId: chair.id, quantity: 2 })
        .expect(201);
      const guestToken = res.body.token;
      expect(guestToken).toEqual(expect.any(String));

      res = await asGuest(server().post('/cart/items'), guestToken)
        .send({ productId: lamp.id, quantity: 1 })
        .expect(201);
      expect(res.body).toMatchObject({
        itemCount: 3,
        subtotal: 120,
        total: 110, // 2 x 45 + 20
        discountTotal: 10,
        canCheckout: true,
      });

      // Without the token, a guest has an empty cart
      res = await server().get('/cart').expect(200);
      expect(res.body.items).toEqual([]);

      // The user already has a lamp in their cart
      await asCustomer(server().post('/cart/items'))
        .send({ productId: lamp.id, quantity: 1 })
        .expect(201);

      res = await asCustomer(server().post('/cart/merge'))
        .send({ guestToken })
        .expect(201);
      expect(res.body.token).toBeNull();
      expect(res.body.items.map((i) => [i.name, i.quantity])).toEqual([
        ['Lamp', 2],
        ['Chair', 2],
      ]);
      expect(await prisma.cart.count({ where: { guestToken } })).toEqual(0);
    });

    it('should refuse more than the stock and warn about changes', async () => {
      const lamp = await createProduct({ name: 'Lamp', basePrice: 20, stock: 3 });

      await asCustomer(server().post('/cart/items'))
        .send({ productId: lamp.id, quantity: 5 })
        .expect(400);
      await asCustomer(server().post('/cart/items'))
        .send({ productId: lamp.id, quantity: 3 })
        .expect(201);

      // Price goes up and stock goes down after it was added
      await asAdmin(server().patch(`/product/${lamp.id}`)).send({ basePrice: 25 }).expect(200);
      await asAdmin(server().post(`/stock/${lamp.id}/adjust`))
        .send({ change: -2, reason: 'ADJUSTMENT' })
        .expect(201);

      let res = await asCustomer(server().get('/cart')).expect(200);
      expect(res.body.canCheckout).toBe(false);
      expect(res.body.items[0].warnings).toEqual(
        expect.arrayContaining([
          { type: 'NOT_ENOUGH_STOCK', available: 1 },
          { type: 'PRICE_CHANGED', previousPrice: 20, currentPrice: 25 },
        ]),
      );
      await asCustomer(server().post('/order/checkout')).send(delivery).expect(400);

      // Customer fixes the quantity: the new price is accepted with it
      res = await asCustomer(server().patch(`/cart/items/${lamp.id}`))
        .send({ quantity: 1 })
        .expect(200);
      expect(res.body.items[0].warnings).toEqual([]);
      expect(res.body.canCheckout).toBe(true);

      // A product taken off the shop is flagged
      await asAdmin(server().patch(`/product/${lamp.id}`)).send({ status: 'DRAFT' }).expect(200);
      res = await asCustomer(server().get('/cart')).expect(200);
      expect(res.body.items[0].warnings).toEqual([{ type: 'UNAVAILABLE' }]);
      expect(res.body.total).toEqual(0);
    });

    it('should reject an expired or invalid session instead of using a guest cart', async () => {
      await server()
        .get('/cart')
        .set({ Authorization: 'Bearer not-a-token' })
        .expect(401);
    });

    it('should check out the cart and empty it', async () => {
      const chair = await createProduct({ name: 'Chair', basePrice: 50, stock: 5 });
      await asCustomer(server().post('/cart/items'))
        .send({ productId: chair.id, quantity: 2 })
        .expect(201);

      const res = await asCustomer(server().post('/order/checkout'))
        .send({ ...delivery, paymentMethod: 'BANK_TRANSFER' })
        .expect(201);
      expect(res.body.total).toEqual('100');
      expect(res.body.paymentMethod).toEqual('BANK_TRANSFER');
      expect(res.body.paymentStatus).toEqual('UNPAID');

      const cart = await asCustomer(server().get('/cart')).expect(200);
      expect(cart.body.items).toEqual([]);
      const stock = await prisma.product.findUnique({ where: { id: chair.id } });
      expect(stock.stock).toEqual(3);

      await asCustomer(server().post('/order/checkout')).send(delivery).expect(400);
    });
  });

  describe('Payments', () => {
    it('should mark cash on delivery orders paid when delivered', async () => {
      const chair = await createProduct({ name: 'Chair' });
      const placed = await order([{ productId: chair.id, quantity: 1 }]);
      expect(placed).toMatchObject({ paymentMethod: 'COD', paymentStatus: 'UNPAID' });

      await deliver(placed.id);
      const db = await prisma.order.findUnique({ where: { id: placed.id } });
      expect(db.paymentStatus).toEqual('PAID');
      expect(db.paidAt).toBeInstanceOf(Date);
    });

    it('should give bank transfer details and let admins record the payment', async () => {
      const chair = await createProduct({ name: 'Chair', basePrice: 40 });
      const placed = await order([{ productId: chair.id, quantity: 2 }], {
        paymentMethod: 'BANK_TRANSFER',
      });

      const info = await asCustomer(server().get(`/order/${placed.id}/payment`)).expect(200);
      expect(info.body).toMatchObject({
        method: 'BANK_TRANSFER',
        status: 'UNPAID',
        bankTransfer: { amount: 80, content: placed.code },
      });

      // Customers cannot mark their own order as paid
      await asCustomer(server().patch(`/order/${placed.id}/payment`))
        .send({ status: 'PAID' })
        .expect(403);

      await asAdmin(server().patch(`/order/${placed.id}/payment`))
        .send({ status: 'REFUNDED' })
        .expect(400);
      let res = await asAdmin(server().patch(`/order/${placed.id}/payment`))
        .send({ status: 'PAID', note: 'VCB ref 123' })
        .expect(200);
      expect(res.body.paymentStatus).toEqual('PAID');
      expect(res.body.history.pop().note).toEqual('Payment received: VCB ref 123');

      res = await asAdmin(server().patch(`/order/${placed.id}/payment`))
        .send({ status: 'REFUNDED' })
        .expect(200);
      expect(res.body.paymentStatus).toEqual('REFUNDED');

      const list = await asAdmin(server().get('/order/admin'))
        .query({ paymentStatus: 'REFUNDED' })
        .expect(200);
      expect(list.body.total).toEqual(1);
    });
  });

  describe('Reviews', () => {
    it('should only accept reviews of delivered products, once per order', async () => {
      const chair = await createProduct({ name: 'Chair' });
      const lamp = await createProduct({ name: 'Lamp' });
      const placed = await order([{ productId: chair.id, quantity: 1 }]);

      const review = { orderId: placed.id, productId: chair.id, rating: 5, comment: 'Great' };
      await asCustomer(server().post('/review')).send(review).expect(400); // not delivered yet

      await deliver(placed.id);
      const mine = await asCustomer(server().get('/review/mine')).expect(200);
      expect(mine.body.toReview.map((r) => r.productName)).toEqual(['Chair']);

      await asCustomer(server().post('/review'))
        .send({ ...review, productId: lamp.id })
        .expect(400); // not in this order
      await asCustomer(server().post('/review')).send(review).expect(201);
      await asCustomer(server().post('/review')).send(review).expect(409);
      await asCustomer(server().post('/review'))
        .send({ ...review, rating: 6 })
        .expect(400);
    });

    it('should keep the product rating in sync and support moderation', async () => {
      const chair = await createProduct({ name: 'Chair' });
      const first = await order([{ productId: chair.id, quantity: 1 }]);
      const second = await order([{ productId: chair.id, quantity: 1 }]);
      await deliver(first.id);
      await deliver(second.id);

      const a = await asCustomer(server().post('/review'))
        .send({ orderId: first.id, productId: chair.id, rating: 5 })
        .expect(201);
      await asCustomer(server().post('/review'))
        .send({ orderId: second.id, productId: chair.id, rating: 2, comment: 'Broken leg' })
        .expect(201);

      let page = await server().get(`/review/product/${chair.id}`).expect(200);
      expect(page.body.summary).toMatchObject({ average: 3.5, count: 2 });
      expect(page.body.data[0].author).toEqual('Tester'); // first name only, no email
      expect(page.body.data[0].user).toBeUndefined();

      // Admin hides the bad review and answers the good one
      const admin = await asAdmin(server().get('/review/admin')).query({ rating: 2 }).expect(200);
      await asAdmin(server().patch(`/review/${admin.body.data[0].id}/status`))
        .send({ status: 'HIDDEN' })
        .expect(200);
      await asAdmin(server().patch(`/review/${a.body.id}/reply`))
        .send({ reply: 'Thank you!' })
        .expect(200);

      page = await server().get(`/review/product/${chair.id}`).expect(200);
      expect(page.body.summary).toMatchObject({ average: 5, count: 1 });
      expect(page.body.data[0].reply).toEqual('Thank you!');

      const shop = await server().get('/product').query({ sort: 'rating_desc', minRating: 4 }).expect(200);
      expect(shop.body.data.map((p) => [p.name, p.ratingAverage, p.ratingCount])).toEqual([
        ['Chair', 5, 1],
      ]);

      // Customer edits then deletes their review
      await asCustomer(server().patch(`/review/${a.body.id}`)).send({ rating: 4 }).expect(200);
      await asCustomer(server().delete(`/review/${a.body.id}`)).expect(204);
      const product = await prisma.product.findUnique({ where: { id: chair.id } });
      expect([product.ratingAverage, product.ratingCount]).toEqual([0, 0]);

      await asCustomer(server().get('/review/admin')).expect(403);
    });
  });
});
