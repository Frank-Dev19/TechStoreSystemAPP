import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
    CustomersSaveRequest,
    CustomersUpdateRequest,
} from '../models/customers/customers-request';
import { CustomersResponse } from '../models/customers/customers-response';

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
    private readonly resource = '/customers';

    constructor(private readonly baseService: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<CustomersResponse>> {
        return this.baseService.get<PaginatedResponse<CustomersResponse>>(this.resource, { params });
    }

    findOne(id: number): Observable<CustomersResponse> {
        return this.baseService.get<CustomersResponse>(`${this.resource}/${id}`);
    }

    create(payload: CustomersSaveRequest): Observable<CustomersResponse> {
        return this.baseService.post<CustomersResponse>(this.resource, payload);
    }

    update(id: number, payload: CustomersUpdateRequest): Observable<CustomersResponse> {
        return this.baseService.patch<CustomersResponse>(`${this.resource}/${id}`, payload);
    }

    remove(id: number): Observable<{ ok: boolean; message: string }> {
        return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/bulk-soft-delete`, {
            body: { ids },
        });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.baseService.patch<{ ok: boolean; message: string }>(`${this.resource}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.baseService.patch<{ ok: boolean; message: string }>(`${this.resource}/bulk-restore`, {
            ids,
        });
    }

    hardRemove(id: number): Observable<{ ok: boolean; message: string }> {
        return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/${id}/hard-delete`);
    }
}
