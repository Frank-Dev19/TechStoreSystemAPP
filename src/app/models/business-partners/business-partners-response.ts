export interface BusinessPartnerResponse {
    id: number;
    companyId: number;
    name: string;
    tradeName?: string | null;
    documentTypeId: number;
    documentNumber: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    isClient: boolean;
    isSupplier: boolean;
    documentType?: { id: number; name: string } | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    deletedAt?: string | Date | null;
}

export interface BusinessPartnersPaginatedResponse {
    data: BusinessPartnerResponse[];
    total: number;
    page: number;
    limit: number;
}
