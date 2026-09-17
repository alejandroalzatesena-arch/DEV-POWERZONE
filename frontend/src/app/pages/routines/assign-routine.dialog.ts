import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoutinesService } from '../../core/services/routines.service';
import { UsersService } from '../../core/services/users.service';
import { User, Routine } from '../../core/models/models';
import { routineStatus, routineObjectiveLabel } from '../../shared/utils/labels';

@Component({
  selector: 'pz-assign-routine-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">Asignar rutina</h2>
    <mat-dialog-content style="padding:16px 24px;min-width:400px">
      <p style="color:var(--pz-muted);margin:0 0 14px">
        Asignar <strong style="color:var(--pz-white)">{{ data.routine.title }}</strong> a un cliente.
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Cliente</mat-label>
        <mat-select [(ngModel)]="selected" (selectionChange)="onSelected($event.value)">
          @for (c of clients(); track c.id) {
            <mat-option [value]="c.id">{{ c.fullName }} ({{ c.email }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!selected" (click)="save()">Asignar</button>
    </mat-dialog-actions>
  `,
})
export class AssignRoutineDialog {
  private readonly usersService = inject(UsersService);
  private readonly routines = inject(RoutinesService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<AssignRoutineDialog>);

  readonly clients = signal<User[]>([]);
  selected = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: { routine: Routine }) {
    this.usersService.list({ role: 'client', limit: 200 }).subscribe({
      next: (r) => this.clients.set(r.items),
      error: () => undefined,
    });
  }

  onSelected(id: string): void {
    this.selected = id;
  }

  save(): void {
    this.routines.assign(this.data.routine.id, this.selected).subscribe({
      next: () => {
        this.snackbar.open('Rutina asignada al cliente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(this.selected);
      },
      error: () => undefined,
    });
  }
}