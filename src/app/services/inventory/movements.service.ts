import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { Movement, MovementCreateDto } from '../../models/inventory/movement';
import { config } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MovementsService {
    private readonly baseUrl = config.inventory.kardex; // '/inventory/movements'

    constructor(private base: BaseService) { }

    create(body: MovementCreateDto & { serial_ids?: number[]; serial_codes?: string[] }): Observable<Movement> {
        return this.base.post<Movement>(this.baseUrl, body);
    }

    entry(data: {
        product_id: number; qty: number; unit_cost: number;
        notes?: string | null; lot_id?: number | null;
        serial_codes?: string[]; // NEW
        source_doc_type?: string | null; source_doc_id?: string | null; reason_code?: string | null;
    }): Observable<Movement> {
        const body: any = {
            type: 'IN',
            product_id: data.product_id,
            qty: Number(data.qty),
            unit_cost: Number(data.unit_cost),
            reason_code: (data.reason_code ?? 'COMPRA'),
            notes: data.notes ?? null,
            lot_id: data.lot_id ?? null,
            source_doc_type: data.source_doc_type ?? 'MANUAL',
            source_doc_id: data.source_doc_id ?? null,
        };
        if (data.serial_codes?.length) body.serial_codes = data.serial_codes;
        return this.create(body);
    }

    exit(data: {
        product_id: number; qty: number;
        reason_code?: string | null; notes?: string | null;
        lot_id?: number | null;
        serial_ids?: number[]; // NEW
        source_doc_type?: string | null; source_doc_id?: string | null;
    }): Observable<Movement> {
        const body: any = {
            type: 'OUT',
            product_id: data.product_id,
            qty: Math.abs(Number(data.qty)),
            reason_code: data.reason_code ?? 'VENTA',
            notes: data.notes ?? null,
            lot_id: data.lot_id ?? null,
            source_doc_type: data.source_doc_type ?? 'MANUAL',
            source_doc_id: data.source_doc_id ?? null,
        };
        if (data.serial_ids?.length) body.serial_ids = data.serial_ids;
        return this.create(body);
    }

    adjustment(data: {
        product_id: number; qty: number;
        reason_code?: string | null; notes?: string | null;
        lot_id?: number | null;
        serial_ids?: number[]; // for negative
        serial_codes?: string[]; // for positive
        source_doc_type?: string | null; source_doc_id?: string | null;
    }): Observable<Movement> {
        const body: any = {
            type: 'ADJ',
            product_id: data.product_id,
            qty: Number(data.qty),
            reason_code: data.reason_code ?? 'AJUSTE_INV',
            notes: data.notes ?? null,
            lot_id: data.lot_id ?? null,
            source_doc_type: data.source_doc_type ?? 'MANUAL',
            source_doc_id: data.source_doc_id ?? null,
        };
        if (data.serial_ids?.length) body.serial_ids = data.serial_ids;
        if (data.serial_codes?.length) body.serial_codes = data.serial_codes;
        return this.create(body);
    }

}
