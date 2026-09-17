import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { AppNotification } from '../../core/models/models';
import { formatDateTime, notificationType, NOTIFICATION_TYPES, initials } from '../../shared/utils/labels';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatPaginatorModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  private readonly notifications = inject(NotificationsService);
  private readonly toast = inject(ToastService);

  readonly rows = signal<AppNotification[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly unread = signal(0);
  readonly filter = signal('');

  page = 0;
  limit = 20;

  ngOnInit(): void {
    this.load();
    this.reloadUnread();
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.filter()) query['isRead'] = this.filter();
    this.notifications.mine(query).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  reloadUnread(): void {
    this.notifications.unreadCount().subscribe({
      next: (r) => {
        this.unread.set(r.unread);
        this.notifications.setUnread(r.unread);
      },
      error: () => undefined,
    });
  }

  applyFilter(f: string): void {
    this.filter.set(f);
    this.page = 0;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.load();
  }

  markRead(n: AppNotification): void {
    if (n.isRead) return;
    this.notifications.markRead(n.id).subscribe({
      next: () => {
        this.notifications.decrementUnread();
        this.updateRow(n.id, { isRead: true });
        this.reloadUnread();
      },
      error: () => undefined,
    });
  }

  markAll(): void {
    this.notifications.markAllRead().subscribe({
      next: () => {
        this.toast.success('Todas las notificaciones marcadas como leídas');
        this.rows.update((rs) => rs.map((x) => ({ ...x, isRead: true })));
        this.unread.set(0);
        this.notifications.setUnread(0);
      },
      error: () => undefined,
    });
  }

  remove(n: AppNotification): void {
    this.notifications.remove(n.id).subscribe({
      next: () => {
        if (!n.isRead) {
          this.notifications.decrementUnread();
          this.reloadUnread();
        }
        this.rows.update((rs) => rs.filter((x) => x.id !== n.id));
        this.total.update((t) => Math.max(0, t - 1));
      },
      error: () => undefined,
    });
  }

  private updateRow(id: string, patch: Partial<AppNotification>): void {
    this.rows.update((rs) => rs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  protected readonly formatDateTime = formatDateTime;
  protected readonly notificationType = notificationType;
  protected readonly NOTIFICATION_TYPES = NOTIFICATION_TYPES;
  protected readonly initials = initials;
}