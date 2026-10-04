import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { ClassBooking, GymClass, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ClassesService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<GymClass>> {
    return this.api.list<GymClass>('/classes', query);
  }

  upcoming(query?: Query): Observable<Paginated<GymClass>> {
    return this.api.list<GymClass>('/classes/upcoming', { limit: 50, ...query });
  }

  get(id: string): Observable<GymClass> {
    return this.api.get<GymClass>(`/classes/${id}`);
  }

  create(payload: Partial<GymClass>): Observable<GymClass> {
    return this.api.post<GymClass>('/classes', payload);
  }

  update(id: string, payload: Partial<GymClass>): Observable<GymClass> {
    return this.api.patch<GymClass>(`/classes/${id}`, payload);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/classes/${id}`);
  }

  book(id: string, allowWaitlist = true): Observable<ClassBooking> {
    return this.api.post<ClassBooking>(`/classes/${id}/book`, { allowWaitlist });
  }

  cancelBooking(id: string): Observable<{ message: string }> {
    return this.api.delete(`/classes/${id}/book`);
  }

  myBookings(query?: Query): Observable<Paginated<ClassBooking>> {
    return this.api.list<ClassBooking>('/classes/bookings/me', query);
  }

  classBookings(classId: string, query?: Query): Observable<Paginated<ClassBooking>> {
    return this.api.list<ClassBooking>(`/classes/bookings/${classId}`, query);
  }

  markAttendance(classId: string, userId: string, attended = true): Observable<ClassBooking> {
    return this.api.patch<ClassBooking>(`/classes/${classId}/attendance`, { userId, attended });
  }
}
