import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseService } from "../base.service";
import { Ticket } from "../../models/tickets/ticket";
import { TicketSaveRequest, TicketUpdateRequest } from "../../models/tickets/ticket-request";
import { config } from "../../../environments/environment";

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
    constructor(private base: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<Ticket>> {
        return this.base.get<PaginatedResponse<Ticket>>(config.tickets.tickets, { params });
    }

    findOne(id: number): Observable<Ticket> {
        return this.base.get<Ticket>(`${config.tickets.tickets}/${id}`);
    }

    create(payload: TicketSaveRequest): Observable<Ticket> {
        return this.base.post<Ticket>(config.tickets.tickets, payload);
    }

    update(id: number, payload: TicketUpdateRequest): Observable<Ticket> {
        return this.base.patch<Ticket>(`${config.tickets.tickets}/${id}`, payload);
    }

    softDelete(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.tickets.tickets}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.tickets}/bulk-delete`, { ids });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.tickets.tickets}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.tickets}/bulk-restore`, { ids });
    }

    updateItem(itemId: number, payload: any): Observable<any> {
        return this.base.patch<any>(`${config.tickets.ticketItems}/${itemId}`, payload);
    }

    reassignTechnician(itemId: number, technicianId: number): Observable<any> {
        return this.base.patch<any>(`${config.tickets.ticketItems}/${itemId}/assign-technician`, { technicianId });
    }
}
