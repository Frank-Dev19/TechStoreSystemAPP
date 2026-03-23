import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ServiceOrderAgreement } from '../../models/service-orders/service-agreement';
import { ServiceOrderAgreementRequest } from '../../models/service-orders/service-agreement-request';
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
export class ServiceOrderAgreementService {
  constructor(private base: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrderAgreement>> {
    return this.base.get<PaginatedResponse<ServiceOrderAgreement>>(config.serviceOrders.serviceOrderAgreements, { params });
  }

  findOne(id: number, withDeleted = false): Observable<ServiceOrderAgreement> {
    return this.base.get<ServiceOrderAgreement>(`${config.serviceOrders.serviceOrderAgreements}/${id}`, {
      params: { withDeleted: String(withDeleted) },
    });
  }

  getTechnicianRevenueRankings(): Observable<TechnicianRevenueRankingResponse> {
    return this.base.get<TechnicianRevenueRankingResponse>(`${config.serviceOrders.serviceOrderAgreements}/technician-rankings`)
  }

  create(payload: ServiceOrderAgreementRequest): Observable<ServiceOrderAgreement> {
    return this.base.post<ServiceOrderAgreement>(config.serviceOrders.serviceOrderAgreements, payload);
  }

  update(id: number, payload: ServiceOrderAgreementRequest): Observable<ServiceOrderAgreement> {
    return this.base.patch<ServiceOrderAgreement>(`${config.serviceOrders.serviceOrderAgreements}/${id}`, payload);
  }

  softDelete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderAgreements}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderAgreements}/bulk-delete`, { ids });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderAgreements}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderAgreements}/bulk-restore`, { ids });
  }

  confirm(id: number): Observable<ServiceOrderAgreement> {
    return this.base.patch<ServiceOrderAgreement>(`${config.serviceOrders.serviceOrderAgreements}/${id}/confirm`, {});
  }

  voidAgreement(id: number, notes?: string): Observable<ServiceOrderAgreement> {
    return this.base.patch<ServiceOrderAgreement>(`${config.serviceOrders.serviceOrderAgreements}/${id}/void`, { notes });
  }

  createDiagnosisFeeAgreement(serviceOrderId: number): Observable<ServiceOrderAgreement> {
    return this.base.post<ServiceOrderAgreement>(`${config.serviceOrders.serviceOrderAgreements}/diagnosis-fee-auto`, {
      serviceOrderId,
    });
  }

  // Compat wrappers while the UI finishes moving from quotes to agreements.
  sendToClient(id: number): Observable<ServiceOrderAgreement> {
    return this.findOne(id);
  }

  approveByClient(id: number): Observable<ServiceOrderAgreement> {
    return this.confirm(id);
  }

  rejectByClient(id: number, notes?: string): Observable<ServiceOrderAgreement> {
    return this.voidAgreement(id, notes);
  }

  supersedeServiceOrderAgreement(id: number, payload: { products?: any[]; services?: any[]; notes?: string }): Observable<ServiceOrderAgreement> {
    return this.update(id, payload);
  }

  supersedeVoidedAgreement(id: number, payload: { products?: any[]; services?: any[]; notes?: string }): Observable<ServiceOrderAgreement> {
    return this.update(id, payload);
  }
}



