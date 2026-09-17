import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Gym, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class GymsService {
  constructor(private api: ApiService) {}

  list(): Observable<Paginated<Gym>> {
    return this.api.list<Gym>('/gyms', { limit: 100 });
  }

  get(id: string): Observable<Gym> {
    return this.api.get<Gym>(`/gyms/${id}`);
  }

  create(payload: Partial<Gym>): Observable<Gym> {
    return this.api.post<Gym>('/gyms', payload);
  }

  update(id: string, payload: Partial<Gym>): Observable<Gym> {
    return this.api.patch<Gym>(`/gyms/${id}`, payload);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/gyms/${id}`);
  }
}