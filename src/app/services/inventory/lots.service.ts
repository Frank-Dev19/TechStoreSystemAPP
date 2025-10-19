import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import { Lot } from '../../models/catalog/lot';
import { LotApi, mapLotFromApi, mapLotToApi } from '../../utils/mappers';

@Injectable({ providedIn: 'root' })
export class LotsService {
    private readonly base = config.catalogs.lots; // Debe resolver a '/lots'

    constructor(private baseSvc: BaseService) { }

    create(body: { product_id: number; lot_code: string; expiration_date: string }): Observable<Lot> {
        return this.baseSvc
            .post<LotApi>(this.base, mapLotToApi(body))
            .pipe(map(mapLotFromApi));
    }

    listByProduct(productId: number): Observable<Lot[]> {
        return this.baseSvc
            .get<LotApi[]>(`${this.base}?product_id=${productId}`)
            .pipe(map(rows => (rows ?? []).map(mapLotFromApi)));
    }
}
