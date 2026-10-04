import {
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { UpperCasePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { SocketService } from '../../core/services/socket.service';
import { AppNotification } from '../../core/models/models';
import { initials, formatDateTime } from '../../shared/utils/labels';

export interface NavGroup {
  group?: string;
  label?: string;
  icon?: string;
  path?: string;
  roles?: string[];
  items?: NavGroup[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    UpperCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly notificationsService = inject(NotificationsService);
  readonly socket = inject(SocketService);
  readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly user = this.auth.user;
  readonly unreadCount = toSignal(this.notificationsService.unread$, { initialValue: 0 });
  protected readonly recent = signal<AppNotification[]>([]);
  protected readonly showMenu = signal<boolean | null>(null);
  protected readonly isMobile = signal(false);

  groups: NavGroup[] = [
    { label: 'Dashboard', icon: 'space_dashboard', path: '/dashboard' },
    { label: 'Asistente IA', icon: 'smart_toy', path: '/assistant' },
    {
      group: 'Mi cuenta',
      items: [
        {
          label: 'Mi membresía',
          icon: 'card_membership',
          path: '/memberships/my',
          roles: ['client'],
        },
        { label: 'Mis pagos', icon: 'receipt_long', path: '/payments/my', roles: ['client'] },
        { label: 'Mis reservas', icon: 'event_available', path: '/classes/my' },
      ],
    },
    {
      group: 'Operación',
      items: [
        {
          label: 'Membresías',
          icon: 'card_membership',
          path: '/memberships',
          roles: ['admin', 'receptionist', 'trainer'],
        },
        {
          label: 'Pagos',
          icon: 'payments',
          path: '/payments',
          roles: ['admin', 'receptionist', 'trainer'],
        },
        { label: 'Asistencia', icon: 'how_to_reg', path: '/attendance' },
        { label: 'Clases', icon: 'event', path: '/classes' },
        { label: 'Rutinas', icon: 'fitness_center', path: '/routines' },
        { label: 'Ejercicios', icon: 'sports_gymnastics', path: '/exercises' },
        { label: 'Nutrición', icon: 'restaurant', path: '/nutrition' },
        {
          label: 'Inventario',
          icon: 'inventory_2',
          path: '/inventory',
          roles: ['admin', 'trainer', 'receptionist'],
        },
        {
          label: 'Usuarios',
          icon: 'group',
          path: '/users',
          roles: ['admin', 'trainer', 'receptionist'],
        },
      ],
    },
    {
      group: 'Dirección',
      items: [
        { label: 'Sucursales', icon: 'storefront', path: '/gyms', roles: ['admin'] },
        { label: 'Marketing', icon: 'campaign', path: '/marketing', roles: ['admin'] },
        { label: 'Reportes', icon: 'monitoring', path: '/reports', roles: ['admin'] },
      ],
    },
  ];

  constructor() {
    this.breakpointObserver.observe([Breakpoints.XSmall, Breakpoints.Small]).subscribe((state) => {
      this.isMobile.set(state.matches);
      if (!state.matches) this.showMenu.set(null);
    });

    const me = this.auth.user();
    if (me) {
      this.notificationsService
        .unreadCount()
        .subscribe((c) => this.notificationsService.setUnread(c.unread));
      this.loadRecent();
      this.socket.connectNotifications(me.id, (data) => {
        const payload = data as AppNotification;
        this.notificationsService.bump();
        this.recent.update((r) => [payload, ...r].slice(0, 10));
      });
    }
  }

  visibleItems(items: NavGroup[] | undefined): NavGroup[] {
    if (!items) return [];
    const role = this.user()?.role;
    return items.filter(
      (i) =>
        !i.roles?.length || this.auth.isSuperAdmin() || (role ? i.roles.includes(role) : false),
    );
  }

  loadRecent(): void {
    this.notificationsService.mine({ limit: 10 }).subscribe((res) => this.recent.set(res.items));
  }

  toggleSidenav(): void {
    this.showMenu.update((v) => (v === null ? true : !v));
  }

  openNotifications(): void {
    this.showMenu.set(false);
    this.router.navigate(['/notifications']);
  }

  markRead(n: AppNotification): void {
    if (!n.isRead) {
      this.notificationsService.markRead(n.id).subscribe((upd) => {
        this.notificationsService.decrementUnread();
        this.recent.update((r) => r.map((x) => (x.id === n.id ? upd : x)));
      });
    }
  }

  markAll(): void {
    this.notificationsService.markAllRead().subscribe(() => {
      this.notificationsService.setUnread(0);
      this.recent.update((r) => r.map((x) => ({ ...x, isRead: true })));
    });
  }

  navigate(path: string): void {
    this.showMenu.set(false);
    this.router.navigate([path]);
  }

  logout(): void {
    this.auth.doLogout();
  }

  ngOnDestroy(): void {
    this.socket.disconnectNotifications();
  }

  protected readonly formatDateTime = formatDateTime;
  protected readonly initials = initials;
}
