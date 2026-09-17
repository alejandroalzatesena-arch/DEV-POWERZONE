import { Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PaymentsService } from '../../core/services/payments.service';
import { Payment } from '../../core/models/models';
import { formatMoney, formatDate, paymentStatus, paymentMethodLabel } from '../../shared/utils/labels';

@Component({
  selector: 'app-my-payments',
  standalone: true,
  imports: [MatIconModule, MatCardModule, MatTableModule, MatPaginatorModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './my-payments.component.html',
  styleUrl: '../payments/payments.component.scss',
})
export class MyPaymentsComponent implements OnInit {
  private readonly payments = inject(PaymentsService);

  readonly rows = signal<Payment[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  columns: string[] = ['concept', 'amount', 'method', 'status', 'date'];
  page = 0;
  limit = 10;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.payments.mine({ page: this.page + 1, limit: this.limit }).subscribe({
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

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly paymentStatus = paymentStatus;
  protected readonly paymentMethodLabel = paymentMethodLabel;
}