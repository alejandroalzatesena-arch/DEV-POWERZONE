import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MembershipsService } from '../../core/services/memberships.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { MembershipType, User, UserMembership } from '../../core/models/models';
import { formatMoney, formatDate, membershipStatus, initials } from '../../shared/utils/labels';

@Component({
  selector: 'app-memberships',
  standalone: true,
  imports: [
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatMenuModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './memberships.component.html',
  styleUrl: './memberships.component.scss',
})
export class MembershipsComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly memberships = inject(MembershipsService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly types = signal<MembershipType[]>([]);
  readonly assigns = signal<UserMembership[]>([]);
  readonly clients = signal<User[]>([]);
  readonly totalAssigns = signal(0);
  readonly loadingTypes = signal(true);
  readonly loadingAssigns = signal(true);

  assignColumns: string[] = ['member', 'plan', 'period', 'status', 'auto', 'actions'];
  page = 0;
  limit = 10;
  statusFilter = '';

  ngOnInit(): void {
    this.loadTypes();
    this.loadAssigns();
    this.usersService.list({ role: 'client', limit: 100 }).subscribe({
      next: (r) => this.clients.set(r.items),
      error: () => undefined,
    });
  }

  loadTypes(): void {
    this.memberships.types().subscribe({
      next: (r) => this.types.set(r.items),
      error: () => undefined,
      complete: () => this.loadingTypes.set(false),
    });
  }

  loadAssigns(): void {
    this.loadingAssigns.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.statusFilter) query['status'] = this.statusFilter;
    this.memberships.list(query).subscribe({
      next: (r) => {
        this.assigns.set(r.items);
        this.totalAssigns.set(r.meta.total);
        this.loadingAssigns.set(false);
      },
      error: () => this.loadingAssigns.set(false),
    });
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.loadAssigns();
  }

  onStatus(status: string): void {
    this.statusFilter = status;
    this.page = 0;
    this.loadAssigns();
  }

  canAct(): boolean {
    return ['admin', 'receptionist'].includes(this.auth.user()?.role ?? '');
  }

  createType(): void {
    const dialogRef = this.dialog.open(MembershipTypeDialog);
    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.memberships.createType(res).subscribe({
          next: () => {
            this.toast.success('Tipo de membresía creado');
            this.loadTypes();
          },
          error: () => undefined,
        });
      }
    });
  }

  editType(t: MembershipType): void {
    const dialogRef = this.dialog.open(MembershipTypeDialog, { data: t });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.memberships.updateType(t.id, res).subscribe({
          next: () => {
            this.toast.success('Tipo actualizado');
            this.loadTypes();
          },
          error: () => undefined,
        });
      }
    });
  }

  deleteType(t: MembershipType): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Eliminar "${t.name}"`,
        message: '¿Seguro? Esta acción es definitiva.',
        okText: 'Eliminar',
        okClass: 'mat-danger',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.memberships.removeType(t.id).subscribe({
        next: () => {
          this.toast.success('Tipo eliminado');
          this.loadTypes();
        },
        error: () => undefined,
      });
    });
  }

  assign(): void {
    const ref = this.dialog.open(AssignMembershipDialog, {
      data: { clients: this.clients(), types: this.types() },
      width: '520px',
    });
    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.memberships.assign(res).subscribe({
          next: () => {
            this.toast.success('Membresía asignada');
            this.loadAssigns();
          },
          error: () => undefined,
        });
      }
    });
  }

  renew(m: UserMembership): void {
    this.memberships.renew(m.id).subscribe({
      next: () => {
        this.toast.success('Membresía renovada');
        this.loadAssigns();
      },
      error: () => undefined,
    });
  }

  cancel(m: UserMembership): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar membresía',
        message: `¿Cancelar la membresía de ${m.user?.fullName ?? 'este cliente'}?`,
        okText: 'Cancelar',
        okClass: 'mat-danger',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.memberships.cancel(m.id).subscribe({
        next: () => {
          this.toast.success('Membresía cancelada');
          this.loadAssigns();
        },
        error: () => undefined,
      });
    });
  }

  typeStats(): { active: number; total: number } {
    return {
      active: this.types().filter((t) => t.isActive !== false).length,
      total: this.types().length,
    };
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly membershipStatus = membershipStatus;
  protected readonly initials = initials;
}

@Component({
  selector: 'pz-membership-type-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">
      {{ data ? 'Editar tipo de membresía' : 'Nuevo tipo de membresía' }}
    </h2>
    <mat-dialog-content
      style="display:grid;gap:10px;padding:16px 24px;min-width:440px;max-height:70vh"
    >
      <mat-form-field appearance="outline"
        ><mat-label>Nombre</mat-label
        ><input matInput formControlName="name" placeholder="Mensual / Trimestral"
      /></mat-form-field>
      <mat-form-field appearance="outline"
        ><mat-label>Descripción</mat-label
        ><textarea matInput formControlName="description" rows="2"></textarea>
      </mat-form-field>
      <div class="row3">
        <mat-form-field appearance="outline"
          ><mat-label>Duración (días)</mat-label
          ><input matInput type="number" formControlName="durationDays"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Precio</mat-label><input matInput type="number" formControlName="price"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Moneda</mat-label><input matInput formControlName="currency"
        /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"
          ><mat-label>Clases máx / semana</mat-label
          ><input matInput type="number" formControlName="maxClassesPerWeek"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Orden</mat-label><input matInput type="number" formControlName="sortOrder"
        /></mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Beneficios (uno por línea)</mat-label>
        <textarea matInput formControlName="featuresText" rows="3"></textarea>
      </mat-form-field>
      <mat-checkbox formControlName="isActive">Activo</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .row3 {
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.8fr;
      gap: 10px;
    }
    .row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  `,
})
export class MembershipTypeDialog {
  readonly form = new FormBuilder().nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    durationDays: [30, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['usd'],
    maxClassesPerWeek: [null as number | null],
    sortOrder: [null as number | null],
    featuresText: [''],
    isActive: [true],
  });
  private readonly dialogRef = inject(MatDialogRef<MembershipTypeDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: MembershipType | null) {
    if (data) {
      this.form.patchValue({
        name: data.name,
        description: data.description ?? '',
        durationDays: data.durationDays,
        price: data.price,
        currency: data.currency ?? 'usd',
        maxClassesPerWeek: data.maxClassesPerWeek ?? null,
        sortOrder: data.sortOrder ?? null,
        featuresText: (data.features ?? []).join('\n'),
        isActive: data.isActive !== false,
      });
    }
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name,
      description: v.description || undefined,
      durationDays: Number(v.durationDays),
      price: Number(v.price),
      currency: v.currency,
      maxClassesPerWeek: v.maxClassesPerWeek ? Number(v.maxClassesPerWeek) : undefined,
      sortOrder: v.sortOrder != null ? Number(v.sortOrder) : undefined,
      features: v.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      isActive: v.isActive,
    });
  }
}

