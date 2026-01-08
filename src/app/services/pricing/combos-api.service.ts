// src/app/services/pricing/combos-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    ComboUi,
    SaveComboDto,
    PaginatedResponse,
} from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class CombosApiService {
    private readonly baseUrl = config.pricing.combos;

    constructor(private base: BaseService) { }

    list(filters: { page: number, limit: number, activeOnly?: string, autoCheck?: boolean }): Observable<PaginatedResponse<ComboUi>> {
        let queryParams = `?page=${filters.page}&limit=${filters.limit}`;

        if (filters.activeOnly !== undefined) {
            queryParams += `&activeOnly=${filters.activeOnly}`;
        }

        if (filters.autoCheck === true) {
            queryParams += '&auto_check=true';
        }

        return this.base.get<PaginatedResponse<any>>(`${this.baseUrl}${queryParams}`);
    }

    create(payload: SaveComboDto): Observable<any> {
        return this.base.post<any>(this.baseUrl, payload);
    }

    update(id: number, payload: Partial<SaveComboDto>): Observable<any> {
        return this.base.put<any>(`${this.baseUrl}/${id}`, payload);
    }

    remove(id: number) {
        return this.base.delete<void>(`${this.baseUrl}/${id}`);
    }

    // Agrega este método en CombosApiService
    listAll(activeOnly?: string, autoCheck?: boolean): Observable<ComboUi[]> {
        let queryParams = '';

        if (activeOnly !== undefined) {
            queryParams = `?activeOnly=${activeOnly}`;
        }

        if (autoCheck === true) {
            queryParams += '&auto_check=true';
        }

        return this.base.get<any[]>(`${this.baseUrl}/all${queryParams}`);
    }
}
