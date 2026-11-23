import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import currency from 'currency.js';
import { ImageStorageService } from 'src/common/image-storage/image-storage.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductNameInUseException } from 'src/common/exceptions/product/product-name-in-use.exception';
import { slugify } from 'src/util/slugify';
import { CreateProductDto } from './dto/create-product.dto';
import {
  AdminFindProductsDto,
  FindProductsDto,
  ProductSort,
} from './dto/find-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { File } from './types/file';

const LOW_STOCK = 5;

const productInclude = {
  categories: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

/** Products that are not soft deleted */
const notDeleted: Prisma.ProductWhereInput = { deletedAt: null };

const SORT_ORDER: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> =
  {
    newest: [{ createdAt: 'desc' }],
    oldest: [{ createdAt: 'asc' }],
    price_asc: [{ salePrice: 'asc' }, { name: 'asc' }],
    price_desc: [{ salePrice: 'desc' }, { name: 'asc' }],
    name_asc: [{ name: 'asc' }],
    name_desc: [{ name: 'desc' }],
    best_selling: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
  };

/** Paginated result */
export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  offset: number;
}

/** Responsible for managing products in the database. */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  /** Creates a new product */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categories, ...data } = createProductDto;

    return this.prisma.product.create({
      data: {
        ...data,
        urlName: await this.uniqueUrlName(data.name),
        salePrice: this.salePrice(data.basePrice, data.discountPercentage),
        categories: this.connectCategoriesById(categories),
      },
      include: productInclude,
    });
  }

  /** Uploads new product picture */
  async uploadPicture(id: string, file: File): Promise<Product> {
    if (!file) {
      throw new BadRequestException('Please choose an image to upload');
    }
    // Make sure the product exists before uploading anything
    await this.findOneById(id);

    const picture = await this.imageStorage.upload(file, 'products');

    return this.prisma.product.update({
      where: { id },
      data: { picture },
      include: productInclude,
    });
  }

  /** Products shown in the shop: only ACTIVE, with filters, sorting and total count */
  findAll(dto: FindProductsDto): Promise<PaginatedProducts> {
    return this.paginate(dto, { status: ProductStatus.ACTIVE });
  }

  /** Products for admins: every status, plus status and stock filters */
  findAllForAdmin({
    status,
    stockLevel,
    ...dto
  }: AdminFindProductsDto): Promise<PaginatedProducts> {
    const where: Prisma.ProductWhereInput = { status };
    if (stockLevel === 'out') where.stock = { lte: 0 };
    if (stockLevel === 'low') where.stock = { gt: 0, lte: LOW_STOCK };
    return this.paginate(dto, where);
  }

  /** Find product by ID (any status), for admins */
  async findOneById(id: string): Promise<Product> {
    return this.prisma.product.findFirst({
      where: { id, ...notDeleted },
      include: productInclude,
      rejectOnNotFound: true,
    });
  }

  /** Find product by Url Name, only if it is shown in the shop */
  async findOneByUrlName(urlName: string): Promise<Product> {
    return this.prisma.product.findFirst({
      where: { urlName, status: ProductStatus.ACTIVE, ...notDeleted },
      include: productInclude,
      rejectOnNotFound: true,
    });
  }

  /** Updates product information */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const current = await this.findOneById(id);
    const { categories, ...fields } = updateProductDto;

    const data: Prisma.ProductUpdateInput = { ...fields };

    if (fields.name && fields.name !== current.name) {
      data.urlName = await this.uniqueUrlName(fields.name, id);
    }
    if (
      fields.basePrice !== undefined ||
      fields.discountPercentage !== undefined
    ) {
      data.salePrice = this.salePrice(
        fields.basePrice ?? current.basePrice,
        fields.discountPercentage ?? current.discountPercentage,
      );
    }
    // Replace the product categories only when the field is sent
    if (categories) {
      data.categories = {
        set: categories.map((categoryId) => ({ id: categoryId })),
      };
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });
  }

  /** Soft deletes a product.
   *
   * The row is kept so orders and purchases that reference it stay valid,
   * but it disappears from every list. Its name and url are freed so a new
   * product can reuse them.
   */
  async remove(id: string): Promise<void> {
    const product = await this.findOneById(id);
    const suffix = `deleted-${Date.now().toString(36)}`;

    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
        name: `${product.name} (${suffix})`,
        urlName: `${product.urlName}--${suffix}`,
        categories: { set: [] },
      },
    });
  }

  private async paginate(
    {
      productName,
      category,
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      sort = 'newest',
      page = 1,
      offset = 10,
    }: FindProductsDto,
    extraWhere: Prisma.ProductWhereInput,
  ): Promise<PaginatedProducts> {
    const where: Prisma.ProductWhereInput = {
      ...notDeleted,
      ...extraWhere,
      AND: [
        productName
          ? { name: { contains: productName.trim(), mode: 'insensitive' } }
          : {},
        category ? { categories: { some: { slug: category } } } : {},
        categoryId ? { categories: { some: { id: categoryId } } } : {},
        minPrice !== undefined ? { salePrice: { gte: minPrice } } : {},
        maxPrice !== undefined ? { salePrice: { lte: maxPrice } } : {},
        inStock ? { stock: { gt: 0 } } : {},
      ],
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * offset,
        take: offset,
        orderBy: SORT_ORDER[sort],
        include: productInclude,
      }),
    ]);

    return { data, total, page, offset };
  }

  private salePrice(
    basePrice: string | number | Prisma.Decimal,
    discountPercentage = 0,
  ): number {
    return currency(Number(basePrice)).multiply(
      (100 - (discountPercentage || 0)) / 100,
    ).value;
  }

  /** Url name from the product name.
   *
   * Two names that give the same url ("Brand1 Chair" / "brand1   chair")
   * are treated as the same name. Soft deleted products have their url
   * renamed, so they never block a new product.
   */
  private async uniqueUrlName(name: string, exceptId?: string): Promise<string> {
    const urlName = slugify(name) || 'product';
    const taken = await this.prisma.product.count({
      where: { urlName, NOT: exceptId ? { id: exceptId } : undefined },
    });
    if (taken > 0) {
      throw new ProductNameInUseException();
    }
    return urlName;
  }

  /** Format the categories IDs array into the prisma query way */
  private connectCategoriesById(
    categories?: string[],
  ): Prisma.CategoryCreateNestedManyWithoutProductsInput {
    return {
      connect: (categories ?? []).map((category) => ({ id: category })),
    };
  }
}
