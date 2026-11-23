import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

export const CUSTOMER_SORTS = [
  'newest',
  'oldest',
  'spent_desc',
  'orders_desc',
  'last_order_desc',
  'name_asc',
] as const;
export type CustomerSort = typeof CUSTOMER_SORTS[number];

/** Filters for the customer list */
export class FindCustomersDto {
  /** Email, name or phone used in an order (case insensitive) */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /** "active" or "blocked" */
  @IsOptional()
  @IsIn(['active', 'blocked'])
  state?: 'active' | 'blocked';

  /** Defaults to "newest" */
  @IsOptional()
  @IsIn(CUSTOMER_SORTS)
  sort?: CustomerSort;

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
