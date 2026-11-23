import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/public.decorator';
import { FileUpload } from 'src/common/decorators/file-upload.decorator';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import {
  AdminFindProductsDto,
  FindProductsDto,
} from './dto/find-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginatedProducts, ProductService } from './product.service';
import { File } from './types/file';

/** Exposes product CRUD endpoints */
@ApiTags('product')
@Controller('product')
export class ProductController {
  /** Exposes product CRUD endpoints
   *
   * Instantiate class and ProductService dependency
   */
  constructor(private readonly productService: ProductService) {}

  /** Creates a new product, only for admins */
  @ApiOperation({ summary: 'Admin creates a new product' })
  @IsAdmin()
  @Post()
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productService.create(createProductDto);
  }

  /** Products shown in the shop (only ACTIVE).
   *
   * Supports search, category, price range, in-stock filter and sorting.
   * Returns `{ data, total, page, offset }`.
   */
  @ApiOperation({ summary: 'Lists shop products with filters and sorting' })
  @Public()
  @Get()
  findAll(
    @Query() findAllProductsDto: FindProductsDto,
  ): Promise<PaginatedProducts> {
    return this.productService.findAll(findAllProductsDto);
  }

  /** All products for admins (any status), with status and stock filters */
  @ApiOperation({ summary: 'Admin lists products of any status' })
  @IsAdmin()
  @Get('admin')
  findAllForAdmin(
    @Query() dto: AdminFindProductsDto,
  ): Promise<PaginatedProducts> {
    return this.productService.findAllForAdmin(dto);
  }

  /** Find product by ID, only for admins */
  @ApiOperation({ summary: 'Admin gets product by ID' })
  @IsAdmin()
  @Get('/id/:id')
  findOneById(@Param('id') id: string): Promise<Product> {
    return this.productService.findOneById(id);
  }

  /** Find product by Url Name */
  @ApiOperation({ summary: 'Gets product by urlName' })
  @Public()
  @Get(':urlName')
  findOneByUrlName(@Param('urlName') urlName: string): Promise<Product> {
    return this.productService.findOneByUrlName(urlName);
  }

  /**
   * Admin uploads a new picture for the product.
   * Needs to be type jpeg, jpg or png and maximum 3MB.
   *
   * Check <a href="https://alvaromrveiga.github.io/ecommerce-backend/miscellaneous/variables.html#multerUploadConfig">
   * multerUploadConfig</a> file in the docs.
   */
  @ApiOperation({ summary: 'Admin uploads a new product picture' })
  @IsAdmin()
  @FileUpload()
  @Patch('picture/:id')
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: File,
  ): Promise<Product> {
    return this.productService.uploadPicture(id, file);
  }

  /** Updates product information, only for admins */
  @ApiOperation({ summary: 'Admin updates product' })
  @IsAdmin()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.update(id, updateProductDto);
  }

  /** Soft deletes the product (kept for existing orders), only for admins */
  @ApiOperation({ summary: 'Admin deletes product' })
  @IsAdmin()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.productService.remove(id);
  }
}
