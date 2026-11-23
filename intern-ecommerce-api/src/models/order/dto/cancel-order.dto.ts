import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Describes a cancellation made by the customer */
export class CancelOrderDto {
  /** Why the order is cancelled
   * @example "Ordered by mistake"
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
