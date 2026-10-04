import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/services/auth.service';
import { GymsService } from '../../../core/services/gyms.service';
import { ToastService } from '../../../core/services/toast.service';
import { Gym } from '../../../core/models/models';
import { isValidUUID } from '../../../shared/utils/labels';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatProgressBarModule,
    RouterLink,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private gyms = inject(GymsService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(false);
  readonly hidePassword = signal(true);
  readonly gymsAvailable = signal<Gym[]>([]);
  readonly manualGym = signal(false);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: [''],
    gymId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.gyms.list().subscribe({
      next: (res) => {
        this.gymsAvailable.set(res.items);
        if (res.items.length === 1) this.form.patchValue({ gymId: res.items[0].id });
      },
      error: () => {
        this.manualGym.set(true);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    if (this.manualGym() && !isValidUUID(this.form.value.gymId ?? '')) {
      this.toast.error('El ID de la sucursal no es válido');
      return;
    }
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.auth.register(v).subscribe({
      next: () => {
        this.toast.success('¡Cuenta creada con éxito!');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.loading.set(false),
    });
  }
}
