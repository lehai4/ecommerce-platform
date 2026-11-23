import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from 'src/app.module';
import { ExceptionInterceptor } from 'src/common/interceptors/exception.interceptor';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

/** Images, SKU, accent-insensitive search, bulk actions and category tree */
describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let token: string;

  const png = Buffer.from('fake png content');
  const fileOf = (url: string) => join('storage', url.split('/').pop());
  const server = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) =>
    r.set({ Authorization: `Bearer ${adminToken}` });

  const createProduct = async (body: Record<string, unknown>) =>
    (
      await asAdmin(server().post('/product'))
        .send({ basePrice: 10, ...body })
        .expect(201)
    ).body;

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
    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { role: 'ADMIN' },
    });
    await prisma.user.update({
      where: { email: 'tester@example.com' },
      data: { role: 'USER' },
    });

    adminToken = (
      await server()
        .post('/login')
        .send({ email: 'admin@example.com', password: 'abc123456' })
    ).body.accessToken;
    token = (
      await server()
        .post('/login')
        .send({ email: 'tester@example.com', password: 'abc123456' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product images', () => {
    it('should add, reorder and delete images, keeping the cover in sync', async () => {
      const product = await createProduct({ name: 'Gallery table' });

      // Add two images
      let res = await asAdmin(server().post(`/product/${product.id}/images`))
        .attach('files', png, 'a.png')
        .attach('files', png, 'b.png')
        .expect(201);
      const [a, b] = res.body.images;
      expect(res.body.images).toHaveLength(2);
      expect(res.body.picture).toEqual(a.url);
      expect(existsSync(fileOf(a.url))).toBe(true);

      // Reorder: b becomes the cover
      res = await asAdmin(server().patch(`/product/${product.id}/images/order`))
        .send({ imageIds: [b.id, a.id] })
        .expect(200);
      expect(res.body.images.map((i) => i.id)).toEqual([b.id, a.id]);
      expect(res.body.picture).toEqual(b.url);

      // Delete a: file is removed from disk, cover stays b
      res = await asAdmin(
        server().delete(`/product/${product.id}/images/${a.id}`),
      ).expect(200);
      expect(res.body.images.map((i) => i.id)).toEqual([b.id]);
      expect(res.body.picture).toEqual(b.url);
      expect(existsSync(fileOf(a.url))).toBe(false);

      // Delete the last one: no cover any more
      res = await asAdmin(
        server().delete(`/product/${product.id}/images/${b.id}`),
      ).expect(200);
      expect(res.body.images).toEqual([]);
      expect(res.body.picture).toBeNull();
    });

    it('should reject a reorder that does not list every image', async () => {
      const product = await createProduct({ name: 'Gallery chair' });
      const res = await asAdmin(server().post(`/product/${product.id}/images`))
        .attach('files', png, 'a.png')
        .attach('files', png, 'b.png')
        .expect(201);

      await asAdmin(server().patch(`/product/${product.id}/images/order`))
        .send({ imageIds: [res.body.images[0].id] })
        .expect(400);
    });

    it('should not allow more than 10 images', async () => {
      const product = await createProduct({ name: 'Gallery lamp' });
      let req = asAdmin(server().post(`/product/${product.id}/images`));
      for (let i = 0; i < 10; i++) req = req.attach('files', png, `${i}.png`);
      await req.expect(201);

      await asAdmin(server().post(`/product/${product.id}/images`))
        .attach('files', png, 'extra.png')
        .expect(400);
    });

    it('should replace the cover with the legacy picture endpoint', async () => {
      const product = await createProduct({ name: 'Legacy shelf' });
      const first = await asAdmin(server().patch(`/product/picture/${product.id}`))
        .attach('file', png, 'old.png')
        .expect(200);
      const second = await asAdmin(server().patch(`/product/picture/${product.id}`))
        .attach('file', png, 'new.png')
        .expect(200);

      expect(second.body.images).toHaveLength(1);
      expect(second.body.picture).not.toEqual(first.body.picture);
      expect(existsSync(fileOf(first.body.picture))).toBe(false);
    });

    it('should not manage images if not admin', async () => {
      const product = await createProduct({ name: 'Private desk' });
      await server()
        .post(`/product/${product.id}/images`)
        .set({ Authorization: `Bearer ${token}` })
        .attach('files', png, 'a.png')
        .expect(403);
    });
  });

  describe('SKU and search', () => {
    it('should keep SKUs unique and free them when removed', async () => {
      const product = await createProduct({ name: 'Black tee', sku: 'TEE-BLK-M' });
      expect(product.sku).toEqual('TEE-BLK-M');

      await asAdmin(server().post('/product'))
        .send({ name: 'Other tee', basePrice: 5, sku: 'TEE-BLK-M' })
        .expect(409);

      await asAdmin(server().patch(`/product/${product.id}`))
        .send({ sku: null })
        .expect(200);
      await createProduct({ name: 'Other tee', sku: 'TEE-BLK-M' });
    });

    it('should reject invalid SKUs', async () => {
      await asAdmin(server().post('/product'))
        .send({ name: 'Bad sku', basePrice: 5, sku: 'has spaces' })
        .expect(400);
    });

    it('should search by SKU and without accents', async () => {
      await createProduct({ name: 'Áo thun nam basic', sku: 'AT-001' });
      await createProduct({ name: 'Quần jean' });

      const names = async (q: string) =>
        (
          await server()
            .get('/product')
            .query({ productName: q })
            .expect(200)
        ).body.data.map((p) => p.name);

      expect(await names('ao thun')).toEqual(['Áo thun nam basic']);
      expect(await names('ÁO THUN')).toEqual(['Áo thun nam basic']);
      expect(await names('at-001')).toEqual(['Áo thun nam basic']);
      expect(await names('quan')).toEqual(['Quần jean']);
    });
  });

  describe('Bulk actions', () => {
    it('should change the status of many products', async () => {
      const a = await createProduct({ name: 'Bulk a' });
      const b = await createProduct({ name: 'Bulk b' });
      await createProduct({ name: 'Bulk c' });

      const res = await asAdmin(server().patch('/product/bulk/status'))
        .send({ ids: [a.id, b.id], status: 'ARCHIVED' })
        .expect(200);
      expect(res.body).toEqual({ count: 2 });

      const shop = await server().get('/product').expect(200);
      expect(shop.body.data.map((p) => p.name)).toEqual(['Bulk c']);
    });

    it('should soft delete many products', async () => {
      const a = await createProduct({ name: 'Bulk d' });
      const b = await createProduct({ name: 'Bulk e' });

      const res = await asAdmin(server().post('/product/bulk/delete'))
        .send({ ids: [a.id, b.id] })
        .expect(200);
      expect(res.body).toEqual({ count: 2 });

      const deleted = await prisma.product.count({
        where: { id: { in: [a.id, b.id] }, deletedAt: { not: null } },
      });
      expect(deleted).toEqual(2);
    });

    it('should not run bulk actions if not admin', async () => {
      const a = await createProduct({ name: 'Bulk f' });
      await server()
        .patch('/product/bulk/status')
        .set({ Authorization: `Bearer ${token}` })
        .send({ ids: [a.id], status: 'DRAFT' })
        .expect(403);
    });
  });

  describe('Category tree', () => {
    const createCategory = async (body: Record<string, unknown>) =>
      (await asAdmin(server().post('/category')).send(body).expect(201)).body;

    it('should build a tree and filter products by a parent category', async () => {
      const fashion = await createCategory({
        name: 'Thời trang',
        description: 'Quần áo cho mọi người',
      });
      const tees = await createCategory({ name: 'Áo thun', parentId: fashion.id });
      await createCategory({ name: 'Điện thoại' });

      expect(fashion.slug).toEqual('thoi-trang');
      expect(fashion.description).toEqual('Quần áo cho mọi người');

      const tree = await server().get('/category/tree').expect(200);
      const top = tree.body.map((c) => c.name);
      expect(top).toEqual(['Điện thoại', 'Thời trang']);
      const fashionNode = tree.body.find((c) => c.id === fashion.id);
      expect(fashionNode.children.map((c) => c.slug)).toEqual(['ao-thun']);
      expect(fashionNode.children[0].children).toEqual([]);

      await createProduct({ name: 'Plain tee', categories: [tees.id] });
      const shop = await server()
        .get('/product')
        .query({ category: 'thoi-trang' })
        .expect(200);
      expect(shop.body.data.map((p) => p.name)).toEqual(['Plain tee']);

      const page = await server().get('/category/thoi-trang').expect(200);
      expect(page.body.children.map((c) => c.slug)).toEqual(['ao-thun']);
    });

    it('should not allow loops in the tree', async () => {
      const parent = await createCategory({ name: 'Parent' });
      const child = await createCategory({ name: 'Child', parentId: parent.id });

      await asAdmin(server().patch(`/category/${parent.id}`))
        .send({ parentId: parent.id })
        .expect(400);
      await asAdmin(server().patch(`/category/${parent.id}`))
        .send({ parentId: child.id })
        .expect(400);
    });

    it('should move sub-categories to the top level when the parent is deleted', async () => {
      const parent = await createCategory({ name: 'Old parent' });
      const child = await createCategory({ name: 'Orphan', parentId: parent.id });

      await asAdmin(server().delete(`/category/${parent.id}`)).expect(204);

      const db = await prisma.category.findUnique({ where: { id: child.id } });
      expect(db.parentId).toBeNull();
    });

    it('should set and remove the category image', async () => {
      const category = await createCategory({ name: 'With image' });

      const set = await asAdmin(server().post(`/category/${category.id}/image`))
        .attach('file', png, 'cat.png')
        .expect(201);
      expect(set.body.image).toMatch(/\.png$/);
      expect(existsSync(fileOf(set.body.image))).toBe(true);

      const removed = await asAdmin(
        server().delete(`/category/${category.id}/image`),
      ).expect(200);
      expect(removed.body.image).toBeNull();
      expect(existsSync(fileOf(set.body.image))).toBe(false);
    });
  });
});
