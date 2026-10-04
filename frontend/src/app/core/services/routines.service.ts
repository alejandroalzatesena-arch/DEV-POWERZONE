import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { Paginated, Routine } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RoutinesService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<Routine>> {
    return this.api.list<Routine>('/routines', query);
  }

  mine(query?: Query): Observable<Paginated<Routine>> {
    return this.api.list<Routine>('/routines/mine', query);
  }

  get(id: string): Observable<Routine> {
    return this.api.get<Routine>(`/routines/${id}`);
  }

  create(payload: Partial<Routine>): Observable<Routine> {
    return this.api.post<Routine>('/routines', payload);
  }

  generate(payload: {
    userId: string;
    objective: string;
    daysPerWeek: number;
    difficulty?: number;
    useAI?: boolean;
  }): Observable<Routine> {
    return this.api.post<Routine>('/routines/generate', payload);
  }

  update(id: string, payload: Partial<Routine>): Observable<Routine> {
    return this.api.patch<Routine>(`/routines/${id}`, payload);
  }

  assign(id: string, userId: string): Observable<Routine> {
    return this.api.patch<Routine>(`/routines/${id}/assign`, { userId });
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/routines/${id}`);
  }
}
