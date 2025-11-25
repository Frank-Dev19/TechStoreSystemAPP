import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ServiceCategory } from '../../models/service-catalog/service-category';
import {
    ServiceCategorySaveRequest,
    ServiceCategoryUpdateRequest
} from '../../models/service-catalog/service-category-request';
import { config } from '../../../environments/environment';

export interface PaginatedRespones<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class ServiceCategoryService {
    constructor(private base: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedRespones<ServiceCategory>> {
        return this.base.get<PaginatedRespones<ServiceCategory>>(config.serviceCatalog.categories, { params });
    }

    findOne(id: number): Observable<ServiceCategory> {
        return this.base.get<ServiceCategory>(`${config.serviceCatalog.categories}/${id}`);
    }

    create(payload: ServiceCategorySaveRequest): Observable<ServiceCategory> {
        return this.base.post<ServiceCategory>(config.serviceCatalog.categories, payload);
    }

    update(id: number, payload: ServiceCategoryUpdateRequest): Observable<ServiceCategory> {
        return this.base.patch<ServiceCategory>(`${config.serviceCatalog.categories}/${id}`, payload);
    }

    softDelete(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceCatalog.categories}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceCatalog.categories}/bulk-soft-delete`, {
            body: { ids },
        });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceCatalog.categories}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceCatalog.categories}/bulk-restore`, {
            body: { ids },
        });
    }
}
