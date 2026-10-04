import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AuthService } from '../../core/services/auth.service';
import { AiService, ChatTurn } from '../../core/services/ai.service';

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

  send(text = this.draft().trim()): void {
    const content = text;
    if (!content || this.sending()) return;
    this.draft.set('');
    this.messages.update((m) => [...m, { role: 'user', content }]);
    this.sending.set(true);
    this.scrollBottom();

    this.ai.chat(content, this.sessionId, this.buildContext()).subscribe({
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

  private buildContext(): Record<string, unknown> {
    const u = this.auth.user();
    return {
      userId: u?.id,
      role: u?.role,
      name: u ? `${u.firstName} ${u.lastName}` : undefined,
      gymId: u?.gymId,
    };
  }

  private scrollBottom(): void {
    setTimeout(() => {
      this.scroller()?.nativeElement.scrollTo({ top: 999999, behavior: 'smooth' });
    }, 0);
  }
}
