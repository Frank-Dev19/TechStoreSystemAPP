// src/app/services/pricing/pricing-query-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    BestPriceResponse,
    ProductPriceResult,
} from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class PricingQueryApiService {
    private readonly baseUrl = config.pricing.queryProduct;

    constructor(private base: BaseService) { }

    // GET /pricing/query/product/:productId?qty=...
    getProductPrice(productId: number, qty: number, priceListCode?: string, date?: string): Observable<ProductPriceResult> {
        const params: string[] = [`qty=${qty}`];
        if (priceListCode) params.push(`price_list_code=${encodeURIComponent(priceListCode)}`);
        if (date) params.push(`date=${encodeURIComponent(date)}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        return this.base.get<ProductPriceResult>(`${this.baseUrl}/${productId}${qs}`);
    }

    // GET /pricing/query/product/:productId/best?qty=...
    getBestPrice(productId: number, qty: number, date?: string): Observable<BestPriceResponse> {
        const params: string[] = [`qty=${qty}`];
        if (date) params.push(`date=${encodeURIComponent(date)}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        return this.base.get<BestPriceResponse>(`${this.baseUrl}/${productId}/best${qs}`);
    }
}
