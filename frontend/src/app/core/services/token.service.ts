import { Injectable } from '@angular/core';

const ACCESS_KEY = 'pz_access_token';
const REFRESH_KEY = 'pz_refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem(ACCESS_KEY);
    this.refreshToken = localStorage.getItem(REFRESH_KEY);
  }

  get access(): string | null {
    return this.accessToken;
  }

  get refresh(): string | null {
    return this.refreshToken;
  }

  setTokens(access: string, refresh: string): void {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  setAccess(access: string): void {
    this.accessToken = access;
    localStorage.setItem(ACCESS_KEY, access);
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem('pz_user');
  }

  hasTokens(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }
}
