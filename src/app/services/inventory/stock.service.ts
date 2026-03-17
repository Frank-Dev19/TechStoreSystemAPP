// src/app/services/inventory/stock.service.ts
import { Injectable } from '@angular/core';
import { BaseService, HttpOptions } from '../base.service';
import { Observable, map } from 'rxjs';
import { Stock } from '../../models/inventory/stock';
import { config } from '../../../environments/environment';
import { StockApi, mapStockFromApi } from '../../utils/mappers';

export interface StockFilters {
    search?: string;
    category_id?: number | null;
    updated_from?: string;
    updated_to?: string;
    expiration_status?: string;
    low_stock?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedStockResponse {
    data: any[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class StockService {
    constructor(private base: BaseService) { }

    list(): Observable<Stock[]> {
        return this.base.get<StockApi[]>(config.inventory.stock + '/all').pipe(
            map(arr => (arr ?? []).map(mapStockFromApi))
        );
    }

    listPaged(filters: StockFilters): Observable<PaginatedStockResponse> {
        const cleanParams: any = {};
        Object.keys(filters).forEach(key => {
            const val = (filters as any)[key];
            if (val !== null && val !== undefined && val !== '' && val !== 'null') {
                cleanParams[key] = val;
            }
        });
        const options: HttpOptions = {
            params: cleanParams
        };
        return this.base.get<PaginatedStockResponse>(config.inventory.stock, options);
    }

    getMetrics(filters: StockFilters): Observable<any> {
        const cleanParams: any = {};
        Object.keys(filters).forEach(key => {
            const val = (filters as any)[key];
            if (val !== null && val !== undefined && val !== '' && val !== 'null') {
                cleanParams[key] = val;
            }
        });
        const options: HttpOptions = {
            params: cleanParams
        };
        return this.base.get<any>(`${config.inventory.stock}/metrics`, options);
    }

    getCurrentStock(productId: number): Observable<{ product_id: number; total_qty: number; avg_cost: number }> {
        return this.base.get<{ product_id: number; total_qty: number; avg_cost: number }>(`${config.inventory.stock}/current/${productId}`);
    }
}
