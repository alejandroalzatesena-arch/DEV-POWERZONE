import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { NodeTreeComponent } from '../../shared/components/node-tree/node-tree.component';
import { ReportsService } from '../../core/services/reports.service';
import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/models';
import { formatMoney, initials } from '../../shared/utils/labels';

type Node = {
  key: string;
  label: string;
  value?: string;
  badge?: 'success' | 'danger' | 'orange' | 'info';
  children?: Node[];
  unit?: string;
  list?: unknown[];
};

const HUMANIZE: Record<string, string> = {
  totalRevenue: 'Ingresos totales',
  revenue: 'Ingresos',
  expenses: 'Gastos',
  netProfit: 'Ganancia neta',
  totalIncome: 'Ingresos',
  income: 'Ingresos',
  avgTicket: 'Ticket promedio',
  total: 'Total',
  count: 'Cantidad',
  active: 'Activas',
  overdue: 'Vencidas',
  expiringSoon: 'Próximas a vencer',
  pendingRenewals: 'Renovaciones pendientes',
  totalMembers: 'Socios',
  newMembers: 'Altas',
  cancelled: 'Bajas',
  checkIns: 'Check-ins',
  checkOuts: 'Check-outs',
  peakHour: 'Hora pico',
  occupancy: 'Ocupación',
  current: 'Actual',
  max: 'Máxima',
  avgDaily: 'Promedio diario',
  byDayOfWeek: 'Por día de la semana',
  byHour: 'Por hora',
  byCategory: 'Por categoría',
  byMembershipType: 'Por membresía',
  summary: 'Resumen',
  items: 'Ítems',
  progress: 'Progreso',
  weight: 'Peso',
  height: 'Altura',
  bodyFat: 'Grasa corporal',
  measurements: 'Mediciones',
  goals: 'Objetivos',
  topClients: 'Top clientes',
  attendanceRate: 'Asistencia',
  churnRate: 'Tasa de abandono',
  avgCustomerLifetime: 'Vida media del cliente',
  yearly: 'Anual',
  monthly: 'Mensual',
  daily: 'Diario',
  breakdown: 'Desglose',
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    PageHeaderComponent,
    NodeTreeComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly usersService = inject(UsersService);
  private readonly fb = inject(FormBuilder);

  readonly financialForm = this.fb.nonNullable.group({ from: [''], to: [''] });
  readonly attendanceForm = this.fb.nonNullable.group({ from: [''], to: [''] });
  readonly progressForm = this.fb.nonNullable.group({ userId: ['', Validators.required] });
  readonly members = signal<User[]>([]);
  readonly membersLoading = signal(true);

  readonly financial = signal<Node[]>([]);
  readonly operational = signal<Node[]>([]);
  readonly memberships = signal<Node[]>([]);
  readonly attendance = signal<Node[]>([]);
  readonly progress = signal<Node[]>([]);

  readonly loading = signal(true);
  private pending = 0;

  ngOnInit(): void {
    this.usersService.list({ role: 'client', limit: 500 }).subscribe({
      next: (r) => this.members.set(r.items),
      error: () => undefined,
    });
    // Cargar financiero y operativo por defecto
    this.loadFinancial();
    this.loadOperational();
    this.loadMemberships();
    this.loadAttendance();
  }

  private done(): void {
    this.pending -= 1;
    if (this.pending <= 0) this.loading.set(false);
  }

  private buildNodes(data: Record<string, unknown>, rootKey = ''): Node[] {
    const out: Node[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (v == null) continue;
      const label = HUMANIZE[k] ?? humanize(k);
      if (Array.isArray(v)) {
        const children = (v as unknown[]).map((item, i) => {
          if (item !== null && typeof item === 'object') {
            const built = this.buildNodes(item as Record<string, unknown>);
            return built.length
              ? { ...built[0], key: `${k}[${i}]` }
              : { key: `${k}[${i}]`, label: `#${i + 1}`, value: String(item) };
          }
          return this.leaf(`${k}[${i}]`, `#${i + 1}`, item);
        });
        out.push({ key: k, label, children });
      } else if (typeof v === 'object') {
        out.push({
          key: k,
          label,
          children: this.buildNodes(v as Record<string, unknown>, rootKey),
        });
      } else {
        out.push(this.leaf(k, label, v));
      }
    }
    return out;
  }

  private leaf(k: string, label: string, v: unknown): Node {
    const s = String(v);
    let value = s;
    if (typeof v === 'number') {
      if (
        /[Rr]evenue|[Ii]ncome|[Pp]rofit|[Cc]ost|[Pp]rice|[Tt]icket|[Ee]xpense|[Mm]oney|[Bb]alance|amount/i.test(
          k,
        )
      ) {
        value = formatMoney(v);
      } else {
        value = new Intl.NumberFormat('es-AR').format(v);
      }
    }
    const badge: Node['badge'] | undefined =
      typeof v === 'number' &&
      (k === 'netProfit' || k === 'totalRevenue' || k === 'active') &&
      v > 0
        ? 'success'
        : undefined;
    return { key: k, label, value, badge };
  }

  loadFinancial(): void {
    const f = this.financialForm.getRawValue();
    this.pending += 1;
    this.loading.set(true);
    this.reports.financial(f.from || undefined, f.to || undefined).subscribe({
      next: (r) => {
        this.financial.set(this.buildNodes(r));
        this.done();
      },
      error: () => {
        this.financial.set([]);
        this.done();
      },
    });
  }

  loadOperational(): void {
    this.pending += 1;
    this.loading.set(true);
    this.reports.operational().subscribe({
      next: (r) => {
        this.operational.set(this.buildNodes(r));
        this.done();
      },
      error: () => {
        this.operational.set([]);
        this.done();
      },
    });
  }

  loadMemberships(): void {
    this.pending += 1;
    this.loading.set(true);
    this.reports.memberships().subscribe({
      next: (r) => {
        this.memberships.set(this.buildNodes(r));
        this.done();
      },
      error: () => {
        this.memberships.set([]);
        this.done();
      },
    });
  }

  loadAttendance(): void {
    const f = this.attendanceForm.getRawValue();
    this.pending += 1;
    this.loading.set(true);
    this.reports.attendance(f.from || undefined, f.to || undefined).subscribe({
      next: (r) => {
        this.attendance.set(this.buildNodes(r));
        this.done();
      },
      error: () => {
        this.attendance.set([]);
        this.done();
      },
    });
  }

  loadProgress(): void {
    const userId = this.progressForm.controls.userId.value;
    if (!userId) return;
    this.pending += 1;
    this.loading.set(true);
    this.reports.progress(userId).subscribe({
      next: (r) => {
        this.progress.set(this.buildNodes(r));
        this.done();
      },
      error: () => {
        this.progress.set([]);
        this.done();
      },
    });
  }

  protected exportCsv(rows: Node[], filename: string): void {
    const lines: string[][] = [];
    const walk = (nodes: Node[], prefix: string): void => {
      for (const n of nodes) {
        if (n.children?.length) {
          walk(n.children, prefix ? `${prefix} / ${n.label}` : n.label);
        } else {
          lines.push([prefix, n.label, n.value?.split(' ')[0] ?? '']);
        }
      }
    };
    walk(rows, '');
    const esc = (v: string): string => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = '\uFEFF' + lines.map((r) => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected readonly initials = initials;
}

const humanize = (k: string): string =>
  k
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
