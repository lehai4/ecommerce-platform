import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** New order of a product's images; the first one becomes the cover */
export class ReorderImagesDto {
  /** Every image ID of the product, in the wanted order */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  imageIds: string[];
}
