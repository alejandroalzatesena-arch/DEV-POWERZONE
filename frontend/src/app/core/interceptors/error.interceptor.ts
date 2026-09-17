import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, throwError } from 'rxjs';

export function extractErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
  }
  const body = error.error as { message?: string | string[]; error?: string; statusCode?: number };
  if (typeof body?.message === 'string') return body.message;
  if (Array.isArray(body?.message)) {
    const first = body.message[0];
    if (first && typeof first === 'object') {
      const obj = first as { message?: string; property?: string };
      return obj.message ?? 'Datos inválidos';
    }
    return body.message.join(' · ');
  }
  if (typeof body?.error === 'string') return body.error;
  return error.message || 'Error inesperado';
}

export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const snackbar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = extractErrorMessage(error);
      if (!error.url?.includes('/auth/me')) {
        snackbar.open(message, 'Cerrar', {
          duration: 5000,
          panelClass: ['pz-snack-error'],
          verticalPosition: 'top',
        });
      }
      return throwError(() => error);
    }),
  );
}