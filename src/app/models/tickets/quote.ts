export interface Quote {
    id: number;
    ticketItemId: number;
    diagnosisId: number;
    sequenceNumber: number;
    status: QuoteStatus;
    totalAmount: number;
    currency: string;
    notes: string;
    productItems: QuoteProduct[];
    serviceItems: QuoteService[];
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
}

export enum QuoteStatus {
    CURRENT = 'CURRENT',
    ARCHIVED = 'ARCHIVED'
}