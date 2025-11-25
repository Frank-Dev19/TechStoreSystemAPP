import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { Diagnostic } from '../../models/tickets/diagnostic';
import { DiagnosticSaveRequest, DiagnosticUpdateRequest } from '../../models/tickets/diagnostic-request';
import { config } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class DiagnosticService {
  constructor(private base: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<Diagnostic>> {
    return this.base.get<PaginatedResponse<Diagnostic>>(config.tickets.diagnostics, { params });
  }

  findOne(id: number, withDeleted = false): Observable<Diagnostic> {
    return this.base.get<Diagnostic>(`${config.tickets.diagnostics}/${id}`, {
      params: { withDeleted: String(withDeleted) },
    });
  }

  create(payload: DiagnosticSaveRequest): Observable<Diagnostic> {
    return this.base.post<Diagnostic>(config.tickets.diagnostics, payload);
  }

  update(id: number, payload: DiagnosticUpdateRequest): Observable<Diagnostic> {
    return this.base.patch<Diagnostic>(`${config.tickets.diagnostics}/${id}`, payload);
  }

  softDelete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.tickets.diagnostics}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.diagnostics}/bulk-delete`, { ids });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.patch<{ ok: boolean; message: string }>(`${config.tickets.diagnostics}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.diagnostics}/bulk-restore`, { ids });
  }
}
