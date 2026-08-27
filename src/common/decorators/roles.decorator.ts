import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';

export const ROLES_KEY = 'roles';

/**
 * Restringe el acceso de un endpoint a los roles indicados.
 * @example @Roles(UserRole.ADMIN, UserRole.TRAINER)
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);