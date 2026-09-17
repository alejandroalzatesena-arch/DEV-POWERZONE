import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { Campaign, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<Campaign>> {
    return this.api.list<Campaign>('/marketing/campaigns', query);
  }

  get(id: string): Observable<Campaign> {
    return this.api.get<Campaign>(`/marketing/campaigns/${id}`);
  }

  create(payload: Partial<Campaign>): Observable<Campaign> {
    return this.api.post<Campaign>('/marketing/campaigns', payload);
  }

  update(id: string, payload: Partial<Campaign>): Observable<Campaign> {
    return this.api.patch<Campaign>(`/marketing/campaigns/${id}`, payload);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/marketing/campaigns/${id}`);
  }

  send(id: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`/marketing/campaigns/${id}/send`, {});
  }

  cancel(id: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`/marketing/campaigns/${id}/cancel`, {});
  }
}