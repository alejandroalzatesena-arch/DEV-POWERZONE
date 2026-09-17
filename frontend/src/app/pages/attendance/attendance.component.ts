import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AttendanceService } from '../../core/services/attendance.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { AttendanceRecord, Occupancy, User } from '../../core/models/models';
import { formatDateTime, attendanceType, attendanceMethodLabel, initials } from '../../shared/utils/labels';

@Component({
  selector: 'app-attendance',
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
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss',
})
export class AttendanceComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly attendance = inject(AttendanceService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly socket = inject(SocketService);
  private readonly fb = inject(FormBuilder);

  readonly occupancy = signal<Occupancy | null>(null);
  readonly rows = signal<AttendanceRecord[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly members = signal<User[]>([]);
  readonly isStaff = signal(false);

  page = 0;
  limit = 15;
  columns: string[] = [];

  filterForm = this.fb.nonNullable.group({
    userId: [''],
    from: [''],
    to: [''],
  });

  get myId(): string {
    return this.auth.user()?.id ?? '';
  }
  get meGymId(): string | null {
    return this.auth.user()?.gymId ?? null;
  }

  occupancyPct = signal(0);

  ngOnInit(): void {
    this.isStaff.set(this.auth.user()?.role !== 'client');
    this.columns = this.isStaff() ? ['member', 'time', 'type', 'method'] : ['time', 'type', 'method'];

    if (this.isStaff()) {
      this.usersService.list({ limit: 200 }).subscribe({
        next: (r) => this.members.set(r.items),
        error: () => undefined,
      });
    } else {
      this.filterForm.patchValue({ userId: this.myId });
    }

    if (this.meGymId) {
      this.refreshOccupancy();
    }

    this.load();
  }

  refreshOccupancy(): void {
    if (!this.meGymId) return;
    this.attendance.occupancy(this.meGymId).subscribe({
      next: (o) => {
        this.occupancy.set(o);
        this.occupancyPct.set(Math.min(100, Math.round((o.current / Math.max(1, o.maxCapacity)) * 100)));
      },
      error: () => undefined,
    });
    this.socket.connectOccupancy(this.meGymId, (data) => {
      const d = data as Occupancy;
      this.occupancy.set(d);
      this.occupancyPct.set(Math.min(100, Math.round((d.current / Math.max(1, d.maxCapacity)) * 100)));
    });
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    const f = this.filterForm.getRawValue();
    if (f.userId) query['userId'] = f.userId;
    if (f.from) query['from'] = f.from;
    if (f.to) query['to'] = f.to;
    const obs = this.isStaff() ? this.attendance.history(query) : this.attendance.mine(query);
    obs.subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.load();
  }

  applyFilter(): void {
    this.page = 0;
    this.load();
  }

  checkIn(userId: string): void {
    this.attendance.checkIn(userId, 'member_card').subscribe({
      next: () => {
        this.toast.success('Check-in registrado');
        this.refreshOccupancy();
        this.load();
      },
      error: () => undefined,
    });
  }

  checkOut(userId: string): void {
    this.attendance.checkOut(userId, 'member_card').subscribe({
      next: () => {
        this.toast.success('Check-out registrado');
        this.refreshOccupancy();
        this.load();
      },
      error: () => undefined,
    });
  }

  protected readonly formatDateTime = formatDateTime;
  protected readonly attendanceType = attendanceType;
  protected readonly methodLabel = attendanceMethodLabel;
  protected readonly initials = initials;
}