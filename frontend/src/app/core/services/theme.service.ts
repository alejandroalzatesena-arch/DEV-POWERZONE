import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pz-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(true);
  private readonly meta = this.getMetaTheme();

  constructor() {
    const stored = this.stored();
    this.isDark.set(stored ? stored === 'dark' : !this.prefersLight());
    this.apply();
  }

  toggle(): void {
    this.isDark.update((d) => !d);
    this.apply();
  }

  private stored(): Theme | null {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  }

  private prefersLight(): boolean {
    return typeof matchMedia === 'function'
      ? matchMedia('(prefers-color-scheme: light)').matches
      : false;
  }

  private apply(): void {
    const root = document.documentElement;
    const light = !this.isDark();
    if (light) {
      root.dataset['theme'] = 'light';
      localStorage.setItem(STORAGE_KEY, 'light');
    } else {
      delete root.dataset['theme'];
      localStorage.setItem(STORAGE_KEY, 'dark');
    }
    this.meta?.setAttribute('content', light ? '#f2f4f7' : '#0e1116');
  }

  private getMetaTheme(): Element | null {
    return document.querySelector('meta[name="theme-color"]');
  }
}
