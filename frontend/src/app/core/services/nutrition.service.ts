import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { Food, NutritionLog, NutritionSummary, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class NutritionService {
  constructor(private api: ApiService) {}

  foods(query?: Query): Observable<Paginated<Food>> {
    return this.api.list<Food>('/nutrition/foods', query);
  }

  createFood(payload: Partial<Food>): Observable<Food> {
    return this.api.post<Food>('/nutrition/foods', payload);
  }

  updateFood(id: string, payload: Partial<Food>): Observable<Food> {
    return this.api.patch<Food>(`/nutrition/foods/${id}`, payload);
  }

  removeFood(id: string): Observable<{ message: string }> {
    return this.api.delete(`/nutrition/foods/${id}`);
  }

  logs(query?: Query): Observable<Paginated<NutritionLog>> {
    return this.api.list<NutritionLog>('/nutrition/logs', query);
  }

  dailySummary(date?: string, userId?: string): Observable<NutritionSummary> {
    return this.api.get<NutritionSummary>('/nutrition/summary/daily', { date, userId });
  }

  createLog(payload: {
    foodId: string;
    mealType: string;
    quantityG: number;
    eatenAt?: string;
  }): Observable<NutritionLog> {
    return this.api.post<NutritionLog>('/nutrition/logs', payload);
  }

  removeLog(id: string): Observable<{ message: string }> {
    return this.api.delete(`/nutrition/logs/${id}`);
  }
}
