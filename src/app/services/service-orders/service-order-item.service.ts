import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseService } from "../base.service";
import { ServiceOrderItem, ServiceOrderItemStatus } from "../../models/service-orders/service-order-item";
import { ServiceOrderItemSaveRequest, ServiceOrderItemUpdateRequest } from "../../models/service-orders/service-order-item-request";
import { config } from "../../../environments/environment";

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class ServiceOrderItemService {
    constructor(private base: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrderItem>> {
        return this.base.get<PaginatedResponse<ServiceOrderItem>>(config.serviceOrders.serviceOrderItems, { params });
    }

    findOne(id: number, withDeleted = false): Observable<ServiceOrderItem> {
        return this.base.get<ServiceOrderItem>(`${config.serviceOrders.serviceOrderItems}/${id}`, {
            params: { withDeleted: String(withDeleted) },
        });
    }

    create(payload: ServiceOrderItemSaveRequest): Observable<ServiceOrderItem> {
        return this.base.post<ServiceOrderItem>(config.serviceOrders.serviceOrderItems, payload);
    }

    update(id: number, payload: ServiceOrderItemUpdateRequest): Observable<ServiceOrderItem> {
        return this.base.patch<ServiceOrderItem>(`${config.serviceOrders.serviceOrderItems}/${id}`, payload);
    }

    softDelete(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderItems}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderItems}/bulk-delete`, { ids });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderItems}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderItems}/bulk-restore`, { ids });
    }

    assignTechnician(itemId: number, technicianId: number): Observable<ServiceOrderItem> {
        return this.base.patch<ServiceOrderItem>(`${config.serviceOrders.serviceOrderItems}/${itemId}/assign-technician`, { technicianId });
    }

    changeStatus(itemId: number, status: ServiceOrderItemStatus): Observable<ServiceOrderItem> {
        return this.base.patch<ServiceOrderItem>(`${config.serviceOrders.serviceOrderItems}/${itemId}/status/${status}`);
    }

    requestRediagnosis(itemId: number, reason: string): Observable<ServiceOrderItem> {
        return this.base.patch<ServiceOrderItem>(`${config.serviceOrders.serviceOrderItems}/${itemId}/request-rediagnosis`, { reason });
    }
}
