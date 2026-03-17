import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ServiceOrderQuote } from '../../models/service-orders/service-quote';
import { ServiceOrderQuoteRequest } from '../../models/service-orders/service-quote-request';
import { config } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TechnicianRevenueRanking {
  rank: number;
  technicianId: number;
  technicianName: string;
  itemsCount: number;
  totalRevenue: number;
  productRevenue: number;
  serviceRevenue: number;
  diagnosisRevenue: number;
  standardRevenue: number;
  diagnosisItemsCount: number;
  standardItemsCount: number;
}

export interface TechnicianRevenueRankingResponse {
  generatedAt: string;
  technicians: TechnicianRevenueRanking[];
}

@Injectable({ providedIn: 'root' })
export class ServiceOrderQuoteService {
  constructor(private base: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrderQuote>> {
    return this.base.get<PaginatedResponse<ServiceOrderQuote>>(config.serviceOrders.serviceOrderQuotes, { params });
  }

  findOne(id: number, withDeleted = false): Observable<ServiceOrderQuote> {
    return this.base.get<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}`, {
      params: { withDeleted: String(withDeleted) },
    });
  }

  getTechnicianRevenueRankings(): Observable<TechnicianRevenueRankingResponse> {
    return this.base.get<TechnicianRevenueRankingResponse>(`${config.serviceOrders.serviceOrderQuotes}/technician-rankings`)
  }

  create(payload: ServiceOrderQuoteRequest): Observable<ServiceOrderQuote> {
    return this.base.post<ServiceOrderQuote>(config.serviceOrders.serviceOrderQuotes, payload);
  }

  update(id: number, payload: ServiceOrderQuoteRequest): Observable<ServiceOrderQuote> {
    return this.base.patch<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}`, payload);
  }

  softDelete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderQuotes}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderQuotes}/bulk-delete`, { ids });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderQuotes}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderQuotes}/bulk-restore`, { ids });
  }

  // Client actions
  sendToClient(id: number, notes?: string): Observable<ServiceOrderQuote> {
    return this.base.patch<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}/send-to-client`, { notes });
  }

  approveByClient(id: number, notes?: string): Observable<ServiceOrderQuote> {
    return this.base.patch<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}/approve-client`, { notes });
  }

  rejectByClient(id: number, notes?: string): Observable<ServiceOrderQuote> {
    return this.base.patch<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}/reject-client`, { notes });
  }

  // Resubmit actions
  resubmitServiceOrderQuote(id: number, payload: { products?: any[]; services?: any[]; notes?: string }): Observable<ServiceOrderQuote> {
    return this.base.patch<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}/resubmit`, payload);
  }

  resubmitAfterClientRejection(id: number, payload: { products?: any[]; services?: any[]; notes?: string }): Observable<ServiceOrderQuote> {
    return this.base.patch<ServiceOrderQuote>(`${config.serviceOrders.serviceOrderQuotes}/${id}/resubmit-after-client-rejection`, payload);
  }
}
