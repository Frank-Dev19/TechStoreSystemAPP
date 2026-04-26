import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { config } from '../../../environments/environment';
import { PaginatedResponse } from './service-order.service';
import {
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadMessagesResponse,
  ServiceOrderInboxThreadSummary,
} from '../../models/service-orders/service-order-inbox';

@Injectable({ providedIn: 'root' })
export class ServiceOrderInboxService {
  private readonly threadsUrl = `${config.endpointServices}${config.serviceOrders.serviceOrderInboxThreads}`;
  private readonly attachmentsUrl = `${config.endpointServices}${config.serviceOrders.serviceOrderInboxAttachments}`;

  constructor(private readonly http: HttpClient) {}

  listThreads(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ServiceOrderInboxThreadSummary>> {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return this.http.get<PaginatedResponse<ServiceOrderInboxThreadSummary>>(this.threadsUrl, { params: httpParams });
  }

  ensureThreadByOrder(serviceOrderId: number): Observable<ServiceOrderInboxThreadSummary | null> {
    return this.listThreads({ page: 1, limit: 1, serviceOrderId, ensure: true }).pipe(
      map((response) => response.data?.[0] ?? null),
    );
  }

  getMessages(threadId: number): Observable<ServiceOrderInboxThreadMessagesResponse> {
    return this.http.get<ServiceOrderInboxThreadMessagesResponse>(`${this.threadsUrl}/${threadId}/messages`);
  }

  markRead(threadId: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.threadsUrl}/${threadId}/read`, {});
  }

  sendMessage(threadId: number, text: string, attachments: File[]): Observable<ServiceOrderInboxMessage> {
    const payload = new FormData();
    if (text.trim()) {
      payload.append('text', text.trim());
    }
    attachments.forEach((attachment) => payload.append('attachments', attachment));

    return this.http.post<ServiceOrderInboxMessage>(`${this.threadsUrl}/${threadId}/messages`, payload);
  }

  downloadAttachmentBlob(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.attachmentsUrl}/${attachmentId}/download`, {
      responseType: 'blob',
    });
  }
}
