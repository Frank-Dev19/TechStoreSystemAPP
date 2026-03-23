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
                lot_code: (a as any).lot?.lotCode ?? null,
                supplier_name: (a as any).supplier?.name ?? null,
                status: a.status,
                created_at: a.createdAt,
            })))
        );
    }

    byMovement(movement_id: number): Observable<{ serial_id: number; serial_code: string; lot_id: number | null; lot_code?: string | null; supplier_name?: string | null }[]> {
        return this.baseSvc.get<any[]>(`${this.base}/by-movement/${movement_id}`);
    }


    // Resuelve si cada serial existe y a qué lote/producto pertenece
    // resolve(serial_codes: string[]) {
    //   return this.baseSvc.post<Array<{
    //     serial_code: string;
    //     exists: boolean;
    //     product_id: number | null;
    //     lot_id: number | null;
    //     lot_code: string | null;
    //   }>>(
    //     `${config.inventory.serials}/resolve`,
    //     { serial_codes }
    //   );
    // }


    // ✅ NUEVO: resolver seriales
    resolve(serialCodes: string[]): Observable<Array<{
        serial_code: string;
        product_id: number | null;
        lot_id: number | null;
        lot_code: string | null;
        exists: boolean;
    }>> {
        return this.baseSvc.post<any[]>(`${this.base}/resolve`, { serial_codes: serialCodes });
    }

}
