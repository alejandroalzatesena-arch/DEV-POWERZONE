import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { Paginated, Payment } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<Payment>> {
    return this.api.list<Payment>('/payments', query);
  }

  mine(query?: Query): Observable<Paginated<Payment>> {
    return this.api.list<Payment>('/payments/my', query);
  }

  get(id: string): Observable<Payment> {
    return this.api.get<Payment>(`/payments/${id}`);
  }

  create(payload: {
    userId: string;
    membershipTypeId?: string;
    amount: number;
    currency?: string;
    paymentMethod?: string;
    transactionId?: string;
    metadata?: Record<string, unknown>;
  }): Observable<Payment> {
    return this.api.post<Payment>('/payments', payload);
  }

  checkout(payload: { membershipTypeId: string; userId?: string; successUrl?: string; cancelUrl?: string }): Observable<{ url: string; paymentId: string }> {
    return this.api.post<{ url: string; paymentId: string }>('/payments/checkout', payload);
  }

  mockConfirm(paymentId: string): Observable<Payment> {
    return this.api.post<Payment>(`/payments/mock-checkout/${paymentId}/confirm`, {});
  }
}