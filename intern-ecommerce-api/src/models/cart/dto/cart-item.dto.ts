import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const MAX_CART_QUANTITY = 100;

export class AddCartItemDto {
  @IsUUID(4)
  productId: string;

  /** How many to add (added to what is already in the cart)
   * @example 1
   */
  @IsInt()
  @Min(1)
  @Max(MAX_CART_QUANTITY)
  quantity: number;
}

export class SetCartQuantityDto {
  /** New quantity; 0 removes the item
   * @example 2
   */
  @IsInt()
  @Min(0)
  @Max(MAX_CART_QUANTITY)
  quantity: number;
}

export class MergeCartDto {
  /** Token of the guest cart to move into the signed-in user's cart */
  @IsString()
  @Length(10, 100)
  guestToken: string;
}
