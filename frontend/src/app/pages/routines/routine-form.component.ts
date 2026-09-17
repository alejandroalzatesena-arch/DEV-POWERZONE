import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RoutinesService } from '../../core/services/routines.service';
import { ExercisesService } from '../../core/services/exercises.service';
import { Exercise } from '../../core/models/models';
import { ROUTINE_OBJECTIVES, routineObjectiveLabel, DAY_NAMES, fitnessGoalLabel, FITNESS_GOALS } from '../../shared/utils/labels';

@Component({
  selector: 'app-routine-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    PageHeaderComponent,
  ],
  templateUrl: './routine-form.component.html',
  styleUrl: './routine-form.component.scss',
})
export class RoutineFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly routines = inject(RoutinesService);
  private readonly exercisesService = inject(ExercisesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackbar = inject(MatSnackBar);

  editing = false;
  routineId = '';
  exercises = new Map<string, Exercise>();
  readonly exercisesList: Exercise[] = [];

  readonly objectives = ROUTINE_OBJECTIVES;
  readonly fitnessGoals = FITNESS_GOALS.filter((g) =>
    ['gain_muscle', 'weight_loss', 'endurance', 'general_fitness'].includes(g.value));
  readonly loading = true;

  tryToSync = false;

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    objective: ['general'],
    difficulty: [3],
    daysPerWeek: [3, [Validators.required, Validators.min(1), Validators.max(7)]],
    durationWeeks: [4],
    isTemplate: [false],
    exercises: this.fb.array([]),
  });

  get exerciseRows(): FormArray {
    return this.form.get('exercises') as FormArray;
  }

  ngOnInit(): void {
    this.exercisesService.list({ limit: 500 }).subscribe({
      next: (r) => {
        r.items.forEach((e) => this.exercises.set(e.id, e));
        this.exercisesList.push(...r.items);
      },
      error: () => undefined,
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.editing = true;
        this.routineId = id;
        this.routines.get(id).subscribe({
          next: (r) => this.patchForm(r),
          error: () => undefined,
        });
      }
    });
  }

  patchForm(r: import('../../core/models/models').Routine): void {
    this.form.patchValue({
      title: r.title,
      description: r.description ?? '',
      objective: r.objective ?? 'general',
      difficulty: r.difficulty ?? 3,
      daysPerWeek: r.daysPerWeek,
      durationWeeks: r.durationWeeks ?? 4,
      isTemplate: r.isTemplate ?? false,
    });
    (r.exercises ?? []).forEach((e) => this.addRow(e));
  }

  addRow(prefill?: import('../../core/models/models').RoutineExercise): void {
    this.exerciseRows.push(
      this.fb.nonNullable.group({
        exerciseId: [prefill?.exerciseId ?? '', Validators.required],
        dayOfWeek: [prefill?.dayOfWeek ?? 1, Validators.required],
        sets: [prefill?.sets ?? 3, [Validators.required, Validators.min(1)]],
        reps: [prefill?.reps ?? 10, [Validators.required, Validators.min(1)]],
        restSeconds: [prefill?.restSeconds ?? 60],
        weight: [prefill?.weight ?? null],
        notes: [prefill?.notes ?? ''],
      }),
    );
  }

  removeRow(i: number): void {
    this.exerciseRows.removeAt(i);
  }

  moveEx(i: number, dir: number): void {
    const j = i + dir;
    if (j < 0 || j >= this.exerciseRows.length) return;
    const a = this.form.get('exercises') as FormArray;
    const current = a.at(i);
    const other = a.at(j);
    a.setControl(i, other);
    a.setControl(j, current);
  }

  save(): void {
    if (this.form.invalid) return;
    const payload = this.serialize();
    const obs = this.editing
      ? this.routines.update(this.routineId, payload)
      : this.routines.create(payload);
    obs.subscribe({
      next: () => {
        this.snackbar.open(this.editing ? 'Rutina actualizada' : 'Rutina creada', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/routines']);
      },
      error: () => undefined,
    });
  }

  cancel(): void {
    this.router.navigate(['/routines']);
  }

  private serialize(): Record<string, unknown> {
    const v = this.form.getRawValue();
    type Row = {
      exerciseId: string;
      dayOfWeek: number;
      sets: number;
      reps: number;
      restSeconds?: number;
      weight?: number | null;
      notes?: string;
    };
    return {
      title: v.title,
      description: v.description || undefined,
      objective: v.objective,
      difficulty: Number(v.difficulty) || undefined,
      daysPerWeek: Number(v.daysPerWeek),
      durationWeeks: Number(v.durationWeeks) || undefined,
      isTemplate: v.isTemplate,
      exercises: (v.exercises as Row[]).map((e, idx) => ({
        exerciseId: e.exerciseId,
        dayOfWeek: Number(e.dayOfWeek),
        order: idx + 1,
        sets: Number(e.sets),
        reps: Number(e.reps),
        restSeconds: e.restSeconds ? Number(e.restSeconds) : undefined,
        weight: e.weight != null ? Number(e.weight) : undefined,
        notes: e.notes || undefined,
      })),
    };
  }

  exerciseName(id: string): string {
    return this.exercises.get(id)?.name ?? '—';
  }

  protected readonly DAY_NAMES = DAY_NAMES;
  protected readonly objectiveLabel = routineObjectiveLabel;
  protected readonly goalLabel = fitnessGoalLabel;
}