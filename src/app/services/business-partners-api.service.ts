import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
    BusinessPartnerSaveRequest,
    BusinessPartnerUpdateRequest,
} from '../models/business-partners/business-partners-request';
import { BusinessPartnerResponse } from '../models/business-partners/business-partners-response';

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class BusinessPartnersApiService {
    private readonly resource = '/business-partners';

    constructor(private readonly baseService: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<BusinessPartnerResponse>> {
        return this.baseService.get<PaginatedResponse<BusinessPartnerResponse>>(this.resource, { params });
    }

    findOne(id: number): Observable<BusinessPartnerResponse> {
        return this.baseService.get<BusinessPartnerResponse>(`${this.resource}/${id}`);
    }

    create(payload: BusinessPartnerSaveRequest): Observable<BusinessPartnerResponse> {
        return this.baseService.post<BusinessPartnerResponse>(this.resource, payload);
    }

    update(id: number, payload: BusinessPartnerUpdateRequest): Observable<BusinessPartnerResponse> {
        return this.baseService.patch<BusinessPartnerResponse>(`${this.resource}/${id}`, payload);
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
