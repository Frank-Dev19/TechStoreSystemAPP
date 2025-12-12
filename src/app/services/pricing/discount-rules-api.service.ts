// src/app/services/pricing/discount-rules-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    DiscountRule,
    SaveDiscountRuleDto,
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
    }): Observable<DiscountRule[]> {
        const searchParams: string[] = [];
        if (params?.product_id != null) searchParams.push(`product_id=${params.product_id}`);
        if (params?.category_id != null) searchParams.push(`category_id=${params.category_id}`);
        if (params?.price_list_id != null) searchParams.push(`price_list_id=${params.price_list_id}`);
        if (params?.active_only === true) searchParams.push(`active_only=true`);

        const qs = searchParams.length ? `?${searchParams.join('&')}` : '';
        return this.base.get<DiscountRule[]>(`${this.baseUrl}${qs}`);
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
