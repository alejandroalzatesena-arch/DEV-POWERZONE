import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, Query } from './api.service';
import { InventoryItem, InventoryMaintenance, Paginated } from '../models/models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private api: ApiService) {}

  list(query?: Query): Observable<Paginated<InventoryItem>> {
    return this.api.list<InventoryItem>('/inventory', query);
  }

  get(id: string): Observable<InventoryItem> {
    return this.api.get<InventoryItem>(`/inventory/${id}`);
  }

  create(payload: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.api.post<InventoryItem>('/inventory', payload);
  }

  update(id: string, payload: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.api.patch<InventoryItem>(`/inventory/${id}`, payload);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.api.delete(`/inventory/${id}`);
  }

  scheduleMaintenance(
    id: string,
    payload: { description: string; scheduledAt: string; cost?: number; technician?: string },
  ): Observable<InventoryMaintenance> {
    return this.api.post<InventoryMaintenance>(`/inventory/${id}/maintenance`, payload);
  }

  maintenanceHistory(id: string): Observable<Paginated<InventoryMaintenance>> {
    return this.api.list<InventoryMaintenance>(`/inventory/${id}/maintenance`, { limit: 100 });
  }

  updateMaintenance(
    maintenanceId: string,
    payload: Partial<InventoryMaintenance>,
  ): Observable<InventoryMaintenance> {
    return this.api.patch<InventoryMaintenance>(`/inventory/maintenance/${maintenanceId}`, payload);
  }

  removeMaintenance(maintenanceId: string): Observable<{ message: string }> {
    return this.api.delete(`/inventory/maintenance/${maintenanceId}`);
  }
}
