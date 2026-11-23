import { ForbiddenException } from '@nestjs/common';

/** Thrown when a locked account tries to sign in or refresh its session */
export class AccountLockedException extends ForbiddenException {
  constructor() {
    super('This account has been locked. Please contact the shop.');
  }
}
