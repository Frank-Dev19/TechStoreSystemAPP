// src/app/services/inventory/kardex.service.ts
import { Injectable } from '@angular/core';
import { BaseService, HttpOptions } from '../base.service';
import { Observable, map } from 'rxjs';
import { Movement } from '../../models/inventory/movement';
import { config } from '../../../environments/environment';
import { MovementApi, mapMovementFromApi } from '../../utils/mappers';

export interface KardexFilters {
    dateFrom?: string;
    dateTo?: string;
    product_id?: number | null;
    reason_code?: string | null;
    page?: number;
    limit?: number;
}

export type KardexExportFilters = Omit<KardexFilters, 'page' | 'limit'>;

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class KardexService {
    constructor(private base: BaseService) { }

    list(params?: KardexFilters): Observable<PaginatedResponse<Movement>> {
        const options: HttpOptions = {
            params: {
                ...(params?.dateFrom ? { date_from: params.dateFrom } : {}),
                ...(params?.dateTo ? { date_to: params.dateTo } : {}),
                ...(params?.product_id ? { product_id: params.product_id } : {}),
                ...(params?.reason_code ? { reason_code: params.reason_code } : {}),
                ...(params?.page ? { page: params.page } : {}),
                ...(params?.limit ? { limit: params.limit } : {}),
            },
        };
        return this.base.get<PaginatedResponse<MovementApi>>(config.inventory.kardex, options).pipe(
            map(res => {
                return {
                    ...res,
                    data: (res.data ?? []).map(mapMovementFromApi)
                };
            })
        );
    }

    exportCsv(params: KardexExportFilters): Observable<Blob> {
        const options: HttpOptions = {
            params: {
                ...(params.dateFrom ? { date_from: params.dateFrom } : {}),
                ...(params.dateTo ? { date_to: params.dateTo } : {}),
                ...(params.product_id ? { product_id: params.product_id } : {}),
                ...(params.reason_code ? { reason_code: params.reason_code } : {}),
            },
        };
        return this.base.getBlob(`${config.inventory.kardex}/export`, options);
    }
}
