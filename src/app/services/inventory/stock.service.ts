// src/app/services/inventory/stock.service.ts
import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Observable, map } from 'rxjs';
import { Stock } from '../../models/inventory/stock';
import { config } from '../../../environments/environment';
import { StockApi, mapStockFromApi } from '../../utils/mappers';

@Injectable({ providedIn: 'root' })
export class StockService {
    constructor(private base: BaseService) { }

    list(): Observable<Stock[]> {
        return this.base.get<StockApi[]>(config.inventory.stock).pipe(
            map(arr => (arr ?? []).map(mapStockFromApi))
        );
    }
}
