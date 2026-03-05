export interface ClientSaveRequest {
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

export interface ClientDeleteRequest {
  id: number;
}

export interface ClientBulkDeleteRequest {
  ids: number[];
}

export type ClientUpdateRequest = Partial<ClientSaveRequest> & {
  id?: number;
};
