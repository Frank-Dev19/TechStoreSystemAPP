export interface BusinessPartnerSaveRequest {
    companyId?: number;
    name: string;
    tradeName?: string;
    documentTypeId: number;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    isClient: boolean;
    isSupplier: boolean;
}

export interface BusinessPartnerDeleteRequest {
    id: number;
}

export interface BusinessPartnerBulkDeleteRequest {
    ids: number[];
}

export type BusinessPartnerUpdateRequest = Partial<BusinessPartnerSaveRequest> & {
    id?: number;
};