@Component({
  selector: 'pz-assign-membership-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">Asignar membresía</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:440px">
      <mat-form-field appearance="outline">
        <mat-label>Cliente</mat-label>
        <mat-select formControlName="userId">
          @for (c of clients; track c.id) {
            <mat-option [value]="c.id">{{ c.fullName }} ({{ c.email }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Tipo de membresía</mat-label>
        <mat-select formControlName="membershipTypeId" (selectionChange)="onType($event.value)">
          @for (t of types; track t.id) {
            <mat-option [value]="t.id"
              >{{ t.name }} · {{ t.durationDays }} días · {{ t.price }}{{ t.currency }}</mat-option
            >
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Precio (opcional, anula el plan)</mat-label>
        <input matInput type="number" formControlName="price" />
        <mat-hint>Vacío = precio del plan</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Notas</mat-label>
        <input matInput formControlName="notes" />
      </mat-form-field>
      <mat-checkbox formControlName="autoRenew">Renovación automática</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">
        Asignar
      </button>
    </mat-dialog-actions>
  `,
})
export class AssignMembershipDialog {
  readonly form = new FormBuilder().nonNullable.group({
    userId: ['', Validators.required],
    membershipTypeId: ['', Validators.required],
    price: [null as number | null],
    autoRenew: [false],
    notes: [''],
  });
  private readonly dialogRef = inject(MatDialogRef<AssignMembershipDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { clients: User[]; types: MembershipType[] }) {}

  get clients(): User[] {
    return this.data?.clients ?? [];
  }

  get types(): MembershipType[] {
    return this.data?.types ?? [];
  }

  onType(id: string): void {
    const t = this.data.types.find((x) => x.id === id);
    if (t && !this.form.value.price) {
      this.form.patchValue({ price: t.price });
    }
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      userId: v.userId,
      membershipTypeId: v.membershipTypeId,
      price: v.price ?? undefined,
      autoRenew: v.autoRenew,
      notes: v.notes || undefined,
    });
  }
}
