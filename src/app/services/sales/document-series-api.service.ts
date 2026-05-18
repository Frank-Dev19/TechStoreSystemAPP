// src/app/services/sales/document-series-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import { DocumentType } from '../../models/sales/enums';
import {
  DocumentSeries,
  CreateDocumentSeriesDto,
  UpdateDocumentSeriesDto,
  NextNumberResponse,
  NextNumberFormattedResponse,
} from '../../models/sales/document-series.model';

@Injectable({ providedIn: 'root' })
export class DocumentSeriesApiService {
  private readonly baseUrl = config.sales.documentSeries;

  constructor(private readonly baseService: BaseService) { }

  create(createDto: CreateDocumentSeriesDto): Observable<DocumentSeries> {
    return this.baseService.post<DocumentSeries>(this.baseUrl, createDto);
  }

  findAll(companyId: number): Observable<DocumentSeries[]> {
    return this.baseService.get<DocumentSeries[]>(`${this.baseUrl}?companyId=${companyId}`);
  }

  findActive(companyId: number, documentType?: DocumentType): Observable<DocumentSeries[]> {
    let url = `${this.baseUrl}/active?companyId=${companyId}`;
    if (documentType) {
      url += `&documentType=${documentType}`;
    }
    return this.baseService.get<DocumentSeries[]>(url);
  }

  getNextNumber(companyId: number, documentType: DocumentType): Observable<NextNumberResponse> {
    return this.baseService.get<NextNumberResponse>(`${this.baseUrl}/next-number?companyId=${companyId}&documentType=${documentType}`);
  }

  previewNextNumber(companyId: number, documentType: DocumentType): Observable<NextNumberResponse> {
    return this.baseService.get<NextNumberResponse>(`${this.baseUrl}/preview-next-number?companyId=${companyId}&documentType=${documentType}`);
  }

  getNextNumberFormatted(companyId: number, documentType: DocumentType): Observable<NextNumberFormattedResponse> {
    return this.baseService.get<NextNumberFormattedResponse>(`${this.baseUrl}/next-number-formatted?companyId=${companyId}&documentType=${documentType}`);
  }

  findOne(id: number): Observable<DocumentSeries> {
    return this.baseService.get<DocumentSeries>(`${this.baseUrl}/${id}`);
  }

  update(id: number, updateDto: UpdateDocumentSeriesDto): Observable<DocumentSeries> {
    return this.baseService.patch<DocumentSeries>(`${this.baseUrl}/${id}`, updateDto);
  }

  remove(id: number): Observable<void> {
    return this.baseService.delete<void>(`${this.baseUrl}/${id}`);
  }
}
