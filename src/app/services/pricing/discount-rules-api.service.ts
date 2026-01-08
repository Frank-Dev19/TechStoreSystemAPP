// src/app/services/pricing/discount-rules-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    DiscountRule,
    SaveDiscountRuleDto,
    PaginatedResponse,
} from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class DiscountRulesApiService {
    private readonly baseUrl = config.pricing.discountRules;

    constructor(private base: BaseService) { }

    list(params?: {
        product_id?: number;
        category_id?: number;
        price_list_id?: number;
        active_only?: boolean;
        search?: string;  // Nueva opción para búsqueda por nombre
        auto_check_expired?: boolean; //
    }): Observable<DiscountRule[]> {
        const searchParams: string[] = [];
        if (params?.product_id != null) searchParams.push(`product_id=${params.product_id}`);
        if (params?.category_id != null) searchParams.push(`category_id=${params.category_id}`);
        if (params?.price_list_id != null) searchParams.push(`price_list_id=${params.price_list_id}`);
        if (params?.active_only === true) searchParams.push(`active_only=true`);
        if (params?.search) searchParams.push(`search=${encodeURIComponent(params.search)}`);  // Nueva línea

        if (params?.auto_check_expired) {
            searchParams.push('auto_check=true'); // 👈 Activar auto-desactivación
        }

        const qs = searchParams.length ? `?${searchParams.join('&')}` : '';
        return this.base.get<DiscountRule[]>(`${this.baseUrl}${qs}`);
    }

    listPaginated(params?: {
        product_id?: number;
        category_id?: number;
        price_list_id?: number;
        active_only?: boolean;
        page?: number;
        limit?: number;
        auto_check?: boolean;
        search?: string; // <-- Agregar
    }): Observable<PaginatedResponse<DiscountRule>> {
        const searchParams: string[] = [];

        if (params?.product_id != null) searchParams.push(`product_id=${params.product_id}`);
        if (params?.category_id != null) searchParams.push(`category_id=${params.category_id}`);
        if (params?.price_list_id != null) searchParams.push(`price_list_id=${params.price_list_id}`);
        if (params?.active_only === true) searchParams.push(`active_only=true`);
        if (params?.page != null) searchParams.push(`page=${params.page}`);
        if (params?.limit != null) searchParams.push(`limit=${params.limit}`);
        if (params?.search) searchParams.push(`search=${encodeURIComponent(params.search)}`); // <-- Agregar

        if (params?.auto_check) {
            searchParams.push('auto_check=true');
        }

        const qs = searchParams.length ? `?${searchParams.join('&')}` : '';
        return this.base.get<PaginatedResponse<DiscountRule>>(`${this.baseUrl}${qs}`);
    }

    listAll(params?: {
        product_id?: number;
        category_id?: number;
        price_list_id?: number;
        active_only?: boolean;
        auto_check?: boolean;
    }): Observable<DiscountRule[]> {
        const searchParams: string[] = [];

        if (params?.product_id != null) searchParams.push(`product_id=${params.product_id}`);
        if (params?.category_id != null) searchParams.push(`category_id=${params.category_id}`);
        if (params?.price_list_id != null) searchParams.push(`price_list_id=${params.price_list_id}`);
        if (params?.active_only === true) searchParams.push(`active_only=true`);

        if (params?.auto_check) {
            searchParams.push('auto_check=true');
        }

        const qs = searchParams.length ? `?${searchParams.join('&')}` : '';
        return this.base.get<DiscountRule[]>(`${this.baseUrl}/all${qs}`);
    }




    create(payload: SaveDiscountRuleDto): Observable<DiscountRule> {
        return this.base.post<DiscountRule>(this.baseUrl, payload);
    }

    update(id: number, payload: Partial<SaveDiscountRuleDto>): Observable<DiscountRule> {
        return this.base.put<DiscountRule>(`${this.baseUrl}/${id}`, payload);
    }

    remove(id: number) {
        return this.base.delete<void>(`${this.baseUrl}/${id}`);
    }
}
