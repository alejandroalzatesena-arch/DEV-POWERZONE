import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

let refreshing = false;
const pending: Array<() => void> = [];

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const tokenService = inject(TokenService);

  const isPublicAuthEndpoint = /\/auth\/(?:login|register|refresh)(?:\?|$)/.test(req.url);
  if (isPublicAuthEndpoint) {
    return next(req);
  }

  let outReq = req;
  if (tokenService.access) {
    outReq = req.clone({
      setHeaders: { Authorization: `Bearer ${tokenService.access}` },
    });
  }

  return next(outReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && tokenService.refresh) {
        return refreshAndRetry(outReq, next);
      }
      return throwError(() => error);
    }),
  );
}

function refreshAndRetry(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const tokenService = inject(TokenService);

  if (refreshing) {
    return new Observable<HttpEvent<unknown>>((observer) => {
      pending.push(() => {
        const headerReq = req.clone({
          setHeaders: { Authorization: `Bearer ${tokenService.access ?? ''}` },
        });
        next(headerReq).subscribe({
          next: (e) => observer.next(e),
          error: (err) => observer.error(err),
        });
      });
    }).pipe(take(1));
  }

  refreshing = true;
  return authService.refreshTokens().pipe(
    switchMap(() => {
      refreshing = false;
      pending.forEach((p) => p());
      pending.length = 0;
      const headerReq = req.clone({
        setHeaders: { Authorization: `Bearer ${tokenService.access ?? ''}` },
      });
      return next(headerReq);
    }),
    catchError((err) => {
      refreshing = false;
      pending.length = 0;
      authService.clearSession();
      router.navigate(['/auth/login']);
      return throwError(() => err);
    }),
  );
}
