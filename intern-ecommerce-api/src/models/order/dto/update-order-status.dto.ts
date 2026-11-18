import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Describes a status change made by an admin */
export class UpdateOrderStatusDto {
  /** New status of the order
   * @example "CONFIRMED"
   */
  @IsEnum(OrderStatus)
  status: OrderStatus;

  /** Optional note saved in the order history
   * @example "Called customer to confirm"
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
