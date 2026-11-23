import { StockReason } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
} from 'class-validator';

/** Filters for the stock history */
export class FindStockMovementsDto {
  /** Only this product */
  @IsOptional()
  @IsUUID(4)
  productId?: string;

  /** Only this reason */
  @IsOptional()
  @IsEnum(StockReason)
  reason?: StockReason;

  /** Product name or SKU contains (case insensitive) */
  @IsOptional()
  @IsString()
  search?: string;

  /** Only changes on or after this date (ISO), e.g. "2026-11-01" */
  @IsOptional()
  @IsString()
  from?: string;

  /** Only changes before the end of this date (ISO), e.g. "2026-11-30" */
  @IsOptional()
  @IsString()
  to?: string;

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
