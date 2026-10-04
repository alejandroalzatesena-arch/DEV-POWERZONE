import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NutritionService } from '../../core/services/nutrition.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Food, NutritionLog, NutritionSummary } from '../../core/models/models';
import {
  formatDate,
  todayISO,
  timeOnly,
  mealTypeLabel,
  foodCategoryLabel,
  FOOD_CATEGORIES,
  MEAL_TYPES,
} from '../../shared/utils/labels';

@Component({
  selector: 'app-nutrition',
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
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './nutrition.component.html',
  styleUrl: './nutrition.component.scss',
})
export class NutritionComponent implements OnInit {
  private readonly nutrition = inject(NutritionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly summary = signal<NutritionSummary | null>(null);
  readonly date = signal(todayISO());
  readonly foods = signal<Food[]>([]);
  readonly foodsTotal = signal(0);
  readonly foodsLoading = signal(true);
  readonly logs = signal<NutritionLog[]>([]);
  readonly logsTotal = signal(0);
  readonly logsLoading = signal(true);
  readonly search = signal('');

  foodsPage = 0;
  foodsLimit = 12;
  logsPage = 0;
  logsLimit = 10;

  get isClient(): boolean {
    return this.auth.user()?.role === 'client';
  }
  get canManage(): boolean {
    return !this.isClient;
  }

  ngOnInit(): void {
    this.loadSummary();
    this.loadFoods();
  }

  loadSummary(): void {
    this.nutrition.dailySummary(this.date()).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.logs.set(s.logs);
        this.logsTotal.set(s.logs.length);
        this.logsLoading.set(false);
      },
      error: () => this.logsLoading.set(false),
    });
  }

  setDate(d: string): void {
    this.date.set(d || todayISO());
    this.logsLoading.set(true);
    this.loadSummary();
  }

  loadFoods(): void {
    this.foodsLoading.set(true);
    const query: Record<string, string | number> = {
      page: this.foodsPage + 1,
      limit: this.foodsLimit,
    };
    if (this.search()) query['search'] = this.search();
    this.nutrition.foods(query).subscribe({
      next: (r) => {
        this.foods.set(r.items);
        this.foodsTotal.set(r.meta.total);
        this.foodsLoading.set(false);
      },
      error: () => this.foodsLoading.set(false),
    });
  }

  onFoodsPage(e: PageEvent): void {
    this.foodsPage = e.pageIndex;
    this.foodsLimit = e.pageSize;
    this.loadFoods();
  }

  searchFoods(): void {
    this.foodsPage = 0;
    this.loadFoods();
  }

  openAddLog(): void {
    const ref = this.dialog.open(AddLogDialog, { width: '480px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.nutrition.createLog(res).subscribe({
        next: () => {
          this.toast.success('Registro agregado');
          this.loadSummary();
        },
        error: () => undefined,
      });
    });
  }

  removeLog(l: NutritionLog): void {
    this.nutrition.removeLog(l.id).subscribe({
      next: () => {
        this.toast.success('Registro eliminado');
        this.loadSummary();
      },
      error: () => undefined,
    });
  }

  openAddFood(): void {
    const ref = this.dialog.open(FoodDialog, { width: '480px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.nutrition.createFood(res).subscribe({
        next: () => {
          this.toast.success('Alimento creado');
          this.loadFoods();
        },
        error: () => undefined,
      });
    });
  }

  editFood(f: Food): void {
    const ref = this.dialog.open(FoodDialog, { data: f, width: '480px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.nutrition.updateFood(f.id, res).subscribe({
        next: () => {
          this.toast.success('Alimento actualizado');
          this.loadFoods();
        },
        error: () => undefined,
      });
    });
  }

  removeFood(f: Food): void {
    this.nutrition.removeFood(f.id).subscribe({
      next: () => {
        this.toast.success('Alimento eliminado');
        this.loadFoods();
      },
      error: () => undefined,
    });
  }

  macro(kind: 'protein' | 'carbs' | 'fats'): number {
    return this.summary()?.totals?.[kind] ?? 0;
  }

  mealIcon(m: string): string {
    return MEAL_TYPES.find((x) => x.value === m)?.icon ?? 'restaurant';
  }

  protected readonly formatDate = formatDate;
  protected readonly timeOnly = timeOnly;
  protected readonly mealTypeLabel = mealTypeLabel;
  protected readonly foodCategoryLabel = foodCategoryLabel;
  protected readonly todayISO = todayISO;
  protected readonly FOOD_CATEGORIES = FOOD_CATEGORIES;
  protected readonly MEAL_TYPES = MEAL_TYPES;
}

