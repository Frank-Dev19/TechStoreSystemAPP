import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
    PricingConfig,
    SavePricingConfigDto,
    UpdatePricingConfigDto,
    ResolvedConfig,
} from '../../models/pricing/pricing.models';
import { config } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PricingConfigApiService {
    private readonly baseUrl = config.pricing?.config || '/pricing/config';

    constructor(private base: BaseService) {}

    list(): Observable<PricingConfig[]> {
        return this.base.get<PricingConfig[]>(this.baseUrl);
    }

    resolve(productId: number): Observable<ResolvedConfig> {
        return this.base.get<ResolvedConfig>(`${this.baseUrl}/resolve/${productId}`);
    }

    create(dto: SavePricingConfigDto): Observable<PricingConfig> {
        return this.base.post<PricingConfig>(this.baseUrl, dto);
    }

    update(id: number, dto: UpdatePricingConfigDto): Observable<PricingConfig> {
        return this.base.put<PricingConfig>(`${this.baseUrl}/${id}`, dto);
    }

    remove(id: number): Observable<void> {
        return this.base.delete<void>(`${this.baseUrl}/${id}`);
    }
}
