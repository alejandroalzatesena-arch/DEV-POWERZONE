import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UsersService } from '../../core/services/users.service';
import { GymsService } from '../../core/services/gyms.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';
import { formatDate, initials, roleLabel, genderLabel, USER_ROLES } from '../../shared/utils/labels';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatDialogModule,
    PageHeaderComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly users = inject(UsersService);
  private readonly gymsService = inject(GymsService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly roleFilter = signal('');
  readonly search = signal('');

  page = 0;
  limit = 15;
  columns = ['user', 'role', 'gym', 'status', 'lastLogin', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.roleFilter()) query['role'] = this.roleFilter();
    if (this.search()) query['search'] = this.search();
    this.users.list(query).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(role?: string): void {
    if (role !== undefined) this.roleFilter.set(role);
    this.page = 0;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.load();
  }

  openUser(user?: User): void {
    const ref = this.dialog.open(UserDialog, {
      data: { user, canPickGym: this.auth.isSuperAdmin(), service: this.gymsService },
      width: '560px',
    });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (user) {
        this.users.update(user.id, res).subscribe({
          next: () => { this.toast.success('Usuario actualizado'); this.load(); },
          error: () => undefined,
        });
      } else {
        this.users.create(res).subscribe({
          next: () => { this.toast.success('Usuario creado'); this.load(); },
          error: () => undefined,
        });
      }
    });
  }

  toggleActive(u: User): void {
    this.users.update(u.id, { isActive: !u.isActive }).subscribe({
      next: () => {
        this.toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario activado');
        this.load();
      },
      error: () => undefined,
    });
  }

  remove(u: User): void {
    this.users.remove(u.id).subscribe({
      next: () => { this.toast.success('Usuario eliminado'); this.load(); },
      error: () => undefined,
    });
  }

  shouldSee(u: User): boolean {
    if (this.auth.isSuperAdmin()) return true;
    if (u.isSuperAdmin) return false;
    return true;
  }

  roleBadge(r: string): string {
    switch (r) {
      case 'admin': return 'badge-volt';
      case 'trainer': return 'badge-orange';
      case 'receptionist': return 'badge-info';
      default: return 'badge-muted';
    }
  }

  protected readonly formatDate = formatDate;
  protected readonly initials = initials;
  protected readonly roleLabel = roleLabel;
  protected readonly genderLabel = genderLabel;
}

// ---------------- Dialog: Usuario ----------------
@Component({
  selector: 'pz-user-dialog',
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">{{ data?.user ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:480px">
      @if (!data?.user) {
        <div class="row2">
          <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Contraseña</mat-label><input matInput type="password" formControlName="password" /></mat-form-field>
        </div>
      }
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="firstName" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Apellido</mat-label><input matInput formControlName="lastName" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Teléfono</mat-label><input matInput formControlName="phone" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Sexo</mat-label><mat-select formControlName="gender">
          <mat-option value="">—</mat-option>
          <mat-option value="male">Masculino</mat-option>
          <mat-option value="female">Femenino</mat-option>
          <mat-option value="other">Otro</mat-option>
        </mat-select></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Fecha de nacimiento</mat-label><input matInput type="date" formControlName="birthDate" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Rol</mat-label><mat-select formControlName="role">
          @for (r of USER_ROLES; track r.value) { <mat-option [value]="r.value">{{ r.label }}</mat-option> }
        </mat-select></mat-form-field>
      </div>
      @if (data?.canPickGym) {
        <mat-form-field appearance="outline"><mat-label>Gimnasio</mat-label><mat-select formControlName="gymId">
          <mat-option [value]="''">Sin asignar</mat-option>
          @for (g of gyms(); track g.id) { <mat-option [value]="g.id">{{ g.name }}</mat-option> }
        </mat-select></mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}`,
})
export class UserDialog implements OnInit {
  readonly USER_ROLES = USER_ROLES;
  private readonly dialogRef = inject(MatDialogRef<UserDialog>);
  private readonly fb = inject(FormBuilder);
  readonly gyms = signal<{ id: string; name: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    gender: [''],
    birthDate: [''],
    role: ['client', Validators.required],
    gymId: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { user?: User; canPickGym?: boolean; service?: GymsService }) {
    if (data?.user) {
      this.form.patchValue({
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        phone: data.user.phone ?? '',
        gender: data.user.gender ?? '',
        birthDate: data.user.birthDate ? new Date(data.user.birthDate).toISOString().slice(0, 10) : '',
        role: data.user.role,
        gymId: data.user.gymId ?? '',
      });
      this.form.controls.email.disable();
    }
  }

  ngOnInit(): void {
    if (!this.data?.canPickGym) return;
    this.data.service?.list().subscribe((r) => this.gyms.set(r.items));
  }

  save(): void {
    const v = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      firstName: v.firstName,
      lastName: v.lastName,
      phone: v.phone || undefined,
      gender: v.gender || undefined,
      birthDate: v.birthDate ? new Date(v.birthDate + 'T00:00:00').toISOString() : undefined,
      role: v.role,
    };
    if (this.data?.canPickGym) payload['gymId'] = v.gymId || null;
    if (this.data?.user) {
      if (v.email) payload['email'] = v.email;
    } else {
      payload['email'] = v.email;
      payload['password'] = v.password || 'PowerZone2024!';
    }
    this.dialogRef.close(payload);
  }
}