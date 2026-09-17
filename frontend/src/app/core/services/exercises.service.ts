import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { Exercise, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ExercisesService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<Exercise>> {
    return this.api.list<Exercise>('/exercises', query);
  }

  get(id: string): Observable<Exercise> {
    return this.api.get<Exercise>(`/exercises/${id}`);
  }

  create(payload: Partial<Exercise>): Observable<Exercise> {
    return this.api.post<Exercise>('/exercises', payload);
  }

  update(id: string, payload: Partial<Exercise>): Observable<Exercise> {
    return this.api.patch<Exercise>(`/exercises/${id}`, payload);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/exercises/${id}`);
  }
}