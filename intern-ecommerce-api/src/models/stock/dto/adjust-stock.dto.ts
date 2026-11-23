import { StockReason } from '@prisma/client';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

export const MANUAL_STOCK_REASONS = [
  StockReason.RESTOCK,
  StockReason.ADJUSTMENT,
] as const;

/** Manual stock change made by an admin */
export class AdjustStockDto {
  /** Units to add (positive) or remove (negative)
   * @example 50
   */
  @IsInt()
  @NotEquals(0)
  @Min(-100000)
  @Max(100000)
  change: number;

  /** RESTOCK (new goods arrived) or ADJUSTMENT (stock count, damaged goods...)
   * @example "RESTOCK"
   */
  @IsIn(MANUAL_STOCK_REASONS)
  reason: typeof MANUAL_STOCK_REASONS[number];

  /** Why the stock changed
   * @example "November delivery from supplier"
   */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
