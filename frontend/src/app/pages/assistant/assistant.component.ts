import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AuthService } from '../../core/services/auth.service';
import { AiService, ChatTurn } from '../../core/services/ai.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { MembershipsService } from '../../core/services/memberships.service';
import { NutritionService } from '../../core/services/nutrition.service';
import { RoutinesService } from '../../core/services/routines.service';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeaderComponent,
  ],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss',
})
export class AssistantComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly memberships = inject(MembershipsService);
  private readonly routines = inject(RoutinesService);
  private readonly attendance = inject(AttendanceService);
  private readonly nutrition = inject(NutritionService);
  readonly auth = inject(AuthService);

  readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly messages = signal<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        'Hola, soy el asistente virtual de Power Zone. Pregúntame sobre clases, membresías, rutinas o nutrición.',
    },
  ]);
  readonly sending = signal(false);
  readonly aiStatus = signal<'checking' | 'ok' | 'unavailable'>('checking');
  readonly draft = signal('');

  readonly suggestions = [
    '¿Qué clases hay?',
    'Información sobre mi membresía',
    'Genera una rutina',
    'Consejos de nutrición',
  ];

  private readonly sessionId = `web-${this.auth.user()?.id ?? 'guest'}`;

  ngOnInit(): void {
    this.ai.health().subscribe({
      next: (r) => this.aiStatus.set(r.status === 'ok' ? 'ok' : 'unavailable'),
      error: () => this.aiStatus.set('unavailable'),
    });
  }

  async send(text = this.draft().trim()): Promise<void> {
    const content = text;
    if (!content || this.sending()) return;
    this.draft.set('');
    this.messages.update((m) => [...m, { role: 'user', content }]);
    this.sending.set(true);
    this.scrollBottom();

    const ctx = await this.buildContext();
    if (!this.sending()) return;

    this.ai.chat(content, this.sessionId, ctx).subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'assistant', content: r.reply }]);
        this.sending.set(false);
        this.scrollBottom();
      },
      error: () => {
        this.messages.update((m) => [
          ...m,
          {
            role: 'assistant',
            content: 'Ups, no pude comunicarme con el asistente. Intenta de nuevo.',
          },
        ]);
        this.sending.set(false);
        this.scrollBottom();
      },
    });
  }

  private async buildContext(): Promise<Record<string, unknown>> {
    const u = this.auth.user();
    const ctx: Record<string, unknown> = {
      userId: u?.id,
      role: u?.role,
      name: u ? `${u.firstName} ${u.lastName}` : undefined,
      gymId: u?.gymId,
    };
    const [membership, routines, attendance, nutrition] = await Promise.allSettled([
      firstValueFrom(this.memberships.mine()),
      firstValueFrom(this.routines.mine({ limit: 3 })),
      firstValueFrom(this.attendance.mine({ limit: 5 })),
      firstValueFrom(this.nutrition.dailySummary()),
    ]);
    if (membership.status === 'fulfilled' && membership.value) {
      ctx['membership'] = membership.value;
    }
    if (routines.status === 'fulfilled' && routines.value.items?.length) {
      ctx['routines'] = routines.value.items;
    }
    if (attendance.status === 'fulfilled' && attendance.value.items?.length) {
      ctx['recentAttendance'] = attendance.value.items;
    }
    if (nutrition.status === 'fulfilled' && nutrition.value) {
      ctx['nutritionToday'] = nutrition.value;
    }
    return ctx;
  }

  private scrollBottom(): void {
    setTimeout(() => {
      this.scroller()?.nativeElement.scrollTo({ top: 999999, behavior: 'smooth' });
    }, 0);
  }
}
