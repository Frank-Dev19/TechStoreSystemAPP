import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ServiceOrderDiagnosis } from '../../models/service-orders/service-order-diagnosis';
import { ServiceOrderDiagnosisSaveRequest, ServiceOrderDiagnosisUpdateRequest } from '../../models/service-orders/service-order-diagnosis-request';
import { config } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ServiceOrderDiagnosisService {
  constructor(private base: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrderDiagnosis>> {
    return this.base.get<PaginatedResponse<ServiceOrderDiagnosis>>(config.serviceOrders.serviceOrderDiagnoses, { params });
  }

  findOne(id: number, withDeleted = false): Observable<ServiceOrderDiagnosis> {
    return this.base.get<ServiceOrderDiagnosis>(`${config.serviceOrders.serviceOrderDiagnoses}/${id}`, {
      params: { withDeleted: String(withDeleted) },
    });
  }

  create(payload: ServiceOrderDiagnosisSaveRequest): Observable<ServiceOrderDiagnosis> {
    return this.base.post<ServiceOrderDiagnosis>(config.serviceOrders.serviceOrderDiagnoses, payload);
  }

  update(id: number, payload: ServiceOrderDiagnosisUpdateRequest): Observable<ServiceOrderDiagnosis> {
    return this.base.patch<ServiceOrderDiagnosis>(`${config.serviceOrders.serviceOrderDiagnoses}/${id}`, payload);
  }

  softDelete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderDiagnoses}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderDiagnoses}/bulk-delete`, { ids });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderDiagnoses}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderDiagnoses}/bulk-restore`, { ids });
  }
}
