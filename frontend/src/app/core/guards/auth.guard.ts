import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.hasTokens()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { r: state.url } });
  }

  if (authService.user()) {
    return true;
  }

  return authService.me().pipe(
    map((user) => {
      authService.updateStoredUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gymId: user.gymId,
        isSuperAdmin: user.isSuperAdmin,
      });
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/auth/login'], { queryParams: { r: state.url } }))),
  );
};