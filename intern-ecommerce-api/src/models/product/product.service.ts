import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus, StockReason } from '@prisma/client';
import currency from 'currency.js';
import { ProductNameInUseException } from 'src/common/exceptions/product/product-name-in-use.exception';
import { ImageStorageService } from 'src/common/image-storage/image-storage.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { slugify } from 'src/util/slugify';
import { recordStockMovement } from '../stock/record-stock-movement';
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
export const MAX_PRODUCT_IMAGES = 10;

const productInclude = {
  categories: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, position: true },
    orderBy: { position: 'asc' },
  },
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
    rating_desc: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }],
  };

/** Paginated result */
export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  offset: number;
}

type Tx = Prisma.TransactionClient | PrismaService;

/** Responsible for managing products in the database. */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  /** Creates a new product */
  async create(
    createProductDto: CreateProductDto,
    userId?: string,
  ): Promise<Product> {
    const { categories, sku, ...data } = createProductDto;
    await this.assertSkuFree(sku);

    const product = await this.prisma.product.create({
      data: {
        ...data,
        sku: sku || null,
        urlName: await this.uniqueUrlName(data.name),
        salePrice: this.salePrice(data.basePrice, data.discountPercentage),
        searchText: this.searchText(data.name, sku),
        categories: this.connectCategoriesById(categories),
      },
      include: productInclude,
    });

    await recordStockMovement(this.prisma, {
      productId: product.id,
      change: product.stock,
      reason: StockReason.INITIAL,
      userId,
    });
    return product;
  }

  /** Replaces the cover picture (first image). Kept for older clients. */
  async uploadPicture(id: string, file: File): Promise<Product> {
    this.assertFile(file);
    await this.findOneById(id);

    const stored = await this.imageStorage.upload(file, 'products');
    const cover = await this.prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { position: 'asc' },
    });

    if (cover) {
      await this.prisma.productImage.update({
        where: { id: cover.id },
        data: { url: stored.url, publicId: stored.publicId },
      });
      await this.imageStorage.remove(cover.publicId);
    } else {
      await this.prisma.productImage.create({
        data: { productId: id, ...stored, position: 0 },
      });
    }

    return this.syncCoverAndReturn(id);
  }

  /** Adds images at the end of the product gallery */
  async addImages(id: string, files: File[]): Promise<Product> {
    if (!files?.length) {
      throw new BadRequestException('Please choose at least one image');
    }
    await this.findOneById(id);

    const existing = await this.prisma.productImage.count({
      where: { productId: id },
    });
    if (existing + files.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `A product can have at most ${MAX_PRODUCT_IMAGES} images (it has ${existing})`,
      );
    }

    // Upload first; if one fails, remove the ones already uploaded
    const stored = [];
    try {
      for (const file of files) {
        stored.push(await this.imageStorage.upload(file, 'products'));
      }
    } catch (error) {
      await Promise.all(stored.map((s) => this.imageStorage.remove(s.publicId)));
      throw error;
    }

    await this.prisma.productImage.createMany({
      data: stored.map((s, index) => ({
        productId: id,
        url: s.url,
        publicId: s.publicId,
        position: existing + index,
      })),
    });

    return this.syncCoverAndReturn(id);
  }

  /** Deletes one image (also from Cloudinary / disk) */
  async removeImage(id: string, imageId: string): Promise<Product> {
    await this.findOneById(id);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.imageStorage.remove(image.publicId);
    await this.normalizePositions(this.prisma, id);

    return this.syncCoverAndReturn(id);
  }

  /** Sets the order of the images; the first one becomes the cover */
  async reorderImages(id: string, imageIds: string[]): Promise<Product> {
    await this.findOneById(id);
    const images = await this.prisma.productImage.findMany({
      where: { productId: id },
      select: { id: true },
    });

    const current = new Set(images.map((i) => i.id));
    if (
      imageIds.length !== current.size ||
      new Set(imageIds).size !== imageIds.length ||
      imageIds.some((imageId) => !current.has(imageId))
    ) {
      throw new BadRequestException(
        'imageIds must list every image of the product exactly once',
      );
    }

    await this.prisma.$transaction(
      imageIds.map((imageId, position) =>
        this.prisma.productImage.update({
          where: { id: imageId },
          data: { position },
        }),
      ),
    );

    return this.syncCoverAndReturn(id);
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
    userId?: string,
  ): Promise<Product> {
    const current = await this.findOneById(id);
    const { categories, sku, ...fields } = updateProductDto;

    const data: Prisma.ProductUpdateInput = { ...fields };

    if (fields.name && fields.name !== current.name) {
      data.urlName = await this.uniqueUrlName(fields.name, id);
    }
    if (sku !== undefined) {
      await this.assertSkuFree(sku, id);
      data.sku = sku || null;
    }
    if (fields.name !== undefined || sku !== undefined) {
      data.searchText = this.searchText(
        fields.name ?? current.name,
        sku !== undefined ? sku : current.sku,
      );
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

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });

    // Stock typed in the product form: keep a trace of the difference
    if (fields.stock !== undefined && fields.stock !== current.stock) {
      await recordStockMovement(this.prisma, {
        productId: id,
        change: fields.stock - (current.stock ?? 0),
        reason: StockReason.ADJUSTMENT,
        note: 'Changed in the product form',
        userId,
      });
    }
    return updated;
  }

  /** Changes the status of many products at once */
  async bulkUpdateStatus(
    ids: string[],
    status: ProductStatus,
  ): Promise<{ count: number }> {
    const { count } = await this.prisma.product.updateMany({
      where: { id: { in: ids }, ...notDeleted },
      data: { status },
    });
    return { count };
  }

  /** Soft deletes many products at once */
  async bulkRemove(ids: string[]): Promise<{ count: number }> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, ...notDeleted },
      select: { id: true },
    });
    for (const { id } of products) {
      await this.remove(id);
    }
    return { count: products.length };
  }

  /** Soft deletes a product.
   *
   * The row is kept so orders that reference it stay valid,
   * but it disappears from every list. Its name, url and SKU are freed so a
   * new product can reuse them. Images are kept (orders show the cover).
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
        sku: null,
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
      minRating,
      sort = 'newest',
      page = 1,
      offset = 10,
    }: FindProductsDto,
    extraWhere: Prisma.ProductWhereInput,
  ): Promise<PaginatedProducts> {
    const term = productName?.trim();
    const searchTerm = term ? slugify(term) : '';
    const categoryIds =
      category || categoryId
        ? await this.categoryWithDescendants({ slug: category, id: categoryId })
        : undefined;

    const where: Prisma.ProductWhereInput = {
      ...notDeleted,
      ...extraWhere,
      AND: [
        term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                ...(searchTerm ? [{ searchText: { contains: searchTerm } }] : []),
              ],
            }
          : {},
        categoryIds ? { categories: { some: { id: { in: categoryIds } } } } : {},
        minPrice !== undefined ? { salePrice: { gte: minPrice } } : {},
        maxPrice !== undefined ? { salePrice: { lte: maxPrice } } : {},
        inStock ? { stock: { gt: 0 } } : {},
        minRating !== undefined ? { ratingAverage: { gte: minRating } } : {},
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

  /** IDs of the category (by slug or id) and all its sub-categories.
   * Unknown category -> empty list, so the filter returns nothing.
   */
  private async categoryWithDescendants(where: {
    slug?: string;
    id?: string;
  }): Promise<string[]> {
    const all = await this.prisma.category.findMany({
      select: { id: true, slug: true, parentId: true },
    });
    const root = all.find(
      (c) => (where.id && c.id === where.id) || (where.slug && c.slug === where.slug),
    );
    if (!root) return [];

    const ids = [root.id];
    for (let i = 0; i < ids.length; i++) {
      for (const c of all) {
        if (c.parentId === ids[i] && !ids.includes(c.id)) ids.push(c.id);
      }
    }
    return ids;
  }

  /** Keeps `picture` equal to the first image and returns the product */
  private async syncCoverAndReturn(id: string): Promise<Product> {
    const cover = await this.prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { position: 'asc' },
    });
    return this.prisma.product.update({
      where: { id },
      data: { picture: cover?.url ?? null },
      include: productInclude,
    });
  }

  /** Renumbers positions 0..n-1 after a delete */
  private async normalizePositions(tx: Tx, productId: string): Promise<void> {
    const images = await tx.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });
    for (const [position, image] of images.entries()) {
      if (image.position !== position) {
        await tx.productImage.update({
          where: { id: image.id },
          data: { position },
        });
      }
    }
  }

  private assertFile(file: File): void {
    if (!file) {
      throw new BadRequestException('Please choose an image to upload');
    }
  }

  private async assertSkuFree(sku?: string | null, exceptId?: string) {
    if (!sku) return;
    const taken = await this.prisma.product.count({
      where: { sku, NOT: exceptId ? { id: exceptId } : undefined },
    });
    if (taken > 0) {
      throw new ConflictException(`SKU "${sku}" is already used by another product`);
    }
  }

  private searchText(name: string, sku?: string | null): string {
    return [slugify(name), sku ? slugify(sku) : ''].filter(Boolean).join(' ');
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
