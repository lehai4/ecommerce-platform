import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
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
}
