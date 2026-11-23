import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/public.decorator';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { FileUpload } from 'src/common/decorators/file-upload.decorator';
import { File } from '../product/types/file';
import { FindProductsDto } from '../product/dto/find-products.dto';
import { CategoryNode, CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindCategoriesDto } from './dto/find-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

/** Exposes category CRUD endpoints */
@ApiTags('category')
@Controller('category')
export class CategoryController {
  /** Exposes category CRUD endpoints
   *
   * Instantiate class and CategoryService dependency
   */
  constructor(private readonly categoryService: CategoryService) {}

  /** Creates a new category, only for admins */
  @ApiOperation({ summary: 'Admin creates a new category' })
  @IsAdmin()
  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  /** Returns all categories with pagination
   *
   * Default is starting on page 1 showing 10 results per page,
   * searching and ordering by name
   */
  @ApiOperation({ summary: 'Returns all categories' })
  @Public()
  @Get()
  async findAll(
    @Query() findCategoriesDto: FindCategoriesDto,
  ): Promise<Category[]> {
    return this.categoryService.findAll(findCategoriesDto);
  }

  /** Every category as a tree, for menus and filters */
  @ApiOperation({ summary: 'Returns all categories as a tree' })
  @Public()
  @Get('tree')
  async findTree(): Promise<CategoryNode[]> {
    return this.categoryService.findTree();
  }

  /** Sets the category image (field "file") */
  @ApiOperation({ summary: 'Admin sets the category image' })
  @IsAdmin()
  @FileUpload()
  @Post(':id/image')
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: File,
  ): Promise<Category> {
    return this.categoryService.uploadImage(id, file);
  }

  /** Removes the category image */
  @ApiOperation({ summary: 'Admin removes the category image' })
  @IsAdmin()
  @Delete(':id/image')
  async removeImage(@Param('id') id: string): Promise<Category> {
    return this.categoryService.removeImage(id);
  }

  /** Find category by ID, only for admins */
  @ApiOperation({ summary: 'Admin gets category by ID and its products' })
  @IsAdmin()
  @Get('/id/:id')
  async findOneById(
    @Param('id') id: string,
    @Query() findProductsDto: FindProductsDto,
  ): Promise<Category> {
    return this.categoryService.findOneById(id, findProductsDto);
  }

  /** Find category by slug (or name, for older links) */
  @ApiOperation({ summary: 'Returns category by slug (or name) and its shop products' })
  @Public()
  @Get(':name')
  async findOneByName(
    @Param('name') name: string,
    @Query() findProductsDto: FindProductsDto,
  ): Promise<Category> {
    return this.categoryService.findOneBySlugOrName(name, findProductsDto);
  }

  /** Updates category information, only for admins */
  @ApiOperation({ summary: 'Admin updates category' })
  @IsAdmin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  /** Deletes category from database, only for admins */
  @ApiOperation({ summary: 'Admin deletes category' })
  @IsAdmin()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoryService.remove(id);
  }
}
