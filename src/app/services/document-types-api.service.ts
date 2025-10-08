import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
    DocumentTypeSaveRequest,
    DocumentTypeUpdateRequest,
} from '../models/document-types/document-types-request';
import {
    DocumentTypeResponse,
    DocumentTypesPaginatedResponse,
} from '../models/document-types/document-types-response';

@Injectable({ providedIn: 'root' })
export class DocumentTypesApiService {
    private readonly resource = '/document-types';

    constructor(private readonly baseService: BaseService) { }

    findAll(params?: Record<string, string | number | boolean | undefined>): Observable<DocumentTypesPaginatedResponse> {
        return this.baseService.get<DocumentTypesPaginatedResponse>(this.resource, { params });
    }

    findOne(id: number): Observable<DocumentTypeResponse> {
        return this.baseService.get<DocumentTypeResponse>(`${this.resource}/${id}`);
    }

    create(payload: DocumentTypeSaveRequest): Observable<DocumentTypeResponse> {
        return this.baseService.post<DocumentTypeResponse>(this.resource, payload);
    }

    update(id: number, payload: DocumentTypeUpdateRequest): Observable<DocumentTypeResponse> {
        return this.baseService.patch<DocumentTypeResponse>(`${this.resource}/${id}`, payload);
    }

    delete(id: number): Observable<{ ok: boolean }> {
        return this.baseService.delete<{ ok: boolean }>(`${this.resource}/${id}`);
    }

    bulkDelete(ids: number[]): Observable<{ ok: boolean }> {
        return this.baseService.delete<{ ok: boolean }>(`${this.resource}/bulk-delete`, { body: { ids } });
    }

    restore(id: number): Observable<{ ok: boolean }> {
        return this.baseService.patch<{ ok: boolean }>(`${this.resource}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean }> {
        return this.baseService.patch<{ ok: boolean }>(`${this.resource}/bulk-restore`, { ids });
    }
}
