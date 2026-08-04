import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
  ElectronicDocument,
  SendElectronicDocumentEmailResponse,
  SendInvoiceResponse,
} from '../../models/electronic-billing/electronic-document.model';

@Injectable({ providedIn: 'root' })
export class ElectronicBillingApiService {
  private readonly baseUrl = config.electronicBilling.base;

  constructor(
    private base: BaseService,
    private http: HttpClient,
  ) {}

  getInvoicePayload(saleId: number): Observable<unknown> {
    return this.base.get<unknown>(`${this.baseUrl}/sales/${saleId}/invoice-payload`);
  }

  sendInvoice(saleId: number): Observable<SendInvoiceResponse> {
    return this.base.post<SendInvoiceResponse>(`${this.baseUrl}/sales/${saleId}/send-invoice`);
  }

  sendDocumentEmail(saleId: number, to?: string): Observable<SendElectronicDocumentEmailResponse> {
    return this.base.post<SendElectronicDocumentEmailResponse>(`${this.baseUrl}/sales/${saleId}/email`, {
      ...(to ? { to } : {}),
    });
  }

  getDocumentBySale(saleId: number): Observable<ElectronicDocument> {
    return this.base.get<ElectronicDocument>(`${this.baseUrl}/sales/${saleId}/document`, {
      withLoader: false,
    });
  }

  downloadPdf(saleId: number): Observable<Blob> {
    return this.downloadFile(`${this.baseUrl}/sales/${saleId}/pdf`);
  }

  downloadXml(saleId: number): Observable<Blob> {
    return this.downloadFile(`${this.baseUrl}/sales/${saleId}/xml`);
  }

  downloadCdr(saleId: number): Observable<Blob> {
    return this.downloadFile(`${this.baseUrl}/sales/${saleId}/cdr`);
  }

  private downloadFile(path: string): Observable<Blob> {
    return this.http.get(`${config.endpointServices}${path}`, {
      responseType: 'blob',
    });
  }
}
