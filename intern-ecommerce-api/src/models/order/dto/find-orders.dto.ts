import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

/** Describes the filters to search orders */
export class FindOrdersDto {
  /** Only orders with this status
   * @example "PENDING"
   */
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Matches order code, customer name or phone (case insensitive)
   * @example "OD-261118"
   */
  @IsOptional()
  @IsString()
  search?: string;

  /** Page number, starting at 1
   * @example 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  /** Orders per page
   * @example 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  offset?: number;
}
