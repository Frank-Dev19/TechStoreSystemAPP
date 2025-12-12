import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
    AuditLog,
} from '../../models/audit/audit-log.model';
import {
    AuditSearchFilters,
    AuditSearchResponse,
} from '../../models/audit/audit-search.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
    constructor(private base: BaseService) { }

    search(filters: AuditSearchFilters): Observable<AuditSearchResponse<AuditLog>> {
        const params: any = {
            from: filters.from,
            to: filters.to,
        };

        if (filters.userId != null) params.userId = filters.userId;
        if (filters.action) params.action = filters.action;
        if (filters.entity) params.entity = filters.entity;
        if (filters.status != null) params.status = filters.status;
        if (filters.method) params.method = filters.method;
        if (filters.q && filters.q.trim() !== '') params.q = filters.q.trim();

        if (filters.page) params.page = filters.page;
        if (filters.pageSize) params.pageSize = filters.pageSize;
        if (filters.sort) params.sort = filters.sort;

        return this.base.get<AuditSearchResponse<AuditLog>>(config.audit.search, {
            params,
        });
    }

    findById(id: number): Observable<AuditLog> {
        return this.base.get<AuditLog>(`${config.audit.byId}/${id}`);
    }

    /**
     * Modo live: wrap de EventSource (SSE) -> Observable<AuditLog>
     */
    stream(filters: AuditSearchFilters): Observable<AuditLog> {
        const qs = new URLSearchParams();

        if (filters.from) qs.append('from', filters.from);
        if (filters.to) qs.append('to', filters.to);
        if (filters.userId != null) qs.append('userId', String(filters.userId));
        if (filters.action) qs.append('action', filters.action);
        if (filters.entity) qs.append('entity', filters.entity);
        if (filters.status != null) qs.append('status', String(filters.status));
        if (filters.method) qs.append('method', filters.method);
        if (filters.q && filters.q.trim() !== '') qs.append('q', filters.q.trim());
        if (filters.sort) qs.append('sort', filters.sort);

        const url = `${config.endpointServices}${config.audit.stream}?${qs.toString()}`;

        return new Observable<AuditLog>((subscriber) => {
            const es = new EventSource(url);

            es.onmessage = (event: MessageEvent) => {
                try {
                    const parsed = JSON.parse(event.data) as AuditLog;
                    subscriber.next(parsed);
                } catch (e) {
                    console.error('Error parseando SSE de auditoría', e);
                }
            };

            es.onerror = (err) => {
                console.error('Error en EventSource de auditoría', err);
                // opcional: subscriber.error(err);
            };

            return () => {
                es.close();
            };
        });
    }
}
