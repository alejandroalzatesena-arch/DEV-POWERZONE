import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(false);
  readonly hidePassword = signal(true);

  form = this.fb.nonNullable.group({
    email: ['superadmin@powerzone.app', [Validators.required, Validators.email]],
    password: ['PowerZone2024!', [Validators.required]],
  });

  demoAccounts = [
    { email: 'superadmin@powerzone.app', label: 'Super Admin', icon: 'admin_panel_settings' },
    { email: 'admin@powerzone.app', label: 'Administrador', icon: 'admin_panel_settings' },
    { email: 'trainer@powerzone.app', label: 'Entrenador', icon: 'fitness_center' },
    { email: 'reception@powerzone.app', label: 'Recepcionista', icon: 'support_agent' },
    { email: 'client@powerzone.app', label: 'Cliente', icon: 'person' },
  ];

  useDemo(email: string): void {
    this.form.patchValue({ email, password: 'PowerZone2024!' });
    this.submit();
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.toast.success('¡Bienvenido de nuevo!');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.loading.set(false),
    });
  }
}
