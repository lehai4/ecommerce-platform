import { OmitType } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** One product line requested by the customer */
export class CreateOrderItemDto {
  /** Product ID as UUID
   * @example "5c68ae94-bf3e-4fde-b01f-25d18b3976a0"
   */
  @IsUUID(4)
  productId: string;

  /** How many units to buy
   * @example 2
   */
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}

/** Describes the fields needed to place an order */
export class CreateOrderDto {
  /** Products in the order. The same product may appear only once;
   * duplicates are merged.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  /** Name of the person receiving the order
   * @example "Nguyen Van A"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string;

  /** Contact phone number
   * @example "0901234567"
   */
  @IsString()
  @Matches(/^[0-9+()\-\s]{8,20}$/, { message: 'phone is not valid' })
  phone: string;

  /** Delivery address
   * @example "12 Nguyen Hue, District 1, Ho Chi Minh City"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  shippingAddress: string;

  /** Optional note for the shop
   * @example "Please call before delivering"
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** COD (cash on delivery, default) or BANK_TRANSFER
   * @example "COD"
   */
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

/** Place an order with the items of the signed-in user's cart */
export class CheckoutDto extends OmitType(CreateOrderDto, ['items'] as const) {}
