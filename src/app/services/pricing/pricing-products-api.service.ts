// src/app/services/pricing/pricing-products-api.service.ts
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import { ProductLite } from '../../models/pricing/pricing.models';

interface InventoryCatalogProductDto {
    id: number;
    sku: string;
    name: string;
    category?: { id: number; code: string; name: string };
    unit?: { id: number; code: string; name: string };
    isSerialized?: boolean;
    managesExpiration?: boolean;
}

interface InventoryCatalogProductListResponse {
    data?: InventoryCatalogProductDto[];
}

@Injectable({ providedIn: 'root' })
export class PricingProductsApiService {
    private readonly baseUrl = config.catalogs.products;

    constructor(private base: BaseService) { }

    list(): Observable<InventoryCatalogProductDto[]> {
        return this.base
            .get<InventoryCatalogProductDto[] | InventoryCatalogProductListResponse>(this.baseUrl)
            .pipe(
                map((response) => Array.isArray(response) ? response : (response.data ?? []))
            );
    }

    // helper para mapear a ProductLite
    mapToProductLite(dto: InventoryCatalogProductDto): ProductLite {
        return {
            id: dto.id,
            sku: dto.sku,
            name: dto.name,
            categoryName: dto.category?.name ?? '',
            unitName: dto.unit?.name ?? 'Unidad',
            isSerialized: dto.isSerialized ?? false,
            managesExpiration: dto.managesExpiration ?? false,
        };
    }
}
