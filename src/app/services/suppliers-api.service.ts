import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { SupplierSaveRequest, SupplierUpdateRequest } from '../models/suppliers-request';
import { SupplierResponse } from '../models/suppliers-response';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class SuppliersApiService {
  private readonly resource = '/suppliers';

  constructor(private readonly baseService: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<SupplierResponse>> {
    return this.baseService.get<PaginatedResponse<SupplierResponse>>(this.resource, { params });
  }

  findOne(id: number): Observable<SupplierResponse> {
    return this.baseService.get<SupplierResponse>(`${this.resource}/${id}`);
  }

  create(payload: SupplierSaveRequest): Observable<SupplierResponse> {
    return this.baseService.post<SupplierResponse>(this.resource, payload);
  }

  update(id: number, payload: SupplierUpdateRequest): Observable<SupplierResponse> {
    return this.baseService.patch<SupplierResponse>(`${this.resource}/${id}`, payload);
  }

  remove(id: number): Observable<{ ok: boolean; message: string }> {
    return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/bulk-delete`, {
      body: { ids },
    });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.baseService.patch<{ ok: boolean; message: string }>(`${this.resource}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.baseService.patch<{ ok: boolean; message: string }>(`${this.resource}/bulk-restore`, { ids });
  }
}
