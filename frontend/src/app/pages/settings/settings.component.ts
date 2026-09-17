import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { ActivityLevel, FitnessGoal, UserGender } from '../../core/models/models';
import { FITNESS_GOALS, ACTIVITY_LEVELS } from '../../shared/utils/labels';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly FITNESS_GOALS = FITNESS_GOALS;
  readonly ACTIVITY_LEVELS = ACTIVITY_LEVELS;

  profileForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    birthDate: [''],
    gender: [''],
    heightCm: [''],
    weightKg: [''],
    bodyFatPct: [''],
    goal: [''],
    activityLevel: [''],
    medicalConditions: [''],
  });

  passForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', Validators.required],
    },
    { validators: (g) => (g.get('newPassword')?.value !== g.get('confirm')?.value ? { mismatch: true } : null) },
  );

  saving = false;

  ngOnInit(): void {
    const me = this.auth.user();
    if (me) {
      this.profileForm.patchValue({
        firstName: me.firstName,
        lastName: me.lastName,
      });
      this.usersService.get(me.id).subscribe((u) => {
        this.profileForm.patchValue({
          phone: u.phone ?? '',
          birthDate: u.birthDate ? new Date(u.birthDate).toISOString().slice(0, 10) : '',
          gender: u.gender ?? '',
        });
      });
    }
    this.auth.getProfile().subscribe((p) => {
      this.profileForm.patchValue({
        heightCm: p.heightCm != null ? String(p.heightCm) : '',
        weightKg: p.weightKg != null ? String(p.weightKg) : '',
        bodyFatPct: p.bodyFatPct != null ? String(p.bodyFatPct) : '',
        goal: p.goal ?? '',
        activityLevel: p.activityLevel ?? '',
        medicalConditions: (p.medicalConditions ?? []).join(', '),
      });
    });
  }

  saveProfile(): void {
    const me = this.auth.user();
    if (!me) return;
    const v = this.profileForm.getRawValue();
    this.saving = true;
    this.usersService
      .update(me.id, {
        firstName: v.firstName,
        lastName: v.lastName,
        phone: v.phone || undefined,
        birthDate: v.birthDate ? new Date(v.birthDate + 'T00:00:00').toISOString() : undefined,
        gender: (v.gender || undefined) as UserGender | undefined,
      })
      .subscribe({
        next: () => {
          this.auth.updateStoredUser({ ...me, firstName: v.firstName, lastName: v.lastName });
          this.auth
            .updateProfile({
              heightCm: v.heightCm ? Number(v.heightCm) : undefined,
              weightKg: v.weightKg ? Number(v.weightKg) : undefined,
              bodyFatPct: v.bodyFatPct ? Number(v.bodyFatPct) : undefined,
              goal: (v.goal || undefined) as FitnessGoal | undefined,
              activityLevel: (v.activityLevel || undefined) as ActivityLevel | undefined,
              medicalConditions: v.medicalConditions ? v.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            })
            .subscribe({
              next: () => { this.toast.success('Perfil actualizado'); this.saving = false; },
              error: () => { this.saving = false; },
            });
        },
        error: () => { this.saving = false; },
      });
  }

  changePassword(): void {
    const v = this.passForm.getRawValue();
    this.auth.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada');
        this.passForm.reset();
      },
      error: () => undefined,
    });
  }
}