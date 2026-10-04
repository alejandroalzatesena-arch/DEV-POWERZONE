import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { AppNotification, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private unreadSubject = new BehaviorSubject<number>(0);
  readonly unread$ = this.unreadSubject.asObservable();

  constructor(private api: ApiService) {}

  setUnread(n: number): void {
    this.unreadSubject.next(n);
  }

  bump(): void {
    this.unreadSubject.next(this.unreadSubject.value + 1);
  }

  decrementUnread(): void {
    const next = Math.max(0, this.unreadSubject.value - 1);
    this.unreadSubject.next(next);
  }

  mine(query?: Query): Observable<Paginated<AppNotification>> {
    return this.api.list<AppNotification>('/notifications/mine', query);
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.api.get<{ unread: number }>('/notifications/unread-count');
  }

  markRead(id: string): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api.patch<{ updated: number }>('/notifications/read-all', {});
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/notifications/${id}`);
  }

  create(payload: {
    userId: string;
    type?: string;
    title: string;
    body?: string;
  }): Observable<AppNotification> {
    return this.api.post<AppNotification>('/notifications', payload);
  }

  sendMessage(payload: {
    userId: string;
    title: string;
    body: string;
  }): Observable<AppNotification> {
    return this.api.post<AppNotification>('/notifications/message', payload);
  }
}
