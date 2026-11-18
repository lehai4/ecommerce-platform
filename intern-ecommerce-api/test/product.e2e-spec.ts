import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { isDate, isUUID } from 'class-validator';
import { AppModule } from 'src/app.module';
import { CategoryNotFoundException } from 'src/common/exceptions/category/category-not-found.exception';
import { ProductNameInUseException } from 'src/common/exceptions/product/product-name-in-use.exception';
import { ProductNotFoundException } from 'src/common/exceptions/product/product-not-found.exception';
import { ExceptionInterceptor } from 'src/common/interceptors/exception.interceptor';
import {
  maxImageUploadSize,
  validImageUploadTypesRegex,
} from 'src/config/multer-upload.config';
import { CreateProductDto } from 'src/models/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/models/product/dto/update-product.dto';
import { Product } from 'src/models/product/entities/product.entity';
import { FileTypeError } from 'src/models/product/exceptions/file-type.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let adminToken: string;
  let product2Id: string;
  let categoryIds: string[];
  let prisma: PrismaService;

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
    await prisma.user.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    categoryIds = [];

    await request(app.getHttpServer()).post('/user').send({
      email: 'tester@example.com',
      password: 'abc123456',
    });

    await request(app.getHttpServer()).post('/user').send({
      email: 'admin@example.com',
      password: 'abc123456',
    });

    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { role: 'ADMIN' },
    });

    // The API makes the first registered user an ADMIN; only admin@ should be one here
    await prisma.user.updateMany({
      where: { email: { not: 'admin@example.com' } },
      data: { role: 'USER' },
    });

    let response = await request(app.getHttpServer())
      .post('/login')
      .send({ email: 'tester@example.com', password: 'abc123456' });

    token = response.body.accessToken;

    response = await request(app.getHttpServer())
      .post('/login')
      .send({ email: 'admin@example.com', password: 'abc123456' });

    adminToken = response.body.accessToken;

    response = await request(app.getHttpServer())
      .post('/category')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'Madeira' });
    categoryIds.push(response.body.id);

    response = await request(app.getHttpServer())
      .post('/category')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'Casa' });
    categoryIds.push(response.body.id);

    await request(app.getHttpServer())
      .post('/product')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        name: 'Brand1 wood table',
        basePrice: 120.0,
      } as CreateProductDto);

    await request(app.getHttpServer())
      .post('/product')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        name: 'Brand2 wood table',
        basePrice: 123.0,
        discountPercentage: 8,
        stock: 20,
        description: 'Brand2 wood table for offices',
        categories: categoryIds,
      } as CreateProductDto);

    const { id } = await prisma.product.findUnique({
      where: { name: 'Brand2 wood table' },
    });

    product2Id = id;

    await request(app.getHttpServer())
      .post('/product')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        name: 'Brand3 wood table',
        basePrice: 150.0,
      } as CreateProductDto);

    await request(app.getHttpServer())
      .post('/product')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        name: 'Brand4 wood table',
        basePrice: 200.0,
      } as CreateProductDto);
  });

  describe('Post /product', () => {
    it('should create product', async () => {
      const response = await request(app.getHttpServer())
        .post('/product')
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({
          name: 'Brand1 wheelchair',
          basePrice: 199.99,
          discountPercentage: 10,
          stock: 16,
          description: 'Brand1 wheelchair for offices',
        } as CreateProductDto)
        .expect(201);

      const databaseProduct = await prisma.product.findUnique({
        where: { name: 'Brand1 wheelchair' },
      });
      const product = response.body as Product;

      expect(databaseProduct).toBeDefined();

      expect(isUUID(product.id, 4)).toBeTruthy();
      expect(product.name).toEqual('Brand1 wheelchair');
      expect(product.urlName).toEqual('brand1-wheelchair');
      expect(product.picture).toEqual(null);
      expect(product.basePrice).toEqual('199.99');
      expect(product.discountPercentage).toEqual(10);
      expect(product.stock).toEqual(16);
      expect(product.description).toEqual('Brand1 wheelchair for offices');
      expect(isDate(new Date(product.createdAt))).toBeTruthy();
    });

    it('should create product with categories', async () => {
      const response = await request(app.getHttpServer())
        .post('/product')
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({
          name: 'Brand1 wheelchair',
          basePrice: 199.99,
          discountPercentage: 10,
          stock: 16,
          description: 'Brand1 wheelchair for offices',
          categories: categoryIds,
        } as CreateProductDto)
        .expect(201);

      expect(response.body.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Madeira' }),
          expect.objectContaining({ name: 'Casa' }),
        ]),
      );
    });

    it('should not create product if name already in use', async () => {
      await expect(
        request(app.getHttpServer())
          .post('/product')
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({
            name: 'Brand1 wood table',
            basePrice: 139.99,
            discountPercentage: 15,
            stock: 38,
            description: 'Brand 1 wood table for offices',
          } as CreateProductDto)
          .expect(400),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNameInUseException().getResponse()),
      });
    });

    it('should not create product if name already in use by case insensitive and multiple spaces', async () => {
      await expect(
        request(app.getHttpServer())
          .post('/product')
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({
            name: '   BraND1    wOod  TabLe      ',
            basePrice: 139.99,
          } as CreateProductDto)
          .expect(400),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNameInUseException().getResponse()),
      });
    });

    it('should not create product if there is an invalid category', async () => {
      await expect(
        request(app.getHttpServer())
          .post('/product')
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({
            name: 'Brand1 wheelchair',
            basePrice: 199.99,
            categories: [...categoryIds, 'invalidId'],
          } as CreateProductDto)
          .expect(404),
      ).resolves.toMatchObject({
        text: JSON.stringify(new CategoryNotFoundException().getResponse()),
      });
    });

    it('should not create product if not admin', async () => {
      await request(app.getHttpServer())
        .post('/product')
        .set({ Authorization: `Bearer ${token}` })
        .send({
          name: 'Brand2 wood table',
          basePrice: 80.0,
        } as CreateProductDto)
        .expect(403);
    });

    it('should not create product if unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/product')
        .send({
          name: 'Brand2 wood table',
          basePrice: 80.0,
        } as CreateProductDto)
        .expect(401);
    });
  });

  describe('Post /product/picture/:id', () => {
    const buffer = Buffer.from('test file');

    it('should upload picture', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product/picture/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .attach('file', buffer, 'testFile.png')
        .expect(200);

      const product: Product = response.body;
      // Stored under a generated name (local storage or Cloudinary)
      expect(product.picture).toMatch(/\.png$/);
      expect(product.picture.endsWith('testFile.png')).toBeFalsy();

      const databaseProduct = await prisma.product.findUnique({
        where: { id: product2Id },
      });

      expect(product.picture).toEqual(databaseProduct.picture);
    });

    it('should not upload picture if type is invalid', async () => {
      const buffer = Buffer.from('test file');

      await expect(
        request(app.getHttpServer())
          .patch(`/product/picture/${product2Id}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .attach('file', buffer, 'testFile.err')
          .expect(400),
      ).resolves.toMatchObject({
        text: JSON.stringify({
          statusCode: 400,
          message: 'Unsupported file type .err',
        }),
      });
    });

    it('should not upload picture if file is too large', async () => {
      let blobParts = '';
      for (let i = 0; i < maxImageUploadSize + 1; i++) {
        blobParts += 'a';
      }

      const buffer = Buffer.from(blobParts);

      await request(app.getHttpServer())
        .patch(`/product/picture/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .attach('file', buffer, 'testFile.png')
        .expect(413);
    });

    it('should not upload picture if not admin', async () => {
      const buffer = Buffer.from('test file');

      await request(app.getHttpServer())
        .patch(`/product/picture/${product2Id}`)
        .set({ Authorization: `Bearer ${token}` })
        .attach('file', buffer, 'testFile.png')
        .expect(403);
    });

    it('should not upload picture if unauthenticated', async () => {
      const buffer = Buffer.from('test file');

      await request(app.getHttpServer())
        .patch(`/product/picture/${product2Id}`)
        .attach('file', buffer, 'testFile.png')
        .expect(401);
    });
  });

  describe('Get /product', () => {
    const names = (body: { data: Product[] }) => body.data.map((p) => p.name);

    it('should return all products with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/product?sort=name_asc')
        .send()
        .expect(200);

      const products = response.body.data as Product[];

      expect(response.body.total).toEqual(4);
      expect(response.body.page).toEqual(1);
      expect(response.body.offset).toEqual(10);
      expect(products.length).toEqual(4);
      expect(products[1].name).toEqual('Brand2 wood table');

      expect(response.body.data[1].categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Casa', slug: 'casa' }),
          expect.objectContaining({ name: 'Madeira', slug: 'madeira' }),
        ]),
      );
    });

    it('should return all products with custom pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/product?page=2&offset=2&sort=name_asc')
        .send()
        .expect(200);

      const products = response.body.data as Product[];

      expect(response.body.total).toEqual(4);
      expect(products.length).toEqual(2);
      expect(products[1].name).toEqual('Brand4 wood table');
    });

    it('should return all products by productName case insensitive', async () => {
      const response = await request(app.getHttpServer())
        .get('/product?productName=bRaNd1')
        .send()
        .expect(200);

      const products = response.body.data as Product[];

      expect(response.body.total).toEqual(1);
      expect(products[0].name).toEqual('Brand1 wood table');
    });

    it('should sort by price after discount', async () => {
      const response = await request(app.getHttpServer())
        .get('/product?sort=price_asc')
        .expect(200);

      // Brand2 costs 123 with 8% off = 113.16
      expect(names(response.body)).toEqual([
        'Brand2 wood table',
        'Brand1 wood table',
        'Brand3 wood table',
        'Brand4 wood table',
      ]);
      expect(response.body.data[0].salePrice).toEqual('113.16');
    });

    it('should filter by price range', async () => {
      const response = await request(app.getHttpServer())
        .get('/product?minPrice=115&maxPrice=160&sort=price_asc')
        .expect(200);

      expect(names(response.body)).toEqual([
        'Brand1 wood table',
        'Brand3 wood table',
      ]);
    });

    it('should filter by category slug and by stock', async () => {
      let response = await request(app.getHttpServer())
        .get('/product?category=madeira')
        .expect(200);
      expect(names(response.body)).toEqual(['Brand2 wood table']);

      response = await request(app.getHttpServer())
        .get('/product?inStock=true')
        .expect(200);
      expect(names(response.body)).toEqual(['Brand2 wood table']);
    });

    it('should not accept an unknown sort', async () => {
      await request(app.getHttpServer())
        .get('/product?sort=random')
        .expect(400);
    });

    it('should hide DRAFT products from the shop but not from admins', async () => {
      await request(app.getHttpServer())
        .patch(`/product/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({ status: 'DRAFT' })
        .expect(200);

      const shop = await request(app.getHttpServer())
        .get('/product')
        .expect(200);
      expect(shop.body.total).toEqual(3);
      expect(names(shop.body)).not.toContain('Brand2 wood table');

      await request(app.getHttpServer())
        .get('/product/brand2-wood-table')
        .expect(404);

      const admin = await request(app.getHttpServer())
        .get('/product/admin?status=DRAFT')
        .set({ Authorization: `Bearer ${adminToken}` })
        .expect(200);
      expect(names(admin.body)).toEqual(['Brand2 wood table']);

      await request(app.getHttpServer())
        .get('/product/admin')
        .set({ Authorization: `Bearer ${token}` })
        .expect(403);
    });

    it('should filter admin list by stock level', async () => {
      const response = await request(app.getHttpServer())
        .get('/product/admin?stockLevel=out')
        .set({ Authorization: `Bearer ${adminToken}` })
        .expect(200);

      expect(response.body.total).toEqual(3);
      expect(names(response.body)).not.toContain('Brand2 wood table');
    });
  });

  describe('Get /product/id/:id', () => {
    it('should get product by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/product/id/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send()
        .expect(200);

      const product = response.body as Product;

      expect(product.name).toEqual('Brand2 wood table');
      expect(product.picture).toEqual(null);
      expect(product.basePrice).toEqual('123');
      expect(product.discountPercentage).toEqual(8);
      expect(product.stock).toEqual(20);
      expect(product.description).toEqual('Brand2 wood table for offices');

      expect(response.body.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Madeira' }),
          expect.objectContaining({ name: 'Casa' }),
        ]),
      );
    });

    it('should not get product by invalid Id', async () => {
      await expect(
        request(app.getHttpServer())
          .get(`/product/id/InvalidId`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send()
          .expect(404),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNotFoundException().getResponse()),
      });
    });

    it('should not get product if user is not an admin', async () => {
      await request(app.getHttpServer())
        .get(`/product/id/${product2Id}`)
        .set({ Authorization: `Bearer ${token}` })
        .send()
        .expect(403);
    });

    it('should not get product if user is unauthenticated', async () => {
      await request(app.getHttpServer())
        .get(`/product/id/${product2Id}`)
        .send()
        .expect(401);
    });
  });

  describe('Get /product/:urlName', () => {
    it('should get product by urlName', async () => {
      const response = await request(app.getHttpServer())
        .get('/product/brand2-wood-table')
        .send()
        .expect(200);

      const product = response.body as Product;

      expect(product.name).toEqual('Brand2 wood table');
      expect(product.picture).toEqual(null);
      expect(product.basePrice).toEqual('123');
      expect(product.discountPercentage).toEqual(8);
      expect(product.stock).toEqual(20);
      expect(product.description).toEqual('Brand2 wood table for offices');

      expect(response.body.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Madeira' }),
          expect.objectContaining({ name: 'Casa' }),
        ]),
      );
    });

    it('should not get product by urlName if urlName is inexistent', async () => {
      await expect(
        request(app.getHttpServer())
          .get('/product/inexistent-url-name')
          .send()
          .expect(404),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNotFoundException().getResponse()),
      });
    });
  });

  describe('Patch /product/:id ', () => {
    it('should update product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/product/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({
          name: 'Brand2 wood and glass table',
          basePrice: 219.99,
          discountPercentage: 15,
          stock: 56,
          description: 'Brand2 wood and glass table for offices',
        } as UpdateProductDto)
        .expect(200);

      const product = response.body as Product;

      expect(isUUID(product.id, 4)).toBeTruthy();
      expect(product.name).toEqual('Brand2 wood and glass table');
      expect(product.urlName).toEqual('brand2-wood-and-glass-table');
      expect(product.picture).toEqual(null);
      expect(product.basePrice).toEqual('219.99');
      expect(product.discountPercentage).toEqual(15);
      expect(product.stock).toEqual(56);
      expect(product.description).toEqual(
        'Brand2 wood and glass table for offices',
      );
      expect(isDate(new Date(product.createdAt))).toBeTruthy();
    });

    it('should not update product if name is already in use', async () => {
      await expect(
        request(app.getHttpServer())
          .patch(`/product/${product2Id}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({
            name: 'Brand1 wood table',
            basePrice: 91.34,
          } as UpdateProductDto)
          .expect(400),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNameInUseException().getResponse()),
      });
    });

    it('should not update product if id is invalid', async () => {
      await expect(
        request(app.getHttpServer())
          .patch(`/product/invalidId`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({
            name: 'Brand2 wood and glass table',
            basePrice: 218.98,
          } as UpdateProductDto)
          .expect(404),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNotFoundException().getResponse()),
      });
    });

    it('should not update product if user is not and admin', async () => {
      await request(app.getHttpServer())
        .patch(`/product/${product2Id}`)
        .set({ Authorization: `Bearer ${token}` })
        .send({
          name: 'Brand2 wood and glass table',
        } as UpdateProductDto)
        .expect(403);
    });

    it('should not update product if user is unauthenticated', async () => {
      await request(app.getHttpServer())
        .patch(`/product/${product2Id}`)
        .send({
          name: 'Brand2 wood and glass table',
        } as UpdateProductDto)
        .expect(401);
    });
  });

  describe('Delete /product/:id', () => {
    it('should soft delete product', async () => {
      await request(app.getHttpServer())
        .delete(`/product/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send()
        .expect(204);

      // Hidden everywhere...
      const shop = await request(app.getHttpServer()).get('/product');
      expect(shop.body.total).toEqual(3);
      await request(app.getHttpServer())
        .get(`/product/id/${product2Id}`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .expect(404);

      // ...but the row is kept for existing orders
      const databaseProduct = await prisma.product.findUnique({
        where: { id: product2Id },
      });
      expect(databaseProduct.deletedAt).toBeInstanceOf(Date);
      expect(databaseProduct.status).toEqual('ARCHIVED');

      // and its name can be used again
      await request(app.getHttpServer())
        .post('/product')
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({ name: 'Brand2 wood table', basePrice: 10 })
        .expect(201);
    });

    it('should not delete product if id is invalid', async () => {
      await expect(
        request(app.getHttpServer())
          .delete(`/product/InvalidId`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send()
          .expect(404),
      ).resolves.toMatchObject({
        text: JSON.stringify(new ProductNotFoundException().getResponse()),
      });
    });

    it('should not delete product if user is not admin', async () => {
      await request(app.getHttpServer())
        .delete(`/product/${product2Id}`)
        .set({ Authorization: `Bearer ${token}` })
        .send()
        .expect(403);
    });

    it('should not delete product if unauthenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/product/${product2Id}`)
        .send()
        .expect(401);
    });
  });
});
