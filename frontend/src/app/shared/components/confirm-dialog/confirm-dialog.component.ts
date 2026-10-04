import { CommonModule } from '@angular/common';
import { Component, inject, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'pz-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">
      {{ data.title }}
    </h2>
    <mat-dialog-content style="padding:16px 24px 8px;color:var(--pz-muted)">
      {{ data.message }}
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button [ngClass]="data.okClass || 'pz-btn-volt'" [mat-dialog-close]="true">
        {{ data.okText || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { title: string; message: string; okText?: string; okClass?: string },
  ) {}
}
