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
  Req,
  ParseUUIDPipe,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from 'src/auth/public.decorator';
import {
  FileUpload,
  FilesUpload,
} from 'src/common/decorators/file-upload.decorator';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import {
  BulkProductIdsDto,
  BulkUpdateStatusDto,
} from './dto/bulk-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
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
  create(
    @Req() request: Request,
    @Body() createProductDto: CreateProductDto,
  ): Promise<Product> {
    const { userId } = request.user as { userId: string };
    return this.productService.create(createProductDto, userId);
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

  /** Adds images to the product gallery (field "files", max 10 per product) */
  @ApiOperation({ summary: 'Admin adds images to a product' })
  @IsAdmin()
  @FilesUpload()
  @Post(':id/images')
  addImages(
    @Param('id') id: string,
    @UploadedFiles() files: File[],
  ): Promise<Product> {
    return this.productService.addImages(id, files);
  }

  /** Sets the order of the images; the first becomes the cover */
  @ApiOperation({ summary: 'Admin reorders product images' })
  @IsAdmin()
  @Patch(':id/images/order')
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderImagesDto,
  ): Promise<Product> {
    return this.productService.reorderImages(id, dto.imageIds);
  }

  /** Deletes an image, also from Cloudinary */
  @ApiOperation({ summary: 'Admin deletes a product image' })
  @IsAdmin()
  @Delete(':id/images/:imageId')
  removeImage(
    @Param('id') id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<Product> {
    return this.productService.removeImage(id, imageId);
  }

  /** Changes the status of many products at once */
  @ApiOperation({ summary: 'Admin changes the status of many products' })
  @IsAdmin()
  @Patch('bulk/status')
  bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto): Promise<{ count: number }> {
    return this.productService.bulkUpdateStatus(dto.ids, dto.status);
  }

  /** Soft deletes many products at once */
  @ApiOperation({ summary: 'Admin deletes many products' })
  @IsAdmin()
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkRemove(@Body() dto: BulkProductIdsDto): Promise<{ count: number }> {
    return this.productService.bulkRemove(dto.ids);
  }

  /** Updates product information, only for admins */
  @ApiOperation({ summary: 'Admin updates product' })
  @IsAdmin()
  @Patch(':id')
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const { userId } = request.user as { userId: string };
    return this.productService.update(id, updateProductDto, userId);
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
