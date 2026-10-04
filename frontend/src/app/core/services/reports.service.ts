import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private api: ApiService) {}

  financial(from?: string, to?: string): Observable<Record<string, unknown>> {
    return this.api.get<Record<string, unknown>>('/reports/financial', { from, to });
  }

  operational(): Observable<Record<string, unknown>> {
    return this.api.get<Record<string, unknown>>('/reports/operational');
  }

  memberships(): Observable<Record<string, unknown>> {
    return this.api.get<Record<string, unknown>>('/reports/memberships');
  }

  attendance(from?: string, to?: string): Observable<Record<string, unknown>> {
    return this.api.get<Record<string, unknown>>('/reports/attendance', { from, to });
  }

  progress(userId: string): Observable<Record<string, unknown>> {
    return this.api.get<Record<string, unknown>>(`/reports/progress/${userId}`);
  }
}
