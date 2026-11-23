import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** A review of a product from one of the customer's delivered orders */
export class CreateReviewDto {
  /** Delivered order that contained the product */
  @IsUUID(4)
  orderId: string;

  @IsUUID(4)
  productId: string;

  /** 1 to 5 stars
   * @example 5
   */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /** @example "Great quality, fast delivery" */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/** Customer edits their own review */
export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
