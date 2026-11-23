import { ReviewStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Reviews shown on a product page */
export class FindProductReviewsDto {
  /** Only reviews with this many stars */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** Defaults to "newest" */
  @IsOptional()
  @IsIn(['newest', 'rating_desc', 'rating_asc'])
  sort?: 'newest' | 'rating_desc' | 'rating_asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(50)
  offset?: number;
}

/** Filters for the admin review list */
export class AdminFindReviewsDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsUUID(4)
  productId?: string;

  /** Comment, product name or customer email contains */
  @IsOptional()
  @IsString()
  search?: string;

  /** "yes": already answered, "no": not answered yet */
  @IsOptional()
  @IsIn(['yes', 'no'])
  replied?: 'yes' | 'no';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  offset?: number;
}
