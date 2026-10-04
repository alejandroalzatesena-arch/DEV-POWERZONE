import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { AttendanceRecord, Occupancy, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private api: ApiService) {}

  checkIn(userId: string, method = 'member_card'): Observable<AttendanceRecord> {
    return this.api.post<AttendanceRecord>(`/attendance/check-in/${userId}`, { method });
  }

  checkOut(userId: string, method = 'member_card'): Observable<AttendanceRecord> {
    return this.api.post<AttendanceRecord>(`/attendance/check-out/${userId}`, { method });
  }

  classAttendance(classId: string, method = 'manual'): Observable<AttendanceRecord> {
    return this.api.post<AttendanceRecord>('/attendance/class', { classId, method });
  }

  history(query?: Query): Observable<Paginated<AttendanceRecord>> {
    return this.api.list<AttendanceRecord>('/attendance/history', query);
  }

  mine(query?: Query): Observable<Paginated<AttendanceRecord>> {
    return this.api.list<AttendanceRecord>('/attendance/my', query);
  }

  occupancy(gymId: string): Observable<Occupancy> {
    return this.api.get<Occupancy>(`/attendance/occupancy/${gymId}`);
  }
}
