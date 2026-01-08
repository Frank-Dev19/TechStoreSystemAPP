import type { TicketItem } from "./ticket-item"
import type { Product } from "../catalog/product"
import type { Service } from "../service-catalog/service"

export interface Quote {
    id: number;
    ticketItemId: number;
    ticketItem?: TicketItem | null;
    diagnosisId: number;
    sequenceNumber: number;
    status: QuoteStatus;
    totalAmount: number;
    currency: string;
    notes: string;
    productItems: QuoteProduct[];
    serviceItems: QuoteService[];
    approvedBySupervisorId: number | null;
    approvedBySupervisorAt: Date | null;
    rejectedBySupervisorId: number | null;
    rejectedBySupervisorAt: Date | null;
    supervisorNotes: string | null;
    sentToClientAt: Date | null;
    clientApprovedAt: Date | null;
    clientRejectedAt: Date | null;
    clientNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface QuoteProduct {
    id: number;
    quoteId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    requiresPurchase: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    product?: Product | null;
}

export interface QuoteService {
    id: number;
    quoteId: number;
    serviceId: number;
    estimatedHours: number;
    unitPrice: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    service?: Service | null;
}

export enum QuoteStatus {
    PENDING_SUPERVISOR_APPROVAL = 'PENDING_SUPERVISOR_APPROVAL',
    SUPERVISOR_APPROVED = 'SUPERVISOR_APPROVED',
    SUPERVISOR_REJECTED = 'SUPERVISOR_REJECTED',
    SENT_TO_CLIENT = 'SENT_TO_CLIENT',
    AWAITING_CLIENT_RESPONSE = 'AWAITING_CLIENT_RESPONSE',
    CLIENT_APPROVED = 'CLIENT_APPROVED',
    CLIENT_REJECTED = 'CLIENT_REJECTED',
    CURRENT = 'CURRENT',
    ARCHIVED = 'ARCHIVED'
}
