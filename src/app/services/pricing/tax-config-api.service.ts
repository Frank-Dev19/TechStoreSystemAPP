import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
    TaxConfig,
    SaveTaxConfigDto,
    UpdateTaxConfigDto,
} from '../../models/pricing/pricing.models';
import { config } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaxConfigApiService {
    private readonly baseUrl = config.pricing?.taxes || '/pricing/taxes';

    constructor(private base: BaseService) {}

    list(): Observable<TaxConfig[]> {
        return this.base.get<TaxConfig[]>(this.baseUrl);
    }

    getIGV(): Observable<{ code: string; rate: number }> {
        return this.base.get<{ code: string; rate: number }>(`${this.baseUrl}/igv`);
    }

    getRenta(): Observable<{ code: string; rate: number }> {
        return this.base.get<{ code: string; rate: number }>(`${this.baseUrl}/renta`);
    }

    create(dto: SaveTaxConfigDto): Observable<TaxConfig> {
        return this.base.post<TaxConfig>(this.baseUrl, dto);
    }

    update(id: number, dto: UpdateTaxConfigDto): Observable<TaxConfig> {
        return this.base.put<TaxConfig>(`${this.baseUrl}/${id}`, dto);
    }

    seed(): Observable<void> {
        return this.base.post<void>(`${this.baseUrl}/seed`, {});
    }
}
