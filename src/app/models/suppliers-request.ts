export interface SupplierSaveRequest {
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
  isClient?: boolean;
  isSupplier?: boolean;
}

export type SupplierUpdateRequest = Partial<SupplierSaveRequest> & {
  id?: number;
};
