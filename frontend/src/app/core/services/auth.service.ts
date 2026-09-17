import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { AuthUser, LoginResponse, User, UserProfile } from '../models/models';

const USER_KEY = 'pz_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthUser | null>(this.loadUser());
  readonly isSuperAdmin = computed(() => this.user()?.isSuperAdmin === true);

  constructor(
    private api: ApiService,
    private token: TokenService,
    private router: Router,
  ) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    gymId: string;
  }): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/register', payload).pipe(tap((res) => this.setSession(res)));
  }

  refreshTokens(): Observable<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return this.api
      .post<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/refresh', {
        refreshToken: this.token.refresh,
      })
      .pipe(tap((res) => this.token.setTokens(res.accessToken, res.refreshToken)));
  }

  me(): Observable<User> {
    return this.api.get<User>('/auth/me');
  }

  logout(refreshToken: string): Observable<void> {
    return this.api.post<void>('/auth/logout', { refreshToken });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
  }

  updateProfile(payload: Partial<UserProfile>): Observable<UserProfile> {
    return this.api.patch<UserProfile>('/users/me/profile', payload);
  }

  getProfile(): Observable<UserProfile> {
    return this.api.get<UserProfile>('/users/me/profile');
  }

  setSession(res: LoginResponse): void {
    this.token.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
    this.user.set(res.user);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }

  updateStoredUser(user: AuthUser): void {
    this.user.set(user);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  doLogout(): void {
    const refresh = this.token.refresh;
    const token = this.token.access;
    if (token && refresh) {
      this.logout(refresh).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      });
    } else {
      this.clearSession();
    }
    this.router.navigate(['/auth/login']);
  }

  clearSession(): void {
    this.token.clear();
    this.user.set(null);
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}