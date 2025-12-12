// src/app/services/pricing/product-prices-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    ProductPriceBackend,
    SaveProductPriceDto,
    PriceCoverageStats,
} from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class ProductPricesApiService {
    private readonly baseUrl = config.pricing.productPrices;

    constructor(private base: BaseService) { }

    listByPriceList(priceListId: number, activeOnly = true): Observable<ProductPriceBackend[]> {
        const qs = `?price_list_id=${priceListId}&active_only=${activeOnly ? 'true' : 'false'}`;
        return this.base.get<ProductPriceBackend[]>(`${this.baseUrl}${qs}`);
    }

    listByProduct(productId: number, activeOnly = true): Observable<ProductPriceBackend[]> {
        const qs = `?product_id=${productId}&active_only=${activeOnly ? 'true' : 'false'}`;
        return this.base.get<ProductPriceBackend[]>(`${this.baseUrl}${qs}`);
    }

    create(payload: SaveProductPriceDto): Observable<ProductPriceBackend> {
        return this.base.post<ProductPriceBackend>(this.baseUrl, payload);
    }

    update(id: number, payload: Partial<SaveProductPriceDto>): Observable<ProductPriceBackend> {
        return this.base.put<ProductPriceBackend>(`${this.baseUrl}/${id}`, payload);
    }

    remove(id: number) {
        return this.base.delete<void>(`${this.baseUrl}/${id}`);
    }

    //       getCoverageByPriceListQ(priceListId: number) {
    //     return this.http.get<PriceCoverageStats>('/api/pricing/product-prices/coverage', {
    //       params: { price_list_id: String(priceListId) },
    //     });
    //   }


    getCoverageByPriceList(priceListId: number) {
        const qs = `?price_list_id=${priceListId}`;
        return this.base.get<PriceCoverageStats>(`${this.baseUrl}/coverage${qs}`);
    }

}
