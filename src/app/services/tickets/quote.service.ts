import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { Quote } from '../../models/tickets/quote';
import { QuoteRequest } from '../../models/tickets/quote-request';
import { config } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class QuoteService {
  constructor(private base: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<Quote>> {
    return this.base.get<PaginatedResponse<Quote>>(config.tickets.quotes, { params });
  }

  findOne(id: number, withDeleted = false): Observable<Quote> {
    return this.base.get<Quote>(`${config.tickets.quotes}/${id}`, {
      params: { withDeleted: String(withDeleted) },
    });
  }

  create(payload: QuoteRequest): Observable<Quote> {
    return this.base.post<Quote>(config.tickets.quotes, payload);
  }

  update(id: number, payload: QuoteRequest): Observable<Quote> {
    return this.base.patch<Quote>(`${config.tickets.quotes}/${id}`, payload);
  }

  softDelete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.tickets.quotes}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.quotes}/bulk-delete`, { ids });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.patch<{ ok: boolean; message: string }>(`${config.tickets.quotes}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.quotes}/bulk-restore`, { ids });
  }
}
