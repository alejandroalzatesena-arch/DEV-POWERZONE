import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from '../models/models';

export interface Query {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  [key: string]: string | number | boolean | undefined;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(path: string, query?: Query, withCredentials = false): Observable<T> {
    return this.http.get<T>(`/api${path}`, { params: this.params(query), withCredentials });
  }

  post<T>(path: string, body?: unknown, withCredentials = false): Observable<T> {
    return this.http.post<T>(`/api${path}`, body ?? {}, { withCredentials });
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`/api${path}`, body ?? {});
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<T>(`/api${path}`, body ?? {});
  }

  delete<T = { message: string }>(path: string): Observable<T> {
    return this.http.delete<T>(`/api${path}`);
  }

  list<T>(path: string, query?: Query): Observable<Paginated<T>> {
    return this.get<Paginated<T>>(path, query);
  }

  private params(query?: Query): HttpParams {
    let p = new HttpParams();
    if (!query) return p;
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        p = p.set(k, String(v));
      }
    }
    return p;
  }
}