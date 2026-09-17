import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type ReportNode = {
  key: string;
  label: string;
  value?: string;
  badge?: 'success' | 'danger' | 'orange' | 'info';
  children?: ReportNode[];
};

@Component({
  selector: 'pz-node-tree',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="tree">
      @for (n of nodes(); track trackFn($index, n)) {
        <div class="branch">
          @if (!n.children || n.children.length === 0) {
            <div class="leaf">
              <span class="l-label">{{ n.label }}</span>
              <span class="l-value" [class.is-num]="isNumber(n.value)">
                @if (n.badge) {
                  <span class="pz-badge" [class]="'badge-' + n.badge">{{ n.badge === 'success' ? 'OK' : n.badge }}</span>
                }
                {{ n.value }}
              </span>
            </div>
          } @else {
            <details class="group" open>
              <summary>
                <mat-icon>arrow_drop_down</mat-icon>
                <span class="g-label">{{ n.label }}</span>
                <span class="g-count">{{ n.children.length }}</span>
              </summary>
              <div class="children">
                @for (c of n.children; track trackFn($index, c)) {
                  <div class="child-wrap">
                    @if (!c.children || c.children.length === 0) {
                      <div class="leaf">
                        <span class="l-label">{{ c.label }}</span>
                        <span class="l-value" [class.is-num]="isNumber(c.value)">{{ c.value }}</span>
                      </div>
                    } @else {
                      <pz-node-tree [nodes]="c.children" />
                    }
                  </div>
                }
              </div>
            </details>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .tree { display: grid; gap: 6px; }
    .group {
      border: 1px solid var(--pz-border);
      border-radius: 12px;
      background: var(--pz-surface);
      overflow: hidden;
    }
    .group summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      cursor: pointer;
      list-style: none;
      font-family: 'Oswald', sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--pz-white);
      background: var(--pz-surface-2);
    }
    .group summary::-webkit-details-marker { display: none; }
    .group summary mat-icon { color: var(--pz-volt); transition: transform 0.15s ease; }
    .group:not([open]) summary mat-icon { transform: rotate(-90deg); }
    .g-count {
      margin-left: auto;
      font-size: 11px;
      color: var(--pz-muted);
    }
    .children {
      display: grid;
      gap: 4px;
      padding: 8px;
    }
    .leaf {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 13px;
    }
    .leaf:hover { background: var(--pz-surface-2); }
    .l-label { color: var(--pz-muted); }
    .l-value { color: var(--pz-white); font-weight: 700; }
    .l-value.is-num { color: var(--pz-volt); font-family: 'Oswald', sans-serif; font-size: 15px; }
  `,
})
export class NodeTreeComponent {
  readonly nodes = input<ReportNode[]>([]);

  trackFn(index: number, node: ReportNode): string {
    return `${index}-${node.key}-${node.label}`;
  }

  isNumber(v?: string): boolean {
    return v != null && !Number.isNaN(Number(String(v).replace(/[^0-9.\-]/g, ''))) && v.trim() !== '';
  }
}