import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { MembershipsService } from '../../core/services/memberships.service';
import { PaymentsService } from '../../core/services/payments.service';
import { UserMembership, Payment } from '../../core/models/models';
import { formatMoney, formatDate, membershipStatus, paymentStatus } from '../../shared/utils/labels';

@Component({
  selector: 'app-my-membership',
  standalone: true,
  imports: [MatIconModule, MatCardModule, MatButtonModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './my-membership.component.html',
  styleUrl: './my-membership.component.scss',
})
export class MyMembershipComponent implements OnInit {
  private readonly memberships = inject(MembershipsService);
  private readonly payments = inject(PaymentsService);
  private readonly router = inject(Router);

  readonly membership = signal<UserMembership | null>(null);
  readonly paymentsList = signal<Payment[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.memberships.mine().subscribe({
      next: (m) => this.membership.set(m),
      error: () => undefined,
      complete: () => this.loading.set(false),
    });
    this.payments.mine({ limit: 10 }).subscribe({
      next: (r) => this.paymentsList.set(r.items),
      error: () => undefined,
    });
  }

  daysLeft(): number {
    const m = this.membership();
    if (!m) return 0;
    return Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000));
  }

  progress(): number {
    const m = this.membership();
    if (!m) return 0;
    const start = new Date(m.startDate).getTime();
    const end = new Date(m.endDate).getTime();
    if (end <= start) return 0;
    return Math.min(100, ((Date.now() - start) / (end - start)) * 100);
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly membershipStatus = membershipStatus;
  protected readonly paymentStatus = paymentStatus;
  protected readonly Math = Math;

  goClasses(): void {
    this.router.navigate(['/classes']);
  }
}