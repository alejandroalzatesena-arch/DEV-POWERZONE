import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { GymsService } from '../../core/services/gyms.service';
import { ToastService } from '../../core/services/toast.service';
import { Gym } from '../../core/models/models';
import { formatDate } from '../../shared/utils/labels';

@Component({
  selector: 'app-gyms',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatDialogModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './gyms.component.html',
  styleUrl: './gyms.component.scss',
})
export class GymsComponent implements OnInit {
  private readonly gymsService = inject(GymsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Gym[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.gymsService.list().subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(g?: Gym): void {
    const ref = this.dialog.open(GymDialog, { data: g, width: '540px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (g) {
        this.gymsService.update(g.id, res).subscribe({
          next: () => { this.toast.success('Gimnasio actualizado'); this.load(); },
          error: () => undefined,
        });
      } else {
        this.gymsService.create(res).subscribe({
          next: () => { this.toast.success('Gimnasio creado'); this.load(); },
          error: () => undefined,
        });
      }
    });
  }

  remove(g: Gym): void {
    this.gymsService.remove(g.id).subscribe({
      next: () => { this.toast.success('Gimnasio eliminado'); this.load(); },
      error: () => undefined,
    });
  }

  address(g: Gym): string {
    return [g.address, g.city].filter((x) => !!x).join(', ') || '—';
  }

  protected readonly formatDate = formatDate;
}

// ---------------- Dialog: Gimnasio ----------------
@Component({
  selector: 'pz-gym-dialog',
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">{{ data?.id ? 'Editar gimnasio' : 'Nuevo gimnasio' }}</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:460px">
      <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" placeholder="PowerZone Centro" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Slug</mat-label><input matInput formControlName="slug" placeholder="powerzone-centro" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Dirección</mat-label><input matInput formControlName="address" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Ciudad</mat-label><input matInput formControlName="city" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Teléfono</mat-label><input matInput formControlName="phone" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Email de contacto</mat-label><input matInput formControlName="contactEmail" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Capacidad máxima</mat-label><input matInput type="number" formControlName="maxCapacity" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Horario de apertura</mat-label><input matInput type="time" formControlName="openingHour" /></mat-form-field>
      </div>
      <mat-form-field appearance="outline"><mat-label>Horario de cierre</mat-label><input matInput type="time" formControlName="closingHour" /></mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}`,
})
export class GymDialog {
  private readonly dialogRef = inject(MatDialogRef<GymDialog>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: [''],
    description: [''],
    address: [''],
    city: [''],
    phone: [''],
    contactEmail: [''],
    maxCapacity: [''],
    openingHour: [''],
    closingHour: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data?: Gym) {
    if (data) {
      this.form.patchValue({
        name: data.name,
        slug: data.slug ?? '',
        description: data.description ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        phone: data.phone ?? '',
        contactEmail: data.contactEmail ?? '',
        maxCapacity: data.maxCapacity != null ? String(data.maxCapacity) : '',
        openingHour: data.openingHour ?? '',
        closingHour: data.closingHour ?? '',
      });
    }
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name,
      slug: v.slug || undefined,
      description: v.description || undefined,
      address: v.address || undefined,
      city: v.city || undefined,
      phone: v.phone || undefined,
      contactEmail: v.contactEmail || undefined,
      maxCapacity: v.maxCapacity ? Number(v.maxCapacity) : undefined,
      openingHour: v.openingHour || undefined,
      closingHour: v.closingHour || undefined,
    });
  }
}