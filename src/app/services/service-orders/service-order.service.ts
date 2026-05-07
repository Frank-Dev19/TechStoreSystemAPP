import { Injectable } from "@angular/core";
import { Observable, throwError } from "rxjs";
import { BaseService } from "../base.service";
import {
  ServiceOrder,
  ServiceOrderTechnicalStatus,
  ServiceType,
} from "../../models/service-orders/service-order";
import {
  ServiceOrderBatchCreateRequest,
  ServiceOrderBatchCreateResponse,
  ServiceOrderSaveRequest,
  ServiceOrderUpdateRequest,
} from "../../models/service-orders/service-order-request";
import { config } from "../../../environments/environment";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TechnicianAssignmentSuggestionRow {
  technicianId: number;
  technicianName: string;
  totalActiveCount: number;
  totalAssignedCount: number;
  activeCountForServiceType: number;
  assignedCountForServiceType: number;
  lastAssignedAt: string | null;
  activeByType: Array<{
    serviceType: ServiceType;
    activeCount: number;
    assignedCount: number;
  }>;
  isSuggested: boolean;
}

export interface TechnicianAssignmentSuggestion {
  serviceType: ServiceType;
  suggestedTechnicianId: number;
  technicians: TechnicianAssignmentSuggestionRow[];
}

@Injectable({ providedIn: 'root' })
export class ServiceOrderService {
  constructor(private base: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrder>> {
    const nextParams = { ...params };
    delete nextParams['includeItems'];
    return this.base.get<PaginatedResponse<ServiceOrder>>(config.serviceOrders.serviceOrders, { params: nextParams });
  }

  findOne(id: number): Observable<ServiceOrder> {
    return this.base.get<ServiceOrder>(`${config.serviceOrders.serviceOrders}/${id}`);
  }

  getTechnicianSuggestion(serviceType: ServiceType): Observable<TechnicianAssignmentSuggestion> {
    return this.base.get<TechnicianAssignmentSuggestion>(
      `${config.serviceOrders.serviceOrders}/technician-suggestion`,
      { params: { serviceType } },
    );
  }

  create(payload: ServiceOrderSaveRequest): Observable<ServiceOrder> {
    return this.base.post<ServiceOrder>(config.serviceOrders.serviceOrders, payload);
  }

  createBatch(payload: ServiceOrderBatchCreateRequest): Observable<ServiceOrderBatchCreateResponse> {
    return this.base.post<ServiceOrderBatchCreateResponse>(`${config.serviceOrders.serviceOrders}/batch`, payload);
  }

  update(id: number, payload: ServiceOrderUpdateRequest): Observable<ServiceOrder> {
    return this.base.patch<ServiceOrder>(`${config.serviceOrders.serviceOrders}/${id}`, payload);
  }

  markAsDelivered(id: number): Observable<ServiceOrder> {
    return this.base.patch<ServiceOrder>(`${config.serviceOrders.serviceOrders}/${id}/deliver`, {});
  }

  markPaid(id: number): Observable<ServiceOrder> {
    return throwError(() => new Error(`markPaid(${id}) fue eliminado: el estado económico depende solo de comprobantes vinculados.`));
  }

  assignTechnician(id: number, technicianId: number): Observable<ServiceOrder> {
    return this.base.patch<ServiceOrder>(
      `${config.serviceOrders.serviceOrders}/${id}/assign-technician`,
      { technicianId },
    );
  }

  changeTechnicalStatus(
    id: number,
    status: ServiceOrderTechnicalStatus,
    reason?: string,
  ): Observable<ServiceOrder> {
    return this.base.patch<ServiceOrder>(
      `${config.serviceOrders.serviceOrders}/${id}/technical/${status}`,
      reason ? { reason } : {},
    );
  }

  softDelete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrders}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(
      `${config.serviceOrders.serviceOrders}/bulk-delete`,
      { ids },
    );
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrders}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.base.post<{ ok: boolean; message: string }>(
      `${config.serviceOrders.serviceOrders}/bulk-restore`,
      { ids },
    );
  }
}
