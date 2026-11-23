import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { uniqueSlug } from 'src/util/slugify';
import { FindProductsDto } from '../product/dto/find-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindCategoriesDto } from './dto/find-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

const productSelect = {
  id: true,
  name: true,
  urlName: true,
  picture: true,
  basePrice: true,
  discountPercentage: true,
  salePrice: true,
  stock: true,
} satisfies Prisma.ProductSelect;

/** Responsible for managing categories in the database. */
@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a new category */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const name = this.capitalizeOnlyFirstLetter(createCategoryDto.name);

    return this.prisma.category.create({
      data: {
        name,
        slug: await this.uniqueCategorySlug(createCategoryDto.slug || name),
      },
    });
  }

  /** Returns all categories with pagination and can search by name.
   * Ordered by name, each with its number of products.
   */
  async findAll({
    categoryName = '',
    page = 1,
    offset = 10,
  }: FindCategoriesDto): Promise<Category[]> {
    return this.prisma.category.findMany({
      skip: (page - 1) * offset,
      take: offset,
      where: {
        name: { contains: categoryName, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  /** Find category by ID with its products (any status), for admins */
  async findOneById(
    id: string,
    findProductsDto: FindProductsDto,
  ): Promise<Category> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        products: this.productsQuery(findProductsDto, { deletedAt: null }),
      },
      rejectOnNotFound: true,
    });
  }

  /** Find category by slug (or by name, for older links) with the
   * products shown in the shop
   */
  async findOneBySlugOrName(
    slugOrName: string,
    findProductsDto: FindProductsDto,
  ): Promise<Category> {
    return this.prisma.category.findFirst({
      where: {
        OR: [
          { slug: slugOrName },
          { name: this.capitalizeOnlyFirstLetter(slugOrName) },
        ],
      },
      include: {
        products: this.productsQuery(findProductsDto, {
          deletedAt: null,
          status: ProductStatus.ACTIVE,
        }),
      },
      rejectOnNotFound: true,
    });
  }

  /** Updates category information. Changing the name keeps the slug
   * (so links don't break) unless a new slug is sent.
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const data: Prisma.CategoryUpdateInput = {};
    if (updateCategoryDto.name) {
      data.name = this.capitalizeOnlyFirstLetter(updateCategoryDto.name);
    }
    if (updateCategoryDto.slug) {
      data.slug = await this.uniqueCategorySlug(updateCategoryDto.slug, id);
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  /** Removes category from database (products keep existing) */
  async remove(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  private productsQuery(
    { productName = '', page = 1, offset = 10 }: FindProductsDto,
    where: Prisma.ProductWhereInput,
  ) {
    return {
      select: productSelect,
      where: {
        ...where,
        name: { contains: productName, mode: 'insensitive' as const },
      },
      orderBy: { createdAt: 'desc' as const },
      skip: (page - 1) * offset,
      take: offset,
    };
  }

  /** Capitalize only the first letter of the category name */
  private capitalizeOnlyFirstLetter(name: string): string {
    return name[0].toUpperCase() + name.substring(1).toLocaleLowerCase();
  }

  private uniqueCategorySlug(text: string, exceptId?: string): Promise<string> {
    return uniqueSlug(
      text,
      async (slug) =>
        (await this.prisma.category.count({
          where: { slug, NOT: exceptId ? { id: exceptId } : undefined },
        })) > 0,
      'category',
    );
  }
}
