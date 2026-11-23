import { Role } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';

export class UpdateCustomerRoleDto {
  /** @example "ADMIN" */
  @IsEnum(Role)
  role: Role;
}

export class BlockCustomerDto {
  /** true to lock the account, false to unlock it */
  @IsBoolean()
  blocked: boolean;
}
