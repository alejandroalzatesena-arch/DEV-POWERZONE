import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private snackbar: MatSnackBar) {}

  success(message: string): void {
    this.snackbar.open(message, 'Cerrar', {
      duration: 4000,
      panelClass: ['pz-snack-success'],
      verticalPosition: 'top',
    });
  }

  error(message: string): void {
    this.snackbar.open(message, 'Cerrar', {
      duration: 6000,
      panelClass: ['pz-snack-error'],
      verticalPosition: 'top',
    });
  }
}
