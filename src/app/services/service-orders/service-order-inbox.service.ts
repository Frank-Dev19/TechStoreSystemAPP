import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { config } from '../../../environments/environment';
import { PaginatedResponse } from './service-order.service';
import {
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadMessagesResponse,
  ServiceOrderInboxThreadOrderSummary,
  ServiceOrderInboxThreadSummary,
} from '../../models/service-orders/service-order-inbox';

@Injectable({ providedIn: 'root' })
export class ServiceOrderInboxService {
  private readonly serviceOrdersUrl = `${config.endpointServices}${config.serviceOrders.serviceOrders}`;
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

  getThreadByOrder(serviceOrderId: number): Observable<ServiceOrderInboxThreadSummary> {
    return this.http.get<ServiceOrderInboxThreadSummary>(`${this.serviceOrdersUrl}/${serviceOrderId}/inbox-thread`);
  }

  ensureThreadByOrder(serviceOrderId: number): Observable<ServiceOrderInboxThreadSummary> {
    return this.getThreadByOrder(serviceOrderId);
  }

  getMessages(threadId: number): Observable<ServiceOrderInboxThreadMessagesResponse> {
    return this.http.get<ServiceOrderInboxThreadMessagesResponse>(`${this.threadsUrl}/${threadId}/messages`);
  }

  getThreadOrders(threadId: number): Observable<ServiceOrderInboxThreadOrderSummary[]> {
    return this.http.get<ServiceOrderInboxThreadOrderSummary[]>(`${this.threadsUrl}/${threadId}/orders`);
  }

  markRead(threadId: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.threadsUrl}/${threadId}/read`, {});
  }

  replaceMessageOrders(messageId: number, serviceOrderIds: number[]): Observable<ServiceOrderInboxMessage> {
    return this.http.put<ServiceOrderInboxMessage>(
      `${config.endpointServices}/service-orders/inbox/messages/${messageId}/orders`,
      { serviceOrderIds },
    );
  }

  sendMessage(
    threadId: number,
    text: string,
    attachments: File[],
    serviceOrderIds: number[] = [],
  ): Observable<ServiceOrderInboxMessage> {
    const payload = new FormData();
    if (text.trim()) {
      payload.append('text', text.trim());
    }
    serviceOrderIds.forEach((serviceOrderId) => payload.append('serviceOrderIds', String(serviceOrderId)));
    attachments.forEach((attachment) => payload.append('attachments', attachment));

    return this.http.post<ServiceOrderInboxMessage>(`${this.threadsUrl}/${threadId}/messages`, payload);
  }

  downloadAttachmentBlob(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.attachmentsUrl}/${attachmentId}/download`, {
      responseType: 'blob',
    });
  }
}
