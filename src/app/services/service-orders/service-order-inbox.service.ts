import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { config } from '../../../environments/environment';
import { PaginatedResponse } from './service-order.service';
import {
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadMessagesResponse,
  ServiceOrderInboxThreadOrderSummary,
  ServiceOrderInboxThreadSummary,
} from '../../models/service-orders/service-order-inbox';
import { AuthSessionService } from '../auth-session.service';

@Injectable({ providedIn: 'root' })
export class ServiceOrderInboxService {
  private readonly serviceOrdersUrl = `${config.endpointServices}${config.serviceOrders.serviceOrders}`;
  private readonly threadsUrl = `${config.endpointServices}${config.serviceOrders.serviceOrderInboxThreads}`;
  private readonly attachmentsUrl = `${config.endpointServices}${config.serviceOrders.serviceOrderInboxAttachments}`;

  constructor(
    private readonly http: HttpClient,
    private readonly authSession: AuthSessionService,
  ) {}

  watchChanges(): Observable<void> {
    return new Observable<void>((subscriber) => {
      const abortController = new AbortController();

      const connect = async (): Promise<void> => {
        while (!abortController.signal.aborted) {
          try {
            let token = this.authSession.getAccessToken();
            let response = await this.openEventStream(token, abortController.signal);
            if (response.status === 401) {
              token = await firstValueFrom(this.authSession.refreshAccessToken());
              response = await this.openEventStream(token, abortController.signal);
            }
            if (!response.ok || !response.body) {
              throw new Error(`Inbox event stream failed with status ${response.status}`);
            }

            await this.consumeEventStream(response.body, subscriber, abortController.signal);
          } catch {
            if (!abortController.signal.aborted) {
              await new Promise((resolve) => setTimeout(resolve, 2_000));
            }
          }
        }
      };

      void connect();
      return () => abortController.abort();
    });
  }

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

  private openEventStream(token: string | null, signal: AbortSignal): Promise<Response> {
    const headers = new Headers({ Accept: 'text/event-stream' });
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${config.endpointServices}/service-orders/inbox/events`, {
      headers,
      signal,
      credentials: 'include',
    });
  }

  private async consumeEventStream(
    body: ReadableStream<Uint8Array>,
    subscriber: { next: (value: void) => void },
    signal: AbortSignal,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      frames.forEach((frame) => {
        if (frame.split(/\r?\n/).some((line) => line.trim() === 'event: inbox.changed')) {
          subscriber.next();
        }
      });
    }
  }
}
