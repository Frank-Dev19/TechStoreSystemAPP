export const ClientKind = {
  PERSON: 'PERSON',
  COMPANY: 'COMPANY',
} as const;

export type ClientKind = (typeof ClientKind)[keyof typeof ClientKind];

export interface ClientContactRequest {
  id?: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface ClientSaveRequest {
  companyId?: number;
  name: string;
  tradeName?: string;
  kind?: ClientKind;
  documentTypeId: number;
  documentNumber: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isClient?: boolean;
  isSupplier?: boolean;
  contacts?: ClientContactRequest[];
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
