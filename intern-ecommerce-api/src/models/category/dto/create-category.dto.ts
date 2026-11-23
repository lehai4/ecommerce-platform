import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Category } from '../entities/category.entity';

/** Describes the fields needed to create a Category */
export class CreateCategoryDto implements Category {
  /**
   * Category name
   * @example "Decoration"
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * URL friendly name (lowercase letters, numbers and "-").
   * Generated from the name when not given.
   * @example "decoration"
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug can only contain lowercase letters, numbers and "-"',
  })
  slug?: string;

  /**
   * Short text shown on the category page
   * @example "Everything to decorate your home"
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  /**
   * Parent category ID; null or missing for a top level category
   * @example "e6cf9a58-438c-4fce-8d85-db3d22db270a"
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID(4)
  parentId?: string | null;
}
