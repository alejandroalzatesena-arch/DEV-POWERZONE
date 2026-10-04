import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RoutinesService } from '../../core/services/routines.service';
import { ExercisesService } from '../../core/services/exercises.service';
import { AuthService } from '../../core/services/auth.service';
import { Routine, Exercise } from '../../core/models/models';
import {
  routineStatus,
  routineObjectiveLabel,
  DAY_NAMES,
  initials,
} from '../../shared/utils/labels';
import { AssignRoutineDialog } from './assign-routine.dialog';

@Component({
  selector: 'app-routine-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './routine-detail.component.html',
  styleUrl: './routine-detail.component.scss',
})
export class RoutineDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routines = inject(RoutinesService);
  private readonly exercisesService = inject(ExercisesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  readonly routine = signal<Routine | null>(null);
  readonly loading = signal(true);
  exerciseMap = new Map<string, Exercise>();

  ngOnInit(): void {
    this.exercisesService.list({ limit: 500 }).subscribe({
      next: (r) => r.items.forEach((e) => this.exerciseMap.set(e.id, e)),
      error: () => undefined,
    });
    this.route.paramMap.subscribe((p) => {
      const id = p.get('id');
      if (!id) return;
      this.routines.get(id).subscribe({
        next: (r) => {
          this.routine.set(r);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  days(): number[] {
    const r = this.routine();
    if (!r?.exercises?.length) return [];
    const days = [...new Set(r.exercises.map((e) => e.dayOfWeek))].sort((a, b) => a - b);
    return days.slice(0, r.daysPerWeek);
  }

  exercisesOf(day: number): import('../../core/models/models').RoutineExercise[] {
    return (this.routine()?.exercises ?? [])
      .filter((e) => e.dayOfWeek === day)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  canEdit(): boolean {
    return ['admin', 'trainer'].includes(this.auth.user()?.role ?? '') || this.auth.isSuperAdmin();
  }

  edit(): void {
    this.router.navigate(['/routines', this.routine()!.id, 'edit'], { replaceUrl: true });
  }

  assign(): void {
    if (!this.routine()) return;
    const ref = this.dialog.open(AssignRoutineDialog, {
      data: { routine: this.routine() },
      width: '480px',
    });
    ref.afterClosed().subscribe((userId) => {
      if (!userId) return;
      this.reload();
    });
  }

  setStatus(status: 'draft' | 'active' | 'archived'): void {
    const r = this.routine()!;
    this.routines.update(r.id, { status }).subscribe({
      next: () => {
        this.snackbar.open('Estado actualizado', 'Cerrar', { duration: 3000 });
        this.reload();
      },
      error: () => undefined,
    });
  }

  remove(): void {
    const r = this.routine()!;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar rutina',
        message: `¿Eliminar "${r.title}"?`,
        okText: 'Eliminar',
        okClass: 'mat-danger',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.routines.remove(r.id).subscribe({
        next: () => {
          this.snackbar.open('Rutina eliminada', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/routines']);
        },
        error: () => undefined,
      });
    });
  }

  reload(): void {
    this.routines
      .get(this.routine()!.id)
      .subscribe({ next: (r) => this.routine.set(r), error: () => undefined });
  }

  exerciseName(id: string): string {
    const e = this.exerciseMap.get(id);
    return e?.name ?? 'Ejercicio';
  }

  exerciseMeta(id: string): string {
    const e = this.exerciseMap.get(id);
    return e ? `${e.muscleGroup} · ${e.equipmentNeeded ?? 'Sin equipamiento'}` : '';
  }

  protected readonly routineStatus = routineStatus;
  protected readonly objectiveLabel = routineObjectiveLabel;
  protected readonly DAY_NAMES = DAY_NAMES;
  protected readonly initials = initials;

  routerBack(): void {
    this.router.navigate(['/routines']);
  }
}
