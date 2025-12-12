// src/app/services/pricing/price-lists-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import { PriceList, SavePriceListDto } from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class PriceListsApiService {
    private readonly baseUrl = config.pricing.priceLists;

    constructor(private base: BaseService) { }

    list(): Observable<PriceList[]> {
        return this.base.get<PriceList[]>(this.baseUrl);
    }

    get(id: number): Observable<PriceList> {
        return this.base.get<PriceList>(`${this.baseUrl}/${id}`);
    }

    create(payload: SavePriceListDto): Observable<PriceList> {
        return this.base.post<PriceList>(this.baseUrl, payload);
    }

    update(id: number, payload: Partial<SavePriceListDto>): Observable<PriceList> {
        return this.base.put<PriceList>(`${this.baseUrl}/${id}`, payload);
    }
}
