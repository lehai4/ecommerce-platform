import { ProductStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';

/** Products to act on at once */
export class BulkProductIdsDto {
  /** Product IDs (max 100) */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(4, { each: true })
  ids: string[];
}

/** Change the status of many products at once */
export class BulkUpdateStatusDto extends BulkProductIdsDto {
  /** New status for every product
   * @example "ARCHIVED"
   */
  @IsEnum(ProductStatus)
  status: ProductStatus;
}
