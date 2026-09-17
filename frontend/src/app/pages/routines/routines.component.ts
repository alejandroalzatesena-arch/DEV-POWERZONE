import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RoutinesService } from '../../core/services/routines.service';
import { AuthService } from '../../core/services/auth.service';
import { Routine } from '../../core/models/models';
import {
  routineStatus,
  routineObjectiveLabel,
  ROUTINE_OBJECTIVES,
  DAY_NAMES,
  formatDate,
  initials,
} from '../../shared/utils/labels';
import { AssignRoutineDialog } from './assign-routine.dialog';

@Component({
  selector: 'app-routines',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './routines.component.html',
  styleUrl: './routines.component.scss',
})
export class RoutinesComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly routines = inject(RoutinesService);
  readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Routine[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly objectiveFilter = signal('');
  readonly statusFilter = signal('');
  readonly isClient = signal(false);

  page = 0;
  limit = 10;

  Object = Object;

  ngOnInit(): void {
    this.isClient.set(this.auth.user()?.role === 'client');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.objectiveFilter()) query['objective'] = this.objectiveFilter();
    if (this.statusFilter()) query['status'] = this.statusFilter();
    const obs = this.isClient() ? this.routines.mine(query) : this.routines.list(query);
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

  setObjective(o: string): void {
    this.objectiveFilter.set(o);
    this.page = 0;
    this.load();
  }

  setStatus(s: string): void {
    this.statusFilter.set(s);
    this.page = 0;
    this.load();
  }

  canEdit(): boolean {
    return ['admin', 'trainer'].includes(this.auth.user()?.role ?? '') || this.auth.isSuperAdmin();
  }

  goNew(): void {
    this.router.navigate(['/routines', 'new']);
  }

  assign(r: Routine): void {
    const ref = this.dialog.open(AssignRoutineDialog, { data: { routine: r }, width: '480px' });
    ref.afterClosed().subscribe((userId) => {
      if (!userId) return;
      this.routines.assign(r.id, userId).subscribe({
        next: () => {
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  protected readonly routineStatus = routineStatus;
  protected readonly objectiveLabel = routineObjectiveLabel;
  protected readonly objectives = ROUTINE_OBJECTIVES;
  protected readonly DAY_NAMES = DAY_NAMES;
  protected readonly formatDate = formatDate;
  protected readonly initials = initials;

  daysSummary(r: Routine): string {
    const days = (r.exercises ?? [])
      .map((e) => DAY_NAMES[e.dayOfWeek] ?? '')
      .filter((d, i, arr) => arr.indexOf(d) === i);
    return days.join(' · ') || 'Sin ejercicios';
  }
}