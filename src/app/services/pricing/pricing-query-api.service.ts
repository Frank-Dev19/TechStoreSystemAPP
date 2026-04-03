// src/app/services/pricing/pricing-query-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    PriceCalculation,
    DiscountValidation,
} from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class PricingQueryApiService {
    private readonly baseUrl = config.pricing.queryProduct;

    constructor(private base: BaseService) {}

    // GET /pricing/query/product/:productId
    calculatePrice(productId: number): Observable<PriceCalculation> {
        return this.base.get<PriceCalculation>(`${this.baseUrl}/${productId}`);
    }

    // GET /pricing/query/product/:productId/validate-discount?pct=3.5
    validateDiscount(productId: number, pct: number): Observable<DiscountValidation> {
        return this.base.get<DiscountValidation>(
            `${this.baseUrl}/${productId}/validate-discount?pct=${pct}`
        );
    }

    // GET /pricing/query/bulk?ids=1,2,3
    calculateBulk(productIds: number[]): Observable<PriceCalculation[]> {
        const ids = productIds.join(',');
        return this.base.get<PriceCalculation[]>(
            `${config.pricing.queryBulk}?ids=${ids}`
        );
    }
}
