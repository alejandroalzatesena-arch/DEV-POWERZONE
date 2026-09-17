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
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { InventoryService } from '../../core/services/inventory.service';
import { ToastService } from '../../core/services/toast.service';
import { InventoryItem, InventoryMaintenance } from '../../core/models/models';
import {
  formatDate,
  formatMoney,
  inventoryCategoryLabel,
  inventoryStatus,
  inventoryConditionLabel,
  maintenanceStatus,
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
} from '../../shared/utils/labels';

@Component({
  selector: 'app-inventory',
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
    StatCardComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<InventoryItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly category = signal('');

  lowStockCount = signal(0);
  maintenanceCount = signal(0);
  totalUnits = signal(0);

  page = 0;
  limit = 15;
  columns = ['name', 'category', 'quantity', 'condition', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
    this.inventory.list({ limit: 1000 }).subscribe({
      next: (r) => {
        this.totalUnits.set(r.items.reduce((acc, i) => acc + (i.quantity ?? 0), 0));
        this.lowStockCount.set(r.items.filter((i) => (i.availableQuantity ?? i.quantity) <= 2).length);
        this.maintenanceCount.set(r.items.filter((i) => i.status === 'maintenance').length);
      },
      error: () => undefined,
    });
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.search()) query['search'] = this.search();
    if (this.category()) query['category'] = this.category();
    this.inventory.list(query).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(cat?: string): void {
    if (cat !== undefined) this.category.set(cat);
    this.page = 0;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.load();
  }

  openItem(item?: InventoryItem): void {
    const ref = this.dialog.open(ItemDialog, { data: item, width: '560px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (item) {
        this.inventory.update(item.id, res).subscribe({ next: () => this.afterSave('Ítem actualizado'), error: () => undefined });
      } else {
        this.inventory.create(res).subscribe({ next: () => this.afterSave('Ítem creado'), error: () => undefined });
      }
    });
  }

  private afterSave(msg: string): void {
    this.toast.success(msg);
    this.load();
    this.ngOnInit();
  }

  remove(item: InventoryItem): void {
    this.inventory.remove(item.id).subscribe({
      next: () => this.afterSave('Ítem eliminado'),
      error: () => undefined,
    });
  }

  openMaintenance(item: InventoryItem): void {
    const ref = this.dialog.open(MaintenanceDialog, { data: item, width: '520px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.inventory.scheduleMaintenance(item.id, res).subscribe({
        next: () => this.afterSave('Mantenimiento programado'),
        error: () => undefined,
      });
    });
  }

  viewMaintenance(item: InventoryItem): void {
    this.dialog.open(MaintenanceHistoryDialog, { data: { item, service: this.inventory }, width: '640px' });
  }

  isLow(item: InventoryItem): boolean {
    return (item.availableQuantity ?? item.quantity) <= 2;
  }

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly inventoryCategoryLabel = inventoryCategoryLabel;
  protected readonly inventoryStatus = inventoryStatus;
  protected readonly inventoryConditionLabel = inventoryConditionLabel;
  protected readonly maintenanceStatus = maintenanceStatus;
  protected readonly INVENTORY_CATEGORIES = INVENTORY_CATEGORIES;
  protected readonly INVENTORY_CONDITIONS = INVENTORY_CONDITIONS;
}

