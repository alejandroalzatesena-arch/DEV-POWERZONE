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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PaymentsService } from '../../core/services/payments.service';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Payment, User } from '../../core/models/models';
import {
  formatMoney,
  formatDate,
  paymentStatus,
  paymentMethodLabel,
  initials,
  PAYMENT_METHODS,
} from '../../shared/utils/labels';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly payments = inject(PaymentsService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Payment[]>([]);
  readonly clients = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly statusFilter = signal('');
  readonly search = signal('');

  columns: string[] = ['client', 'concept', 'amount', 'method', 'status', 'date'];
  page = 0;
  limit = 15;

  get totals(): { amount: number; count: number } {
    const succ = this.rows().filter((p) => p.status === 'succeeded');
    return {
      amount: succ.reduce((a, p) => a + p.amount, 0),
      count: succ.length,
    };
  }

  ngOnInit(): void {
    this.load();
    this.usersService.list({ role: 'client', limit: 200 }).subscribe({
      next: (r) => this.clients.set(r.items),
      error: () => undefined,
    });
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.statusFilter()) query['status'] = this.statusFilter();
    if (this.search()) query['search'] = this.search();
    this.payments.list(query).subscribe({
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

  setStatus(s: string): void {
    this.statusFilter.set(s);
    this.page = 0;
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page = 0;
    this.load();
  }

  canRegister(): boolean {
    return ['admin', 'receptionist'].includes(this.auth.user()?.role ?? '');
  }

  createPayment(): void {
    const ref = this.dialog.open(CreatePaymentDialog, {
      data: { clients: this.clients() },
      width: '520px',
    });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.payments.create(res).subscribe({
        next: () => {
          this.toast.success('Pago registrado');
          this.load();
        },
        error: () => undefined,
      });
    });
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly paymentStatus = paymentStatus;
  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly initials = initials;
}

@Component({
  selector: 'pz-create-payment-dialog',
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
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">Registrar pago</h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:440px">
      <mat-form-field appearance="outline">
        <mat-label>Cliente</mat-label>
        <mat-select formControlName="userId">
          @for (c of clients; track c.id) {
            <mat-option [value]="c.id">{{ c.fullName }} ({{ c.email }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <div class="row3">
        <mat-form-field appearance="outline"
          ><mat-label>Monto</mat-label><input matInput type="number" formControlName="amount"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Moneda</mat-label><input matInput formControlName="currency"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Método</mat-label>
          <mat-select formControlName="paymentMethod">
            @for (m of methods; track m.value) {
              <mat-option [value]="m.value">{{ m.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Transacción (opcional)</mat-label>
        <input matInput formControlName="transactionId" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Notas / metadata</mat-label>
        <input matInput formControlName="notes" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">
        Registrar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .row3 {
      display: grid;
      grid-template-columns: 1fr 0.8fr 1fr;
      gap: 10px;
    }
  `,
})
export class CreatePaymentDialog {
  readonly form = new FormBuilder().nonNullable.group({
    userId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['usd'],
    paymentMethod: ['cash'],
    transactionId: [''],
    notes: [''],
  });
  private readonly dialogRef = inject(MatDialogRef<CreatePaymentDialog>);
  protected readonly methods = PAYMENT_METHODS;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { clients: User[] }) {}

  get clients(): User[] {
    return this.data?.clients ?? [];
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      userId: v.userId,
      amount: Number(v.amount),
      currency: v.currency,
      paymentMethod: v.paymentMethod,
      transactionId: v.transactionId || undefined,
      metadata: v.notes ? { notes: v.notes } : undefined,
    });
  }
}
