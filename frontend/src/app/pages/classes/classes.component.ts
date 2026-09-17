import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassesService } from '../../core/services/classes.service';
import { UsersService } from '../../core/services/users.service';
import { GymClass, User } from '../../core/models/models';
import { formatDate, timeOnly, classStatus, bookingStatus, initials } from '../../shared/utils/labels';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatPaginatorModule,
    DatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './classes.component.html',
  styleUrl: './classes.component.scss',
})
export class ClassesComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly classes = inject(ClassesService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<GymClass[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly upcomingOnly = signal(true);
  readonly categoryFilter = signal('');
  readonly myBookingsSet = signal<Set<string>>(new Set());

  page = 0;
  limit = 12;
  readonly classesInstructors = signal<User[]>([]);

  get isClient(): boolean {
    return this.auth.user()?.role === 'client';
  }

  get isStaffManage(): boolean {
    return ['admin', 'trainer'].includes(this.auth.user()?.role ?? '') || this.auth.isSuperAdmin();
  }

  ngOnInit(): void {
    this.load();
    this.usersService.list({ role: ['trainer', 'admin'].join(','), limit: 100 }).subscribe({
      next: (r) => this.classesInstructors.set(r.items),
      error: () => undefined,
    });
    if (this.isClient) {
      this.classes.myBookings({ limit: 200 }).subscribe({
        next: (r) => this.myBookingsSet.set(new Set(r.items.filter((b) => b.status !== 'cancelled').map((b) => b.classId))),
        error: () => undefined,
      });
    }
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (!this.upcomingOnly()) query['upcoming'] = 'false';
    if (this.categoryFilter()) query['category'] = this.categoryFilter();
    const obs = this.upcomingOnly() ? this.classes.upcoming(query) : this.classes.list(query);
    obs.subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setView(upcoming: boolean): void {
    this.upcomingOnly.set(upcoming);
    this.page = 0;
    this.load();
  }

  setCategory(c: string): void {
    this.categoryFilter.set(c);
    this.page = 0;
    this.load();
  }

  onPage(e: { pageIndex: number; pageSize: number }): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.load();
  }

  book(c: GymClass): void {
    this.classes.book(c.id).subscribe({
      next: () => {
        this.toast.success('Clase reservada');
        this.myBookingsSet.update((s) => new Set(s).add(c.id));
        this.load();
      },
      error: () => undefined,
    });
  }

  cancelBooking(c: GymClass): void {
    this.classes.cancelBooking(c.id).subscribe({
      next: () => {
        this.toast.success('Reserva cancelada');
        this.myBookingsSet.update((s) => {
          const ns = new Set(s);
          ns.delete(c.id);
          return ns;
        });
        this.load();
      },
      error: () => undefined,
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(CreateClassDialog, { data: { instructors: this.classesInstructors() }, width: '560px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.classes.create(res).subscribe({
        next: () => {
          this.toast.success('Clase creada');
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  edit(c: GymClass): void {
    const ref = this.dialog.open(CreateClassDialog, { data: { instructors: this.classesInstructors(), cls: c }, width: '560px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.classes.update(c.id, res).subscribe({
        next: () => {
          this.toast.success('Clase actualizada');
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  remove(c: GymClass): void {
    this.classes.remove(c.id).subscribe({
      next: () => {
        this.toast.success('Clase eliminada');
        this.load();
      },
      error: () => undefined,
    });
  }

  availableColor(c: GymClass): string {
    const a = c.availableSpots ?? (c.capacity - (c.bookedSpots ?? 0));
    if (a <= 0) return 'badge-danger';
    if (a <= Math.max(3, c.capacity * 0.2)) return 'badge-orange';
    return 'badge-success';
  }

  availableText(c: GymClass): string {
    const a = c.availableSpots ?? (c.capacity - (c.bookedSpots ?? 0));
    if (a <= 0) return 'Completa';
    return `${a} cupos`;
  }

  capacityPct(c: GymClass): number {
    const booked = c.bookedSpots ?? 0;
    return Math.min(100, (booked / Math.max(1, c.capacity)) * 100);
  }

  protected readonly formatDate = formatDate;
  protected readonly timeOnly = timeOnly;
  protected readonly classStatus = classStatus;
  protected readonly bookingStatus = bookingStatus;
  protected readonly initials = initials;
}

// ---------------- Dialog: Crear/editar clase ----------------
@Component({
  selector: 'pz-create-class-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">{{ data?.cls ? 'Editar clase' : 'Nueva clase' }}</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:480px;max-height:72vh">
      <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" placeholder="CrossFit / Spinning / HIIT…" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Categoría</mat-label><input matInput formControlName="category" /></mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Instructor</mat-label>
          <mat-select formControlName="instructorId">
            @for (i of instructors; track i.id) {
              <mat-option [value]="i.id">{{ i.fullName }} ({{ i.email }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Capacidad</mat-label><input matInput type="number" formControlName="capacity" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Sala</mat-label><input matInput formControlName="room" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Fecha y hora inicio</mat-label><input matInput [matDatepicker]="p1" formControlName="startDate" /><mat-datepicker-toggle matIconSuffix [for]="p1"></mat-datepicker-toggle><mat-datepicker #p1></mat-datepicker></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Hora inicio</mat-label><input matInput type="time" formControlName="startTime" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Fecha y hora fin</mat-label><input matInput [matDatepicker]="p2" formControlName="endDate" /><mat-datepicker-toggle matIconSuffix [for]="p2"></mat-datepicker-toggle><mat-datepicker #p2></mat-datepicker></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Hora fin</mat-label><input matInput type="time" formControlName="endTime" /></mat-form-field>
      </div>
      <mat-form-field appearance="outline"><mat-label>Color (hex)</mat-label><input matInput formControlName="color" placeholder="#c8ff3d" /></mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}`,
})
export class CreateClassDialog {
  readonly form = new FormBuilder().nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    category: [''],
    instructorId: ['', Validators.required],
    capacity: [20, [Validators.required, Validators.min(1)]],
    room: [''],
    startDate: [new Date() as Date | null],
    startTime: ['08:00'],
    endDate: [new Date() as Date | null],
    endTime: ['09:00'],
    color: [''],
  });
  private readonly dialogRef = inject(MatDialogRef<CreateClassDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { instructors: User[]; cls?: GymClass }) {
    if (data?.cls) {
      const s = new Date(data.cls.startTime);
      const e = new Date(data.cls.endTime ?? data.cls.startTime);
      this.form.patchValue({
        name: data.cls.name,
        description: data.cls.description ?? '',
        category: data.cls.category ?? '',
        instructorId: data.cls.instructorId,
        capacity: data.cls.capacity,
        room: data.cls.room ?? '',
        startDate: s,
        startTime: s.toTimeString().slice(0, 5),
        endDate: e,
        endTime: e.toTimeString().slice(0, 5),
        color: data.cls.color ?? '',
      });
    }
  }

  get instructors(): User[] {
    return this.data?.instructors ?? [];
  }

  save(): void {
    const v = this.form.getRawValue();
    const startDate = v.startDate as Date | null;
    const start = startDate ? new Date(startDate) : new Date();
    const endDate = v.endDate as Date | null;
    const end = endDate ? new Date(endDate) : new Date(start);
    const [sh, sm] = (v.startTime || '08:00').split(':').map(Number);
    const [eh, em] = (v.endTime || '09:00').split(':').map(Number);
    start.setHours(sh, sm, 0, 0);
    end.setHours(eh, em, 0, 0);
    this.dialogRef.close({
      name: v.name,
      description: v.description || undefined,
      category: v.category || undefined,
      instructorId: v.instructorId,
      capacity: Number(v.capacity),
      room: v.room || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      color: v.color || undefined,
    });
  }
}