import { Component, input } from '@angular/core';

@Component({
  selector: 'pz-page-header',
  standalone: true,
  template: `
    <div class="pz-page-head">
      <div>
        @if (eyebrow()) {
          <div class="pz-eyebrow">{{ eyebrow() }}</div>
        }
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
}
