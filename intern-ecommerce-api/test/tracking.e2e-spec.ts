import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { ExceptionInterceptor } from 'src/common/interceptors/exception.interceptor';
import { PrismaService } from 'src/prisma/prisma.service';
import { todayString } from 'src/util/date-range';
import request from 'supertest';

/** Stock history, dashboard stats and customer management */
describe('Tracking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let token: string;
  let customerRefreshToken: string;
  let adminId: string;
  let customerId: string;

  const server = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) =>
    r.set({ Authorization: `Bearer ${adminToken}` });
  const asCustomer = (r: request.Test) =>
    r.set({ Authorization: `Bearer ${token}` });

  const createProduct = async (body: Record<string, unknown>) =>
    (
      await asAdmin(server().post('/product'))
        .send({ basePrice: 10, ...body })
        .expect(201)
    ).body;

  const placeOrder = async (productId: string, quantity: number) =>
    (
      await asCustomer(server().post('/order'))
        .send({
          items: [{ productId, quantity }],
          customerName: 'Tester',
          phone: '0901234567',
          shippingAddress: '1 Test street',
        })
        .expect(201)
    ).body;

  const setStatus = (orderId: string, status: string) =>
    asAdmin(server().patch(`/order/${orderId}/status`))
      .send({ status })
      .expect(200);

  const movements = async (productId: string) =>
    (
      await asAdmin(server().get('/stock/movements'))
        .query({ productId })
        .expect(200)
    ).body.data;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ExceptionInterceptor());
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.purchase.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    for (const email of ['admin@example.com', 'tester@example.com']) {
      await server().post('/user').send({ email, password: 'abc123456' });
    }
    adminId = (
      await prisma.user.update({
        where: { email: 'admin@example.com' },
        data: { role: 'ADMIN' },
      })
    ).id;
    customerId = (
      await prisma.user.update({
        where: { email: 'tester@example.com' },
        data: { role: 'USER', name: 'Tester' },
      })
    ).id;

    adminToken = (
      await server()
        .post('/login')
        .send({ email: 'admin@example.com', password: 'abc123456' })
    ).body.accessToken;
    const login = await server()
      .post('/login')
      .send({ email: 'tester@example.com', password: 'abc123456' });
    token = login.body.accessToken;
    customerRefreshToken = login.body.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Stock history', () => {
    it('should trace every stock change', async () => {
      const product = await createProduct({ name: 'Traced lamp', stock: 10 });

      // Restock
      let res = await asAdmin(server().post(`/stock/${product.id}/adjust`))
        .send({ change: 5, reason: 'RESTOCK', note: 'Supplier delivery' })
        .expect(201);
      expect(res.body.stock).toEqual(15);

      // Cannot go below zero
      await asAdmin(server().post(`/stock/${product.id}/adjust`))
        .send({ change: -100, reason: 'ADJUSTMENT' })
        .expect(400);

      // Stock typed in the product form
      await asAdmin(server().patch(`/product/${product.id}`))
        .send({ stock: 20 })
        .expect(200);

      // Sale, then cancellation
      const order = await placeOrder(product.id, 3);
      await setStatus(order.id, 'CANCELLED');

      const list = await movements(product.id);
      // newest first
      expect(list.map((m) => [m.reason, m.change, m.stockAfter])).toEqual([
        ['ORDER_CANCELLED', 3, 20],
        ['SALE', -3, 17],
        ['ADJUSTMENT', 5, 20],
        ['RESTOCK', 5, 15],
        ['INITIAL', 10, 10],
      ]);
      expect(list[1].order.code).toEqual(order.code);
      expect(list[1].user.email).toEqual('tester@example.com');
      expect(list[3].user.email).toEqual('admin@example.com');
      expect(list[3].note).toEqual('Supplier delivery');

      res = await asAdmin(server().get('/stock/movements'))
        .query({ reason: 'SALE' })
        .expect(200);
      expect(res.body.total).toEqual(1);
    });

    it('should only accept manual reasons and non-zero changes', async () => {
      const product = await createProduct({ name: 'Strict lamp', stock: 1 });
      await asAdmin(server().post(`/stock/${product.id}/adjust`))
        .send({ change: 1, reason: 'SALE' })
        .expect(400);
      await asAdmin(server().post(`/stock/${product.id}/adjust`))
        .send({ change: 0, reason: 'RESTOCK' })
        .expect(400);
    });

    it('should be admin only', async () => {
      const product = await createProduct({ name: 'Private lamp', stock: 1 });
      await asCustomer(server().get('/stock/movements')).expect(403);
      await asCustomer(server().post(`/stock/${product.id}/adjust`))
        .send({ change: 1, reason: 'RESTOCK' })
        .expect(403);
    });
  });

  describe('Dashboard', () => {
    it('should count sales, revenue and statuses for the period', async () => {
      const chair = await createProduct({ name: 'Chair', basePrice: 50, stock: 20 });
      const lamp = await createProduct({ name: 'Lamp', basePrice: 20, stock: 6 });

      const delivered = await placeOrder(chair.id, 2); // 100
      for (const status of ['CONFIRMED', 'SHIPPING', 'DELIVERED']) {
        await setStatus(delivered.id, status);
      }
      await placeOrder(lamp.id, 3); // 60, pending; lamp stock -> 3
      const cancelled = await placeOrder(chair.id, 1);
      await setStatus(cancelled.id, 'CANCELLED');

      const today = todayString();
      const res = await asAdmin(server().get('/stats/dashboard'))
        .query({ from: today, to: today })
        .expect(200);
      const body = res.body;

      expect(body.kpis).toEqual({
        revenue: 100,
        sales: 160,
        orders: 2,
        averageOrderValue: 80,
        itemsSold: 5,
        newCustomers: 1,
      });
      expect(body.sales).toEqual([
        { date: today, orders: 2, revenue: 100, sales: 160 },
      ]);
      const byStatus = Object.fromEntries(
        body.ordersByStatus.map((s) => [s.status, s.count]),
      );
      expect(byStatus).toMatchObject({ DELIVERED: 1, PENDING: 1, CANCELLED: 1 });
      expect(body.pendingOrders).toEqual(1);
      expect(body.topProducts.map((p) => [p.name, p.quantity, p.revenue])).toEqual([
        ['Lamp', 3, 60],
        ['Chair', 2, 100],
      ]);
      expect(body.lowStock.map((p) => [p.name, p.stock])).toEqual([['Lamp', 3]]);
    });

    it('should fill every day and validate the period', async () => {
      const res = await asAdmin(server().get('/stats/dashboard'))
        .query({ from: '2026-01-01', to: '2026-01-07' })
        .expect(200);
      expect(res.body.sales).toHaveLength(7);
      expect(res.body.range.previousFrom).toEqual('2025-12-25');

      await asAdmin(server().get('/stats/dashboard'))
        .query({ from: '2024-01-01', to: '2026-01-01' })
        .expect(400);
      await asAdmin(server().get('/stats/dashboard'))
        .query({ from: '01/01/2026' })
        .expect(400);
      await asCustomer(server().get('/stats/dashboard')).expect(403);
    });
  });

  describe('Customers', () => {
    it('should list customers with their order stats', async () => {
      const chair = await createProduct({ name: 'Chair', basePrice: 50, stock: 20 });
      await placeOrder(chair.id, 2);

      const res = await asAdmin(server().get('/customer'))
        .query({ sort: 'spent_desc' })
        .expect(200);
      expect(res.body.total).toEqual(2);
      expect(res.body.data[0]).toMatchObject({
        email: 'tester@example.com',
        orders: 1,
        spent: 100,
      });
      expect(res.body.data[0].password).toBeUndefined();

      const search = await asAdmin(server().get('/customer'))
        .query({ search: '0901234', role: 'USER' })
        .expect(200);
      expect(search.body.data.map((c) => c.email)).toEqual(['tester@example.com']);

      const detail = await asAdmin(server().get(`/customer/${customerId}`)).expect(200);
      expect(detail.body.stats).toMatchObject({ orders: 1, spent: 100 });
      expect(detail.body.addresses[0]).toMatchObject({
        phone: '0901234567',
        shippingAddress: '1 Test street',
        times: 1,
      });
      expect(detail.body.recentOrders).toHaveLength(1);
    });

    it('should lock and unlock an account', async () => {
      await asAdmin(server().patch(`/customer/${customerId}/block`))
        .send({ blocked: true })
        .expect(200);

      await server()
        .post('/login')
        .send({ email: 'tester@example.com', password: 'abc123456' })
        .expect(403);
      // Existing sessions were revoked
      const refresh = await server()
        .post('/refresh')
        .send({ refreshToken: customerRefreshToken });
      expect([401, 403]).toContain(refresh.status);

      await asAdmin(server().patch(`/customer/${customerId}/block`))
        .send({ blocked: false })
        .expect(200);
      await server()
        .post('/login')
        .send({ email: 'tester@example.com', password: 'abc123456' })
        .expect(200);
    });

    it('should change roles but not the admin own role or lock', async () => {
      const res = await asAdmin(server().patch(`/customer/${customerId}/role`))
        .send({ role: 'ADMIN' })
        .expect(200);
      expect(res.body.role).toEqual('ADMIN');

      await asAdmin(server().patch(`/customer/${adminId}/role`))
        .send({ role: 'USER' })
        .expect(400);
      await asAdmin(server().patch(`/customer/${adminId}/block`))
        .send({ blocked: true })
        .expect(400);
    });

    it('should be admin only', async () => {
      await asCustomer(server().get('/customer')).expect(403);
      await asCustomer(server().get(`/customer/${customerId}`)).expect(403);
    });
  });
});
