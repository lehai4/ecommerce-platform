import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Admin records the payment state of an order */
export class UpdatePaymentDto {
  /** PAID, UNPAID or REFUNDED
   * @example "PAID"
   */
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  /** Saved in the order history, e.g. the bank reference
   * @example "VCB ref 123456"
   */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
