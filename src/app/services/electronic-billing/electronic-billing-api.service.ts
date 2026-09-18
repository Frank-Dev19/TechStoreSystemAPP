import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
  ElectronicDocument,
  ElectronicCreditNote,
  ElectronicCancellationResponse,
  ElectronicRefundResponse,
  SendElectronicDocumentEmailResponse,
  SendInvoicesBatchResponse,
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

  sendInvoicesBatch(saleIds: number[]): Observable<SendInvoicesBatchResponse> {
    return this.base.post<SendInvoicesBatchResponse>(`${this.baseUrl}/invoices/batch`, { saleIds });
  }

  requestCancellation(
    saleId: number,
    payload: { reason: string; observations?: string },
  ): Observable<ElectronicCancellationResponse> {
    return this.base.post<ElectronicCancellationResponse>(
      `${this.baseUrl}/sales/${saleId}/cancellation`,
      payload,
    );
  }

  refreshCancellationStatus(saleId: number): Observable<ElectronicCancellationResponse> {
    return this.base.post<ElectronicCancellationResponse>(
      `${this.baseUrl}/sales/${saleId}/cancellation/status`,
      {},
    );
  }

  requestFullRefund(
    saleId: number,
    payload: { reasonCode: '01' | '06'; reason: string; refundMethod: string; observations?: string },
  ): Observable<ElectronicRefundResponse> {
    return this.base.post<ElectronicRefundResponse>(
      `${this.baseUrl}/sales/${saleId}/refund`,
      payload,
    );
  }

  getCreditNoteBySale(saleId: number): Observable<ElectronicCreditNote> {
    return this.base.get<ElectronicCreditNote>(`${this.baseUrl}/sales/${saleId}/credit-note`, {
      withLoader: false,
    });
  }

  downloadCreditNotePdf(saleId: number): Observable<Blob> {
    return this.downloadFile(`${this.baseUrl}/sales/${saleId}/credit-note/pdf`);
  }

  downloadCreditNoteXml(saleId: number): Observable<Blob> {
    return this.downloadFile(`${this.baseUrl}/sales/${saleId}/credit-note/xml`);
  }

  downloadCreditNoteCdr(saleId: number): Observable<Blob> {
    return this.downloadFile(`${this.baseUrl}/sales/${saleId}/credit-note/cdr`);
  }

  sendCreditNoteEmail(saleId: number, to?: string): Observable<SendElectronicDocumentEmailResponse> {
    return this.base.post<SendElectronicDocumentEmailResponse>(
      `${this.baseUrl}/sales/${saleId}/credit-note/email`,
      { ...(to ? { to } : {}) },
    );
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
