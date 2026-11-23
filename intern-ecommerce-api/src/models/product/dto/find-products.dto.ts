import { ProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const PRODUCT_SORTS = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
  'best_selling',
  'rating_desc',
] as const;
export type ProductSort = typeof PRODUCT_SORTS[number];

/** Filters for listing products in the shop */
export class FindProductsDto {
  /** Text to search in the product name (case insensitive)
   * @example "chair"
   */
  @IsOptional()
  @IsString()
  productName?: string;

  /** Only products in this category, by slug
   * @example "ao-thun"
   */
  @IsOptional()
  @IsString()
  category?: string;

  /** Only products in this category, by ID */
  @IsOptional()
  @IsUUID(4)
  categoryId?: string;

  /** Minimum price after discount
   * @example 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  /** Maximum price after discount
   * @example 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  /** Only products rated at least this many stars (visible reviews)
   * @example 4
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  /** Only products with stock > 0 */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  inStock?: boolean;

  /** Sort order, defaults to "newest"
   * @example "price_asc"
   */
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort;

  /** Page number, starting at 1
   * @example 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  /** Products per page (max 100)
   * @example 12
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  offset?: number;
}

/** Extra filters only admins can use */
export class AdminFindProductsDto extends FindProductsDto {
  /** Only products with this status */
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  /** Stock level: "out" (0), "low" (1-5) */
  @IsOptional()
  @IsIn(['out', 'low'])
  stockLevel?: 'out' | 'low';
}
