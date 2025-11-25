import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseService } from "../base.service";
import { TicketItem, TicketItemStatus } from "../../models/tickets/ticket-item";
import { TicketItemSaveRequest, TicketItemUpdateRequest } from "../../models/tickets/ticket-item-request";
import { config } from "../../../environments/environment";

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

@Injectable({ providedIn: 'root' })
export class TicketItemService {
    constructor(private base: BaseService) { }

    findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<TicketItem>> {
        return this.base.get<PaginatedResponse<TicketItem>>(config.tickets.ticketItems, { params });
    }

    findOne(id: number, withDeleted = false): Observable<TicketItem> {
        return this.base.get<TicketItem>(`${config.tickets.ticketItems}/${id}`, {
            params: { withDeleted: String(withDeleted) },
        });
    }

    create(payload: TicketItemSaveRequest): Observable<TicketItem> {
        return this.base.post<TicketItem>(config.tickets.ticketItems, payload);
    }

    update(id: number, payload: TicketItemUpdateRequest): Observable<TicketItem> {
        return this.base.patch<TicketItem>(`${config.tickets.ticketItems}/${id}`, payload);
    }

    softDelete(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.delete<{ ok: boolean; message: string }>(`${config.tickets.ticketItems}/${id}`);
    }

    bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.ticketItems}/bulk-delete`, { ids });
    }

    restore(id: number): Observable<{ ok: boolean; message: string }> {
        return this.base.patch<{ ok: boolean; message: string }>(`${config.tickets.ticketItems}/${id}/restore`);
    }

    bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
        return this.base.post<{ ok: boolean; message: string }>(`${config.tickets.ticketItems}/bulk-restore`, { ids });
    }

    assignTechnician(itemId: number, technicianId: number): Observable<TicketItem> {
        return this.base.patch<TicketItem>(`${config.tickets.ticketItems}/${itemId}/assign`, { technicianId });
    }

    changeStatus(itemId: number, status: TicketItemStatus): Observable<TicketItem> {
        return this.base.patch<TicketItem>(`${config.tickets.ticketItems}/${itemId}/status/${status}`);
    }
}
