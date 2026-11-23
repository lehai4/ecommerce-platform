import { Prisma } from '@prisma/client';

/** Describes the properties of a Category in the database */
export class Category
  implements Omit<Prisma.CategoryUncheckedCreateInput, 'slug'>
{
  /**
   * Category ID as UUID
   * @example "e6cf9a58-438c-4fce-8d85-db3d22db270a"
   */
  id?: string;

  /**
   * Category name
   * @example "Decoration"
   */
  name: string;

  /**
   * URL friendly name, generated from the name when not given
   * @example "decoration"
   */
  slug?: string;
}
