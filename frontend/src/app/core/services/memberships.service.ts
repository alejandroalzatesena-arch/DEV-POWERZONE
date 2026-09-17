import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { MembershipType, Paginated, UserMembership } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MembershipsService {
  constructor(private api: ApiService) {}

  types(): Observable<Paginated<MembershipType>> {
    return this.api.list<MembershipType>('/memberships/types', { limit: 100 });
  }

  createType(payload: Partial<MembershipType>): Observable<MembershipType> {
    return this.api.post<MembershipType>('/memberships/types', payload);
  }

  updateType(id: string, payload: Partial<MembershipType>): Observable<MembershipType> {
    return this.api.patch<MembershipType>(`/memberships/types/${id}`, payload);
  }

  removeType(id: string): Observable<{ message: string }> {
    return this.api.delete(`/memberships/types/${id}`);
  }

  list(query?: Query): Observable<Paginated<UserMembership>> {
    return this.api.list<UserMembership>('/memberships', query);
  }

  mine(): Observable<UserMembership | null> {
    return this.api.get<UserMembership | null>('/memberships/my');
  }

  assign(payload: { userId: string; membershipTypeId: string; price?: number; autoRenew?: boolean; notes?: string }): Observable<UserMembership> {
    return this.api.post<UserMembership>('/memberships/assign', payload);
  }

  renew(id: string): Observable<UserMembership> {
    return this.api.patch<UserMembership>(`/memberships/assign/${id}/renew`, {});
  }

  cancel(id: string): Observable<UserMembership> {
    return this.api.patch<UserMembership>(`/memberships/assign/${id}/cancel`, {});
  }
}