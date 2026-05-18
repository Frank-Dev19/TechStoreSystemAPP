// src/app/models/sales/document-series.model.ts
import { DocumentType } from './enums';

export interface DocumentSeries {
  id: number;
  companyId: number;
  documentType: DocumentType;
  code: string;
  name: string;
  isActive: boolean;
  currentNumber: number;
  startingNumber: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateDocumentSeriesDto {
  companyId: number;
  documentType: DocumentType;
  code: string;
  name: string;
  isActive?: boolean;
  startingNumber?: number;
  createdBy?: string;
}

export interface UpdateDocumentSeriesDto {
  name?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface NextNumberResponse {
  series: string;
  number: string;
}

export interface NextNumberFormattedResponse {
  formatted: string;
}
