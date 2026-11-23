import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { ImageStorageService } from 'src/common/image-storage/image-storage.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { uniqueSlug } from 'src/util/slugify';
import { FindProductsDto } from '../product/dto/find-products.dto';
import { File } from '../product/types/file';
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

const relatedSelect = { select: { id: true, name: true, slug: true } };

/** A category with its sub-categories, for the tree */
export type CategoryNode = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}> & { children: CategoryNode[] };

/** Responsible for managing categories in the database. */
@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  /** Creates a new category */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const name = this.capitalizeOnlyFirstLetter(createCategoryDto.name);
    const { parentId, description } = createCategoryDto;
    if (parentId) await this.assertExists(parentId, 'Parent category not found');

    return this.prisma.category.create({
      data: {
        name,
        slug: await this.uniqueCategorySlug(createCategoryDto.slug || name),
        description: description || null,
        parentId: parentId || null,
      },
    });
  }

  /** Returns categories with pagination and can search by name.
   * Ordered by name, each with its number of products and parent id.
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

  /** Every category as a tree (top level first, children sorted by name) */
  async findTree(): Promise<CategoryNode[]> {
    const all = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    const nodes = new Map<string, CategoryNode>(
      all.map((c) => [c.id, { ...c, children: [] }]),
    );
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  /** Find category by ID with its products (any status), for admins */
  async findOneById(
    id: string,
    findProductsDto: FindProductsDto,
  ): Promise<Category> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: relatedSelect,
        children: { ...relatedSelect, orderBy: { name: 'asc' } },
        products: this.productsQuery(findProductsDto, { deletedAt: null }),
      },
      rejectOnNotFound: true,
    });
  }

  /** Find category by slug (or by name, for older links) with the
   * products shown in the shop, its parent and sub-categories
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
        parent: relatedSelect,
        children: { ...relatedSelect, orderBy: { name: 'asc' } },
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
    const { name, slug, description, parentId } = updateCategoryDto;
    const data: Prisma.CategoryUncheckedUpdateInput = {};

    if (name) {
      data.name = this.capitalizeOnlyFirstLetter(name);
    }
    if (slug) {
      data.slug = await this.uniqueCategorySlug(slug, id);
    }
    if (description !== undefined) {
      data.description = description || null;
    }
    if (parentId !== undefined) {
      if (parentId) await this.assertValidParent(id, parentId);
      data.parentId = parentId || null;
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  /** Sets (or replaces) the category image */
  async uploadImage(id: string, file: File): Promise<Category> {
    if (!file) {
      throw new BadRequestException('Please choose an image to upload');
    }
    const category = await this.prisma.category.findUnique({
      where: { id },
      rejectOnNotFound: true,
    });

    const stored = await this.imageStorage.upload(file, 'categories');
    const updated = await this.prisma.category.update({
      where: { id },
      data: { image: stored.url, imagePublicId: stored.publicId },
    });
    await this.imageStorage.remove(category.imagePublicId);
    return updated;
  }

  /** Removes the category image */
  async removeImage(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      rejectOnNotFound: true,
    });
    const updated = await this.prisma.category.update({
      where: { id },
      data: { image: null, imagePublicId: null },
    });
    await this.imageStorage.remove(category.imagePublicId);
    return updated;
  }

  /** Removes category from database. Products keep existing and
   * sub-categories move to the top level.
   */
  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.delete({ where: { id } });
    await this.imageStorage.remove(category.imagePublicId);
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

  /** A category can't be its own parent, nor be moved under one of its children */
  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    const all = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });
    const byId = new Map(all.map((c) => [c.id, c.parentId]));
    if (!byId.has(parentId)) {
      throw new NotFoundException('Parent category not found');
    }
    // Walk up from the new parent; reaching `id` means a loop
    for (let cur: string | null = parentId; cur; cur = byId.get(cur) ?? null) {
      if (cur === id) {
        throw new BadRequestException(
          'A category cannot be moved under one of its own sub-categories',
        );
      }
    }
  }

  private async assertExists(id: string, message: string): Promise<void> {
    const count = await this.prisma.category.count({ where: { id } });
    if (!count) throw new NotFoundException(message);
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
