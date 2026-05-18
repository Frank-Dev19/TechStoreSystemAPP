export type ClientImportSource = 'excel';

export type ClientImportStatus =
  | 'pending'
  | 'ready'
  | 'error'
  | 'duplicate'
  | 'omitted';

export interface ClientImportRowDraft {
  rowNumber: number;
  documentTypeId?: number | null;
  documentNumber?: string;
  name?: string;
  tradeName?: string;
  phone?: string;
  address?: string;
  ubigeo?: string;
  department?: string;
  province?: string;
  district?: string;
  urbanization?: string;
  countryCode?: string;
  city?: string;
  country?: string;
}

export interface ClientImportValidationRow extends ClientImportRowDraft {
  status: 'ready' | 'error' | 'duplicate';
  errors: string[];
  duplicateExistingClientId?: number;
}

export interface ClientImportValidateRequest {
  companyId: number;
  rows: ClientImportRowDraft[];
}

export interface ClientImportValidateResponse {
  rows: ClientImportValidationRow[];
  summary: {
    totalRows: number;
    readyRows: number;
    duplicateRows: number;
    errorRows: number;
  };
}

export interface ClientImportCommitRequest {
  companyId: number;
  rows: ClientImportRowDraft[];
}

export interface ClientImportCommitResponse {
  createdCount: number;
  skippedCount: number;
  summary: {
    totalRows: number;
    createdRows: number;
    skippedRows: number;
    failedRows: number;
  };
  skippedRows: ClientImportValidationRow[];
  failedRows: Array<ClientImportValidationRow & { errorMessage?: string }>;
}
