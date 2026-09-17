import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { Paginated, User, UserProfile } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<User>> {
    return this.api.list<User>('/users', query);
  }

  get(id: string): Observable<User> {
    return this.api.get<User>(`/users/${id}`);
  }

  create(payload: Record<string, unknown>): Observable<User> {
    return this.api.post<User>('/users', payload);
  }

  update(id: string, payload: Partial<User>): Observable<User> {
    return this.api.patch<User>(`/users/${id}`, payload);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/users/${id}`);
  }

  profileOf(id: string): Observable<UserProfile> {
    return this.api.get<UserProfile>(`/users/${id}/profile`);
  }

  updateProfileOf(id: string, payload: Partial<UserProfile>): Observable<UserProfile> {
    return this.api.patch<UserProfile>(`/users/${id}/profile`, payload);
  }
}