import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MembershipsService } from '../../core/services/memberships.service';
import { RoutinesService } from '../../core/services/routines.service';
import { ClassesService } from '../../core/services/classes.service';
import { NutritionService } from '../../core/services/nutrition.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { PaymentsService } from '../../core/services/payments.service';
import { SocketService } from '../../core/services/socket.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  initials,
  formatMoney,
  formatDate,
  timeOnly,
  membershipStatus,
  routineStatus,
  mealTypeLabel,
  foodCategoryLabel,
  DAY_NAMES,
  paymentStatus,
  bookingStatus,
  roleLabel,
  roleColor,
  paymentMethodLabel,
} from '../../shared/utils/labels';
import {
  UserMembership,
  Routine,
  GymClass,
  NutritionSummary,
  Occupancy,
  Payment,
  AttendanceRecord,
} from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    StatCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly memberships = inject(MembershipsService);
  private readonly routines = inject(RoutinesService);
  private readonly classes = inject(ClassesService);
  private readonly nutrition = inject(NutritionService);
  private readonly attendance = inject(AttendanceService);
  private readonly payments = inject(PaymentsService);
  private readonly socket = inject(SocketService);

  readonly user = this.auth.user;
  readonly isClient = computed(() => this.user()?.role === 'client');
  readonly isStaff = computed(() =>
    !this.auth.isSuperAdmin()
      ? this.user()?.role === 'admin' ||
        this.user()?.role === 'trainer' ||
        this.user()?.role === 'receptionist'
      : true,
  );

  readonly membership = signal<UserMembership | null>(null);
  readonly myRoutines = signal<Routine[]>([]);
  readonly upcomingClasses = signal<GymClass[]>([]);
  readonly myBookings = signal<GymClass[]>([]);
  readonly nutritionToday = signal<NutritionSummary | null>(null);
  readonly occupancy = signal<Occupancy | null>(null);
  readonly todayCheckins = signal(0);
  readonly recentPayments = signal<Payment[]>([]);
  readonly activeMemberships = signal(0);
  readonly myAttendance = signal<AttendanceRecord[]>([]);
  readonly loading = signal(true);

  readonly canSeePayments = computed(
    () => ['admin', 'receptionist'].includes(this.user()?.role ?? '') || this.auth.isSuperAdmin(),
  );

  occupancyPct = computed(() => {
    const o = this.occupancy();
    return o ? Math.min(100, Math.round((o.current / o.maxCapacity) * 100)) : 0;
  });

  ngOnInit(): void {
    const me = this.auth.user();
    if (!me) return;

    if (me.gymId) {
      this.attendance.occupancy(me.gymId).subscribe({
        next: (o) => {
          this.occupancy.set(o);
          this.socket.connectOccupancy(me.gymId!, (data) => {
            const d = data as Occupancy;
            this.occupancy.set(d);
          });
        },
        error: () => undefined,
      });
    }

    if (this.isClient()) {
      this.memberships
        .mine()
        .subscribe({ next: (m) => this.membership.set(m), error: () => undefined });
      this.routines
        .mine({ limit: 10 })
        .subscribe({ next: (r) => this.myRoutines.set(r.items), error: () => undefined });
      this.nutrition
        .dailySummary()
        .subscribe({ next: (s) => this.nutritionToday.set(s), error: () => undefined });
      this.classes.myBookings({ limit: 10 }).subscribe({
        next: (r) =>
          this.myBookings.set(
            r.items
              .filter(
                (b) => b.status === 'confirmed' && new Date(b.class?.startTime ?? '') > new Date(),
              )
              .map((b) => b.class!)
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
          ),
        error: () => undefined,
      });
    }

    if (this.isStaff()) {
      this.classes
        .upcoming()
        .subscribe({ next: (r) => this.upcomingClasses.set(r.items), error: () => undefined });
      this.memberships.list({ limit: 1 }).subscribe({
        next: (r) => this.activeMemberships.set(r.meta.total),
        error: () => undefined,
      });
    }

    if (this.canSeePayments()) {
      this.payments
        .list({ limit: 5 })
        .subscribe({ next: (r) => this.recentPayments.set(r.items), error: () => undefined });
    }

    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    this.attendance.mine({ limit: 100, from, to: from }).subscribe({
      next: (r) => {
        this.myAttendance.set(r.items);
        this.todayCheckins.set(r.items.filter((a) => a.type === 'check_in').length);
      },
      error: () => undefined,
    });

    setTimeout(() => this.loading.set(false), 300);
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly timeOnly = timeOnly;
  protected readonly membershipStatus = membershipStatus;
  protected readonly routineStatus = routineStatus;
  protected readonly mealTypeLabel = mealTypeLabel;
  protected readonly foodCategoryLabel = foodCategoryLabel;
  protected readonly DAY_NAMES = DAY_NAMES;
  protected readonly paymentStatus = paymentStatus;
  protected readonly bookingStatus = bookingStatus;
  protected readonly roleLabel = roleLabel;
  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly initials = initials;

  protected readonly today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  roleColor(): string {
    const r = this.user()?.role;
    return r === 'admin'
      ? 'volt'
      : r === 'trainer'
        ? 'info'
        : r === 'receptionist'
          ? 'orange'
          : 'muted';
  }

  get daysLeft(): number {
    const m = this.membership();
    if (!m) return 0;
    return Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000));
  }

  membershipProgress(): number {
    const m = this.membership();
    if (!m) return 0;
    const start = new Date(m.startDate).getTime();
    const end = new Date(m.endDate).getTime();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  }

  macros(): Array<{ name: string; value: string; pct: number; icon: string }> {
    const t = this.nutritionToday()?.totals;
    if (!t) return [];
    const targets = { calories: 2000, protein: 120, carbs: 250, fats: 70 };
    const arr: Array<{ name: string; value: string; pct: number; icon: string }> = [
      {
        name: 'Calorías',
        value: `${t.calories} kcal`,
        pct: Math.min(100, (t.calories / targets.calories) * 100),
        icon: '🔥',
      },
      {
        name: 'Proteína',
        value: `${t.protein} g`,
        pct: Math.min(100, (t.protein / targets.protein) * 100),
        icon: '🥩',
      },
      {
        name: 'Carbohidratos',
        value: `${t.carbs} g`,
        pct: Math.min(100, (t.carbs / targets.carbs) * 100),
        icon: '🍞',
      },
      {
        name: 'Grasas',
        value: `${t.fats} g`,
        pct: Math.min(100, (t.fats / targets.fats) * 100),
        icon: '🥑',
      },
    ];
    return arr;
  }

  availableClassBadge(c: GymClass): string {
    return (c.availableSpots ?? 0) > 0 ? 'badge-success' : 'badge-orange';
  }

  availableClassText(c: GymClass): string {
    return (c.availableSpots ?? 0) > 0 ? `${c.availableSpots} cupos` : 'Completa';
  }

  goRoutines(): void {
    this.router.navigate(['/routines']);
  }

  goClasses(): void {
    this.router.navigate(['/classes']);
  }

  goNutrition(): void {
    this.router.navigate(['/nutrition']);
  }

  routineDays(r: Routine): string {
    return (r.exercises ?? [])
      .map((e) => DAY_NAMES[e.dayOfWeek] ?? '')
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .join(' · ');
  }
}
