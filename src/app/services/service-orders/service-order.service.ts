import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseService } from "../base.service";
import { ServiceOrder } from "../../models/service-orders/service-order";
import { ServiceOrderSaveRequest, ServiceOrderUpdateRequest } from "../../models/service-orders/service-order-request";
import { config } from "../../../environments/environment";

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class ServiceOrderService {
    constructor(private base: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrder>> {
        return this.base.get<PaginatedResponse<ServiceOrder>>(config.serviceOrders.serviceOrders, { params });
    }

    findOne(id: number): Observable<ServiceOrder> {
        return this.base.get<ServiceOrder>(`${config.serviceOrders.serviceOrders}/${id}`);
    }

    create(payload: ServiceOrderSaveRequest): Observable<ServiceOrder> {
        return this.base.post<ServiceOrder>(config.serviceOrders.serviceOrders, payload);
    }

    update(id: number, payload: ServiceOrderUpdateRequest): Observable<ServiceOrder> {
        return this.base.patch<ServiceOrder>(`${config.serviceOrders.serviceOrders}/${id}`, payload);
    }

    markPaid(id: number): Observable<ServiceOrder> {
        return this.base.patch<ServiceOrder>(`${config.serviceOrders.serviceOrders}/${id}`, { isPaid: true });
    }

    softDelete(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrders}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrders}/bulk-delete`, { ids });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrders}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrders}/bulk-restore`, { ids });
    }

    updateItem(itemId: number, payload: any): Observable<any> {
        return this.base.patch<any>(`${config.serviceOrders.serviceOrderItems}/${itemId}`, payload);
    }

    reassignTechnician(itemId: number, technicianId: number): Observable<any> {
        return this.base.patch<any>(`${config.serviceOrders.serviceOrderItems}/${itemId}/assign-technician`, { technicianId });
    }
}
