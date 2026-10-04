import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './layouts/shell/shell.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'assistant',
        loadComponent: () =>
          import('./pages/assistant/assistant.component').then((m) => m.AssistantComponent),
      },
      {
        path: 'memberships',
        loadComponent: () =>
          import('./pages/memberships/memberships.component').then((m) => m.MembershipsComponent),
        canActivate: [roleGuard(['admin', 'receptionist', 'trainer'])],
      },
      {
        path: 'memberships/my',
        loadComponent: () =>
          import('./pages/memberships/my-membership.component').then(
            (m) => m.MyMembershipComponent,
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/payments/payments.component').then((m) => m.PaymentsComponent),
        canActivate: [roleGuard(['admin', 'receptionist', 'trainer'])],
      },
      {
        path: 'payments/my',
        loadComponent: () =>
          import('./pages/payments/my-payments.component').then((m) => m.MyPaymentsComponent),
      },
      {
        path: 'exercises',
        loadComponent: () =>
          import('./pages/exercises/exercises.component').then((m) => m.ExercisesComponent),
      },
      {
        path: 'routines',
        loadComponent: () =>
          import('./pages/routines/routines.component').then((m) => m.RoutinesComponent),
      },
      {
        path: 'routines/new',
        loadComponent: () =>
          import('./pages/routines/routine-form.component').then((m) => m.RoutineFormComponent),
        canActivate: [roleGuard(['admin', 'trainer'])],
      },
      {
        path: 'routines/:id/edit',
        loadComponent: () =>
          import('./pages/routines/routine-form.component').then((m) => m.RoutineFormComponent),
        canActivate: [roleGuard(['admin', 'trainer'])],
      },
      {
        path: 'routines/:id',
        loadComponent: () =>
          import('./pages/routines/routine-detail.component').then((m) => m.RoutineDetailComponent),
      },
      {
        path: 'classes',
        loadComponent: () =>
          import('./pages/classes/classes.component').then((m) => m.ClassesComponent),
      },
      {
        path: 'classes/my',
        loadComponent: () =>
          import('./pages/classes/my-bookings.component').then((m) => m.MyBookingsComponent),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./pages/attendance/attendance.component').then((m) => m.AttendanceComponent),
      },
      {
        path: 'nutrition',
        loadComponent: () =>
          import('./pages/nutrition/nutrition.component').then((m) => m.NutritionComponent),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/inventory/inventory.component').then((m) => m.InventoryComponent),
        canActivate: [roleGuard(['admin', 'trainer', 'receptionist'])],
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then((m) => m.UsersComponent),
        canActivate: [roleGuard(['admin', 'trainer', 'receptionist'])],
      },
      {
        path: 'gyms',
        loadComponent: () => import('./pages/gyms/gyms.component').then((m) => m.GymsComponent),
        canActivate: [roleGuard(['admin'])],
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'marketing',
        loadComponent: () =>
          import('./pages/marketing/marketing.component').then((m) => m.MarketingComponent),
        canActivate: [roleGuard(['admin'])],
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/reports.component').then((m) => m.ReportsComponent),
        canActivate: [roleGuard(['admin'])],
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
