import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsDto } from './dto/find-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { File } from './types/file';
import { ImageStorageService } from 'src/common/image-storage/image-storage.service';

/** Responsible for managing products in the database.
 * CRUD endpoints are available for products.
 */
@Injectable()
export class ProductService {
  /** Responsible for managing products in the database.
   * CRUD endpoints are available for products.
   *
   * Instantiates the class and the PrismaService dependency
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  /** Creates a new product */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const urlName = this.formatUrlName(createProductDto.name);

    const categories = this.connectCategoriesById(createProductDto.categories);

    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        urlName,
        categories,
      },
      include: { categories: { select: { id: true, name: true } } },
    });

    return product;
  }

  /** Uploads new product picture */
  async uploadPicture(id: string, file: File): Promise<Product> {
    if (!file) {
      throw new BadRequestException('Please choose an image to upload');
    }
    // Make sure the product exists before uploading anything
    await this.prisma.product.findUnique({
      where: { id },
      rejectOnNotFound: true,
    });

    const picture = await this.imageStorage.upload(file, 'products');

    return this.prisma.product.update({
      where: { id },
      data: { picture },
      include: { categories: { select: { id: true, name: true } } },
    });
  }

  /** Returns all products with pagination
   * Default is starting on page 1 showing 10 results per page
   * and ordering by name
   */
  async findAll({
    productName = '',
    page = 1,
    offset = 10,
  }: FindProductsDto): Promise<Product[]> {
    const productsToSkip = (page - 1) * offset;

    return this.prisma.product.findMany({
      skip: productsToSkip,
      take: offset,
      where: {
        name: { contains: productName, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      include: { categories: { select: { id: true, name: true } } },
    });
  }

  /** Find product by ID */
  async findOneById(id: string): Promise<Product> {
    return this.prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { id: true, name: true } } },
      rejectOnNotFound: true,
    });
  }

  /** Find product by Url Name */
  async findOneByUrlName(urlName: string): Promise<Product> {
    return this.prisma.product.findUnique({
      where: { urlName },
      include: { categories: { select: { id: true, name: true } } },
      rejectOnNotFound: true,
    });
  }

  /** Updates product information */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const data: Prisma.ProductUpdateInput = {
      name: updateProductDto.name,
      basePrice: updateProductDto.basePrice,
      discountPercentage: updateProductDto.discountPercentage,
      stock: updateProductDto.stock,
      description: updateProductDto.description,
    };
    if (updateProductDto.name) {
      data.urlName = this.formatUrlName(updateProductDto.name);
    }
    // Replace the product categories only when the field is sent
    if (updateProductDto.categories) {
      data.categories = {
        set: updateProductDto.categories.map((categoryId) => ({
          id: categoryId,
        })),
      };
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: { categories: { select: { id: true, name: true } } },
    });
  }

  /** Removes product from database */
  async remove(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  /** Formats the name to generate an urlName.
   *
   * Makes the name lower case, remove leading and trailing white spaces,
   * turn to single the multiple spaces between words and make
   * single spaces hyphens
   *
   * @example " BraNd1    chAir   " becomes "brand1-chair"
   */
  private formatUrlName(name: string): string {
    const lowerCaseUrlName = name.toLocaleLowerCase();
    const trimmedUrlName = lowerCaseUrlName.trim();
    const singleSpaceUrlName = trimmedUrlName.replace(/\s\s+/g, ' ');
    const spaceToHyphenUrlName = singleSpaceUrlName.split(' ').join('-');

    return spaceToHyphenUrlName;
  }

  /**
   * Format the categories IDs array into the prisma query way
   */
  private connectCategoriesById(
    categories: string[],
  ): Prisma.CategoryUncheckedCreateNestedManyWithoutProductsInput {
    let categoriesConnection = { connect: [] };

    if (categories) {
      categoriesConnection = {
        connect: categories.map((category) => {
          return { id: category };
        }),
      };
    }

    return categoriesConnection;
  }
}