// ---------------- Dialog: Item ----------------
@Component({
  selector: 'pz-item-dialog',
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">{{ data?.id ? 'Editar ítem' : 'Nuevo ítem' }}</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:480px">
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" placeholder="Mancuernas 10kg" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Categoría</mat-label><mat-select formControlName="category">
          @for (c of INVENTORY_CATEGORIES; track c.value) { <mat-option [value]="c.value">{{ c.label }}</mat-option> }
        </mat-select></mat-form-field>
      </div>
      <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Cantidad</mat-label><input matInput type="number" formControlName="quantity" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Disponibles</mat-label><input matInput type="number" formControlName="availableQuantity" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Condición</mat-label><mat-select formControlName="condition">
          @for (c of INVENTORY_CONDITIONS; track c.value) { <mat-option [value]="c.value">{{ c.label }}</mat-option> }
        </mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Costo reposición</mat-label><input matInput type="number" formControlName="replacementCost" /></mat-form-field>
      </div>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Ubicación</mat-label><input matInput formControlName="location" placeholder="Sala A" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Proveedor</mat-label><input matInput formControlName="supplier" /></mat-form-field>
      </div>
      <mat-form-field appearance="outline"><mat-label>Fecha de compra</mat-label><input matInput type="date" formControlName="purchased" /></mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}`,
})
export class ItemDialog {
  readonly INVENTORY_CATEGORIES = INVENTORY_CATEGORIES;
  readonly INVENTORY_CONDITIONS = INVENTORY_CONDITIONS;
  private readonly dialogRef = inject(MatDialogRef<ItemDialog>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    category: ['equipment', Validators.required],
    quantity: [1, [Validators.required, Validators.min(0)]],
    availableQuantity: [''],
    condition: ['good'],
    replacementCost: [''],
    location: [''],
    supplier: [''],
    purchased: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data?: InventoryItem) {
    if (data) {
      this.form.patchValue({
        name: data.name,
        description: data.description ?? '',
        category: data.category,
        quantity: data.quantity,
        availableQuantity: data.availableQuantity != null ? String(data.availableQuantity) : '',
        replacementCost: data.replacementCost != null ? String(data.replacementCost) : '',
        location: data.location ?? '',
        supplier: data.supplier ?? '',
        purchased: data.purchasedAt ? new Date(data.purchasedAt).toISOString().slice(0, 10) : '',
      });
    }
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name,
      description: v.description || undefined,
      category: v.category,
      quantity: Number(v.quantity),
      availableQuantity: v.availableQuantity ? Number(v.availableQuantity) : undefined,
      replacementCost: v.replacementCost ? Number(v.replacementCost) : undefined,
      location: v.location || undefined,
      supplier: v.supplier || undefined,
      purchasedAt: v.purchased ? new Date(v.purchased + 'T00:00:00').toISOString() : undefined,
    });
  }
}

// ---------------- Dialog: Mantenimiento ----------------
@Component({
  selector: 'pz-maintenance-dialog',
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">Programar mantenimiento</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:440px">
      <p style="color:var(--pz-muted);margin:0">Ítem: <strong style="color:var(--pz-white)">{{ data?.name }}</strong></p>
      <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Fecha programada</mat-label><input matInput type="date" formControlName="scheduled" /></mat-form-field>
      <div class="row2">
        <mat-form-field appearance="outline"><mat-label>Costo</mat-label><input matInput type="number" formControlName="cost" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Técnico</mat-label><input matInput formControlName="technician" /></mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">Programar</button>
    </mat-dialog-actions>
  `,
  styles: `.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}`,
})
export class MaintenanceDialog {
  private readonly dialogRef = inject(MatDialogRef<MaintenanceDialog>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    description: ['', Validators.required],
    scheduled: [new Date().toISOString().slice(0, 10), Validators.required],
    cost: [''],
    technician: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data?: InventoryItem) {
    if (data?.id) this.form.patchValue({ technician: data.supplier ?? '' });
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      description: v.description,
      scheduledAt: new Date(v.scheduled + 'T00:00:00').toISOString(),
      cost: v.cost ? Number(v.cost) : undefined,
      technician: v.technician || undefined,
    });
  }
}

// ---------------- Dialog: Historial de mantenimientos ----------------
@Component({
  selector: 'pz-maintenance-history-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">Mantenimientos · {{ data?.item?.name }}</h2>
    <mat-dialog-content style="padding:16px 24px;min-width:560px;max-height:60vh;overflow:auto">
      @for (m of history(); track m.id) {
        <div class="m-row">
          <span class="pz-badge" [class]="'badge-' + status(m.status).color">{{ status(m.status).label }}</span>
          <div style="flex:1">
            <div style="color:var(--pz-white);font-size:13.5px;font-weight:600">{{ m.description }}</div>
            <div style="color:var(--pz-muted);font-size:12px">
              {{ date(m.scheduledAt) }}{{ m.technician ? ' · ' + m.technician : '' }}{{ m.cost ? ' · ' + cost(m.cost) : '' }}
            </div>
          </div>
          @if (m.status !== 'completed') {
            <button mat-button class="pz-btn-ghost" (click)="complete(m)">Completar</button>
          }
        </div>
      } @empty {
        <p style="color:var(--pz-muted)">Sin mantenimientos registrados.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `.m-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:var(--pz-surface-2);border:1px solid var(--pz-border);margin-bottom:8px}`,
})
export class MaintenanceHistoryDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<MaintenanceHistoryDialog>);
  readonly history = signal<InventoryMaintenance[]>([]);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { item: InventoryItem; service: InventoryService }) {}

  ngOnInit(): void {
    this.data.service.maintenanceHistory(this.data.item.id).subscribe((r) => this.history.set(r.items));
  }

  complete(m: InventoryMaintenance): void {
    this.data.service.updateMaintenance(m.id, { status: 'completed', completedAt: new Date().toISOString() }).subscribe({
      next: () => {
        this.history.update((h) => h.map((x) => (x.id === m.id ? { ...x, status: 'completed' as const } : x)));
        this.dialogRef.close('changed');
      },
      error: () => undefined,
    });
  }

  protected readonly status = maintenanceStatus;
  protected readonly date = formatDate;
  protected readonly cost = formatMoney;
}