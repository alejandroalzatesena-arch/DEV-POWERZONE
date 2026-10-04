import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ExercisesService } from '../../core/services/exercises.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Exercise } from '../../core/models/models';
import {
  EXERCISE_CATEGORIES,
  exerciseCategoryLabel,
  exerciseCategoryIcon,
} from '../../shared/utils/labels';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './exercises.component.html',
  styleUrl: './exercises.component.scss',
})
export class ExercisesComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly exercises = inject(ExercisesService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Exercise[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly categoryFilter = signal('');
  readonly search = signal('');

  page = 0;
  limit = 24;

  canEdit(): boolean {
    return ['admin', 'trainer'].includes(this.auth.user()?.role ?? '') || this.auth.isSuperAdmin();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.categoryFilter()) query['category'] = this.categoryFilter();
    if (this.search()) query['search'] = this.search();
    this.exercises.list(query).subscribe({
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

  setCategory(c: string): void {
    this.categoryFilter.set(c);
    this.page = 0;
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page = 0;
    this.load();
  }

  create(): void {
    const ref = this.dialog.open(ExerciseDialog, { width: '600px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.exercises.create(res).subscribe({
        next: () => {
          this.toast.success('Ejercicio creado');
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  edit(e: Exercise): void {
    const ref = this.dialog.open(ExerciseDialog, { data: e, width: '600px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.exercises.update(e.id, res).subscribe({
        next: () => {
          this.toast.success('Ejercicio actualizado');
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  remove(e: Exercise): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Eliminar "${e.name}"`,
        message: '¿Querés eliminar este ejercicio?',
        okText: 'Eliminar',
        okClass: 'mat-danger',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.exercises.remove(e.id).subscribe({
        next: () => {
          this.toast.success('Ejercicio eliminado');
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  protected readonly categories = EXERCISE_CATEGORIES;
  protected readonly categoryLabel = exerciseCategoryLabel;
  protected readonly categoryIcon = exerciseCategoryIcon;
}

@Component({
  selector: 'pz-exercise-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">
      {{ data ? 'Editar ejercicio' : 'Nuevo ejercicio' }}
    </h2>
    <mat-dialog-content
      style="display:grid;gap:10px;padding:16px 24px;min-width:480px;max-height:72vh"
    >
      <mat-form-field appearance="outline"
        ><mat-label>Nombre</mat-label><input matInput formControlName="name"
      /></mat-form-field>
      <mat-form-field appearance="outline"
        ><mat-label>Descripción</mat-label
        ><textarea matInput formControlName="description" rows="2"></textarea>
      </mat-form-field>
      <div class="row2">
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="category">
            @for (c of categories; track c.value) {
              <mat-option [value]="c.value">{{ c.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Grupo muscular</mat-label><input matInput formControlName="muscleGroup"
        /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"
          ><mat-label>Equipamiento</mat-label><input matInput formControlName="equipmentNeeded"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Dificultad (1-5)</mat-label
          ><input matInput type="number" min="1" max="5" formControlName="difficulty"
        /></mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Instrucciones (una por línea)</mat-label>
        <textarea matInput formControlName="instructionsText" rows="3"></textarea>
      </mat-form-field>
      <div class="row2">
        <mat-form-field appearance="outline"
          ><mat-label>URL de video</mat-label><input matInput formControlName="videoUrl"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>URL de imagen</mat-label><input matInput formControlName="imageUrl"
        /></mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  `,
})
export class ExerciseDialog {
  readonly form = new FormBuilder().nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    category: ['', Validators.required],
    muscleGroup: ['', Validators.required],
    equipmentNeeded: [''],
    difficulty: [3],
    instructionsText: [''],
    videoUrl: [''],
    imageUrl: [''],
  });
  private readonly dialogRef = inject(MatDialogRef<ExerciseDialog>);
  protected readonly categories = EXERCISE_CATEGORIES;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Exercise | null) {
    if (data) {
      this.form.patchValue({
        name: data.name,
        description: data.description ?? '',
        category: data.category,
        muscleGroup: data.muscleGroup,
        equipmentNeeded: data.equipmentNeeded ?? '',
        difficulty: data.difficulty ?? 3,
        instructionsText: (data.instructions ?? []).join('\n'),
        videoUrl: data.videoUrl ?? '',
        imageUrl: data.imageUrl ?? '',
      });
    }
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name,
      description: v.description || undefined,
      category: v.category,
      muscleGroup: v.muscleGroup,
      equipmentNeeded: v.equipmentNeeded || undefined,
      difficulty: v.difficulty ? Number(v.difficulty) : undefined,
      instructions: v.instructionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      videoUrl: v.videoUrl || undefined,
      imageUrl: v.imageUrl || undefined,
    });
  }
}
