import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import { ElectronicDocument, SendInvoiceResponse } from '../../models/electronic-billing/electronic-document.model';

@Injectable({ providedIn: 'root' })
export class ElectronicBillingApiService {
  private readonly baseUrl = config.electronicBilling.base;

  constructor(private base: BaseService) {}

  getInvoicePayload(saleId: number): Observable<unknown> {
    return this.base.get<unknown>(`${this.baseUrl}/sales/${saleId}/invoice-payload`);
  }

  sendInvoice(saleId: number): Observable<SendInvoiceResponse> {
    return this.base.post<SendInvoiceResponse>(`${this.baseUrl}/sales/${saleId}/send-invoice`);
  }

  getDocumentBySale(saleId: number): Observable<ElectronicDocument> {
    return this.base.get<ElectronicDocument>(`${this.baseUrl}/sales/${saleId}/document`, {
      withLoader: false,
    });
  }
}
