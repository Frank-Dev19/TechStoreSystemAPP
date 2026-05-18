import { ClientKind } from './clients-request';

export interface ClientContactResponse {
  id: number;
  clientId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ClientResponse {
  id: number;
  companyId: number;
  name: string;
  tradeName?: string | null;
  kind?: ClientKind;
  documentTypeId: number;
  documentNumber: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  ubigeo?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  urbanization?: string | null;
  countryCode?: string | null;
  city?: string | null;
  country?: string | null;
  isClient?: boolean;
  isSupplier?: boolean;
  documentType?: { id: number; name: string; sunatCode?: string | null; kind?: ClientKind | null } | null;
  contacts?: ClientContactResponse[] | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface ClientsPaginatedResponse {
  data: ClientResponse[];
  total: number;
  page: number;
  limit: number;
}