// ---------------- Dialog: Agregar log ----------------
@Component({
  selector: 'pz-add-log-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">Agregar alimento</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:400px">
      <mat-form-field appearance="outline"
        ><mat-label>Alimento</mat-label
        ><mat-select formControlName="foodId">
          @for (f of foods(); track f.id) {
            <mat-option [value]="f.id">{{ f.name }} ({{ f.calories }} kcal)</mat-option>
          }
        </mat-select></mat-form-field
      >
      <mat-form-field appearance="outline"
        ><mat-label>Comida</mat-label
        ><mat-select formControlName="mealType">
          @for (m of MEAL_TYPES; track m.value) {
            <mat-option [value]="m.value">{{ m.label }}</mat-option>
          }
        </mat-select></mat-form-field
      >
      <mat-form-field appearance="outline"
        ><mat-label>Cantidad (gramos)</mat-label
        ><input matInput type="number" formControlName="quantityG"
      /></mat-form-field>
      <mat-form-field appearance="outline"
        ><mat-label>Hora (opcional)</mat-label
        ><input matInput type="time" formControlName="eatenAt"
      /></mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: ``,
})
export class AddLogDialog implements OnInit {
  readonly MEAL_TYPES = MEAL_TYPES;
  private readonly dialogRef = inject(MatDialogRef<AddLogDialog>);
  private readonly fb = inject(FormBuilder);
  private readonly nutrition = inject(NutritionService);
  readonly foods = signal<Food[]>([]);

  readonly form = this.fb.nonNullable.group({
    foodId: ['', Validators.required],
    mealType: ['snack', Validators.required],
    quantityG: [100, [Validators.required, Validators.min(1)]],
    eatenAt: [''],
  });

  ngOnInit(): void {
    this.nutrition.foods({ limit: 200 }).subscribe((r) => this.foods.set(r.items));
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      foodId: v.foodId,
      mealType: v.mealType,
      quantityG: Number(v.quantityG),
      eatenAt: v.eatenAt ? `${todayISO()}T${v.eatenAt}` : undefined,
    });
  }
}

// ---------------- Dialog: Crear/editar alimento ----------------
@Component({
  selector: 'pz-food-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">
      {{ data?.id ? 'Editar alimento' : 'Nuevo alimento' }}
    </h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:420px">
      <div class="row2">
        <mat-form-field appearance="outline"
          ><mat-label>Nombre</mat-label><input matInput formControlName="name"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Categoría</mat-label
          ><mat-select formControlName="category">
            @for (c of FOOD_CATEGORIES; track c.value) {
              <mat-option [value]="c.value">{{ c.label }}</mat-option>
            }
          </mat-select></mat-form-field
        >
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"
          ><mat-label>Porción (gr)</mat-label
          ><input matInput type="number" formControlName="servingSizeG"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Calorías</mat-label><input matInput type="number" formControlName="calories"
        /></mat-form-field>
      </div>
      <div class="row3">
        <mat-form-field appearance="outline"
          ><mat-label>Proteína (gr)</mat-label
          ><input matInput type="number" formControlName="protein"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Carbos (gr)</mat-label><input matInput type="number" formControlName="carbs"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Grasas (gr)</mat-label><input matInput type="number" formControlName="fats"
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
    .row3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
  `,
})
export class FoodDialog {
  readonly FOOD_CATEGORIES = FOOD_CATEGORIES;
  private readonly dialogRef = inject(MatDialogRef<FoodDialog>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['protein', Validators.required],
    servingSizeG: [100, [Validators.required, Validators.min(1)]],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    carbs: [0, [Validators.required, Validators.min(0)]],
    fats: [0, [Validators.required, Validators.min(0)]],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data?: Food) {
    if (data) this.form.patchValue({ ...data });
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name,
      category: v.category,
      servingSizeG: Number(v.servingSizeG),
      calories: Number(v.calories),
      protein: Number(v.protein),
      carbs: Number(v.carbs),
      fats: Number(v.fats),
    });
  }
}
