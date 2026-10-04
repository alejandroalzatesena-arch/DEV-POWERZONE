import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ClassesService } from '../../core/services/classes.service';
import { ToastService } from '../../core/services/toast.service';
import { ClassBooking } from '../../core/models/models';
import { formatDate, timeOnly, bookingStatus, initials } from '../../shared/utils/labels';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatPaginatorModule,
    DatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss',
})
export class MyBookingsComponent implements OnInit {
  private readonly classes = inject(ClassesService);
  private readonly toast = inject(ToastService);

  readonly rows = signal<ClassBooking[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  page = 0;
  limit = 10;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.classes.myBookings({ page: this.page + 1, limit: this.limit }).subscribe({
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

  cancel(b: ClassBooking): void {
    this.classes.cancelBooking(b.classId).subscribe({
      next: () => {
        this.toast.success('Reserva cancelada');
        this.load();
      },
      error: () => undefined,
    });
  }

  isUpcoming(b: ClassBooking): boolean {
    return new Date(b.class?.startTime ?? 0) > new Date();
  }

  protected readonly formatDate = formatDate;
  protected readonly timeOnly = timeOnly;
  protected readonly bookingStatus = bookingStatus;
  protected readonly initials = initials;
}
