import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'pz-empty',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="pz-empty">
      <div class="pz-empty-icon">
        <mat-icon>{{ icon() }}</mat-icon>
      </div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (actionText()) {
        <button mat-raised-button class="pz-btn-volt" type="button" (click)="action()">
          <mat-icon>add</mat-icon>
          {{ actionText() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('insights');
  readonly title = input('Sin datos');
  readonly message = input('No hay información para mostrar.');
  readonly actionText = input('');
  readonly action = input<() => void>(() => undefined);
}
