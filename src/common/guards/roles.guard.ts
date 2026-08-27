import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No se pudo identificar al usuario.');
    }

    // El super admin tiene acceso a todo.
    if (user.isSuperAdmin) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}