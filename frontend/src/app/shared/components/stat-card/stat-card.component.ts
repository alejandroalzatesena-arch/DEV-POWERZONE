import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'pz-stat-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="pz-stat" [class.trend-down]="trend() === 'down'">
      <div class="top">
        <span class="icon" [style.background]="iconBg()">
          <mat-icon>{{ icon() }}</mat-icon>
        </span>
        @if (badge()) {
          <span class="mini-badge" [class.down]="trend() === 'down'">{{ trendLabel() }}</span>
        }
      </div>
      <div class="label">{{ label() }}</div>
      <div class="value pz-display">{{ value() }}</div>
      @if (hint()) {
        <div class="hint">{{ hint() }}</div>
      }
      @if (progress() != null) {
        <div class="pz-olbar" style="margin-top:12px">
          <span [style.width.%]="progress()"></span>
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .pz-stat {
      background: var(--pz-surface);
      border: 1px solid var(--pz-border);
      border-radius: var(--pz-radius);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .pz-stat::after {
      content: '';
      position: absolute;
      right: -30px;
      top: -30px;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(200, 255, 61, 0.12), transparent 70%);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
    }
    .icon mat-icon {
      color: #10130a;
    }
    .mini-badge {
      font-family: 'Oswald', sans-serif;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(53, 208, 127, 0.15);
      color: var(--pz-success);
      border: 1px solid rgba(53, 208, 127, 0.35);
      &.down {
        background: rgba(255, 77, 94, 0.15);
        color: var(--pz-danger);
        border-color: rgba(255, 77, 94, 0.35);
      }
    }
    .label {
      color: var(--pz-muted);
      font-family: 'Oswald', sans-serif;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 12px;
    }
    .value {
      font-size: 40px;
      margin-top: 4px;
      color: var(--pz-white);
    }
    .hint {
      color: var(--pz-muted-2);
      font-size: 12px;
      margin-top: 4px;
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('trending_up');
  readonly iconBg = input('var(--pz-volt)');
  readonly badge = input<string>('');
  readonly trend = input<'up' | 'down'>('up');
  readonly hint = input<string>('');
  readonly progress = input<number | null>(null);

  trendLabel(): string {
    return this.trend() === 'up' ? `+${this.badge()}` : `-${this.badge()}`;
  }
}
