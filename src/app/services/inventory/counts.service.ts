// src/app/services/inventory/counts.service.ts
import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Observable, map } from 'rxjs';
import { Count } from '../../models/inventory/count';
import { CountSnapshot } from '../../models/inventory/count-snapshot';
import { CountEntry } from '../../models/inventory/count-entry';
import { config } from '../../../environments/environment';
import { CountSerialDiff } from '../../models/inventory/count-serial-diff';
import {
    CountApi, CountEntryApi, CountSnapshotApi,
    mapCountFromApi, mapCountEntryFromApi, mapCountSnapshotFromApi
} from '../../utils/mappers';

import { CountDifferenceRow, CountDifferenceSummary } from '../../models/inventory/count-difference';

@Injectable({ providedIn: 'root' })
export class CountsHttpService {
    private base = config.inventory.counts;

    constructor(private baseSvc: BaseService) { }

    list(): Observable<Count[]> {
        return this.baseSvc.get<CountApi[]>(this.base).pipe(
            map(arr => (arr ?? []).map(mapCountFromApi))
        );
    }

    create(body: { code?: string; description?: string; createdBy: string }): Observable<Count> {
        return this.baseSvc.post<CountApi>(this.base, body).pipe(map(mapCountFromApi));
    }

    get(id: number): Observable<Count> {
        return this.baseSvc.get<CountApi>(`${this.base}/${id}`).pipe(map(mapCountFromApi));
    }

    freeze(id: number): Observable<Count> { return this.baseSvc.put<CountApi>(`${this.base}/${id}/freeze`, {} as any).pipe(map(mapCountFromApi)); }
    start(id: number): Observable<Count> { return this.baseSvc.put<CountApi>(`${this.base}/${id}/start`, {} as any).pipe(map(mapCountFromApi)); }
    review(id: number, user?: string): Observable<Count> {
        return this.baseSvc.put<CountApi>(`${this.base}/${id}/review`, { user } as any).pipe(map(mapCountFromApi));
    }

    post(id: number, user?: string): Observable<Count> {
        return this.baseSvc.put<CountApi>(`${this.base}/${id}/post`, { user } as any).pipe(map(mapCountFromApi));
    }
    cancel(id: number): Observable<Count> { return this.baseSvc.put<CountApi>(`${this.base}/${id}/cancel`, {} as any).pipe(map(mapCountFromApi)); }

    // counts.service.ts
    addEntry(
        id: number,
        body: { product_id: number; lot_id?: number | null; qty_counted: number; user?: string; serial_codes?: string[] } // <- NUEVO
    ): Observable<CountEntry> {
        const payload: any = {
            productId: body.product_id,
            lotId: body.lot_id ?? null,
            qtyCounted: body.qty_counted,
            user: body.user ?? null,
        };
        if (body.serial_codes?.length) payload.serialCodes = body.serial_codes; // <-- NUEVO (usar camel)
        return this.baseSvc.post<CountEntryApi>(`${this.base}/${id}/entries`, payload).pipe(
            map(mapCountEntryFromApi)
        );
    }


    addEntriesBulk(id: number, entries: { product_id: number; lot_id?: number | null; qty_counted: number; user?: string }[]) {
        const payload = {
            user: entries.find(e => !!e.user)?.user ?? null,
            entries: (entries || []).map(e => ({
                product_id: e.product_id,
                lot_id: e.lot_id ?? null,
                qty_counted: e.qty_counted,
                user: e.user ?? null,
            })),
        };
        return this.baseSvc.post<{ addedOrUpdated: number }>(`${this.base}/${id}/entries/bulk`, payload);
    }


    getSnapshots(id: number): Observable<CountSnapshot[]> {
        return this.baseSvc.get<CountSnapshotApi[]>(`${this.base}/${id}/snapshots`).pipe(
            map(arr => (arr ?? []).map(mapCountSnapshotFromApi))
        );
    }
    getEntries(id: number): Observable<CountEntry[]> {
        return this.baseSvc.get<CountEntryApi[]>(`${this.base}/${id}/entries`).pipe(
            map(arr => (arr ?? []).map(mapCountEntryFromApi))
        );
    }

    getSerialDiffs(id: number): Observable<CountSerialDiff[]> {
        return this.baseSvc.get<CountSerialDiff[]>(`${this.base}/${id}/serial-diffs`);
    }


    getDifferences(countId: number) {
        return this.baseSvc.get<CountDifferenceRow[]>(`${this.base}/${countId}/differences`);
    }

    getDifferenceSummary(countId: number) {
        return this.baseSvc.get<CountDifferenceSummary>(`${this.base}/${countId}/differences/summary`);
    }
}
