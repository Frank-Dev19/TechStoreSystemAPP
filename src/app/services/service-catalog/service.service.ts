import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseService } from "../base.service";
import { Service } from "../../models/service-catalog/service";
import { ServiceSaveRequest, ServiceUpdateRequest } from "../../models/service-catalog/service-request";
import { config } from "../../../environments/environment";

export interface PaginatedRespones<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class ServiceService {
    constructor(private base: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedRespones<Service>> {
        return this.base.get<PaginatedRespones<Service>>(config.serviceCatalog.services, { params });
    }

    findOne(id: number): Observable<Service> {
        return this.base.get<Service>(`${config.serviceCatalog.services}/${id}`);
    }

    create(payload: ServiceSaveRequest): Observable<Service> {
        return this.base.post<Service>(config.serviceCatalog.services, payload);
    }

    update(id: number, payload: ServiceUpdateRequest): Observable<Service> {
        return this.base.patch<Service>(`${config.serviceCatalog.services}/${id}`, payload);
    }

    softDelete(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceCatalog.services}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceCatalog.services}/bulk-soft-delete`, {
            body: { ids },
        });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceCatalog.services}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.serviceCatalog.services}/bulk-restore`, {
            body: { ids },
        });
    }
}
