import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Observable, map } from 'rxjs';
import { config } from '../../../environments/environment';
import { Serial } from '../../models/inventory/serial';
import { SerialApi } from '../../utils/mappers';

@Injectable({ providedIn: 'root' })
export class SerialsService {
    private base = config.inventory.serials; // e.g., '/serials'

    constructor(private baseSvc: BaseService) { }

    list(params: { product_id: number; lot_id?: number | null; status?: string }): Observable<Serial[]> {
        const query = new URLSearchParams();
        query.set('product_id', String(params.product_id));
        if (params.lot_id !== undefined) query.set('lot_id', String(params.lot_id));
        if (params.status) query.set('status', params.status);
        return this.baseSvc.get<SerialApi[]>(`${this.base}?${query.toString()}`).pipe(
            map(arr => (arr ?? []).map(a => ({
                id: a.id,
                product_id: a.productId,
                serial_code: a.serialCode,
                lot_id: a.lotId ?? null,
                status: a.status,
                created_at: a.createdAt,
            })))
        );
    }

    byMovement(movement_id: number): Observable<{ serial_id: number; serial_code: string; lot_id: number | null }[]> {
        return this.baseSvc.get<any[]>(`${this.base}/by-movement/${movement_id}`);
    }
}
