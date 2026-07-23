import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';

import {
  ServiceOrderInboxAttachment,
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadOrderSummary,
  ServiceOrderInboxThreadSummary,
} from '../../models/service-orders/service-order-inbox';
import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { hasAnyRole, SUPERVISOR_ROLE_NAMES, TECHNICIAN_ROLE_NAMES } from '../../utils/role.utils';

interface InboxDraftAttachment {
  file: File;
  previewUrl: string | null;
}

@Component({
  selector: 'app-service-order-inbox-page',
  standalone: false,
  templateUrl: './service-order-inbox.html',
  styleUrls: ['./service-order-inbox.scss'],
})
export class ServiceOrderInboxPage implements OnInit, OnDestroy {
  threads: ServiceOrderInboxThreadSummary[] = [];
  selectedThread: ServiceOrderInboxThreadSummary | null = null;
  messages: ServiceOrderInboxMessage[] = [];
  threadOrders: ServiceOrderInboxThreadOrderSummary[] = [];
  searchTerm = '';
  draftMessage = '';
  draftAttachments: InboxDraftAttachment[] = [];
  selectedComposerOrderIds: number[] = [];
  attachmentPreviewUrls: Record<number, string> = {};
  isLoadingThreads = false;
  isLoadingMessages = false;
  isSendingMessage = false;
  threadError = '';
  messageError = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly inboxService: ServiceOrderInboxService,
    private readonly currentUserService: CurrentUserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const queryMap = this.route.snapshot.queryParamMap;
    const serviceOrderId = Number(queryMap.get('serviceOrderId') ?? 0);
    const threadId = Number(queryMap.get('threadId') ?? 0);

    if (serviceOrderId > 0) {
      this.loadThreadFromOrder(serviceOrderId);
      return;
    }

    this.loadThreads(threadId > 0 ? threadId : null);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearAttachmentPreviews();
    this.clearDraftAttachments();
  }

  get isTechnicianViewer(): boolean {
    return hasAnyRole(this.currentUserService.value?.roles, TECHNICIAN_ROLE_NAMES);
  }

  get showSensitiveCustomerData(): boolean {
    return !this.isTechnicianViewer;
  }

  get searchPlaceholder(): string {
    return this.isTechnicianViewer
      ? 'Buscar cliente, código o equipo...'
      : 'Buscar cliente, código o teléfono...';
  }

  get contextCardTitle(): string {
    return this.isTechnicianViewer ? 'Contexto operativo' : 'Contexto del cliente';
  }

  get isCustomerServiceWindowOpen(): boolean {
    return this.isWithinCustomerServiceWindow(this.selectedThread?.lastCustomerMessageAt ?? null);
  }

  get showClosedWindowWarning(): boolean {
    return !!this.selectedThread && !this.isCustomerServiceWindowOpen;
  }

  get closedWindowMessage(): string {
    return 'La ventana de 24h está cerrada. No se puede enviar texto libre.';
  }

  get orderDetailRoute(): string {
    if (hasAnyRole(this.currentUserService.value?.roles, TECHNICIAN_ROLE_NAMES)) {
      return '/technician-panel';
    }

    if (hasAnyRole(this.currentUserService.value?.roles, SUPERVISOR_ROLE_NAMES)) {
      return '/supervisor-panel';
    }

    return '/reception-panel';
  }

  get filteredThreads(): ServiceOrderInboxThreadSummary[] {
    const normalized = this.searchTerm.trim().toLowerCase();
    if (!normalized) {
      return this.threads;
    }

    return this.threads.filter((thread) => {
      const haystack = [
        thread.clientAlias,
        thread.equipmentLabel,
        thread.serviceOrderCode ?? '',
        ...(thread.serviceOrderCodes ?? []),
        thread.lastMessageText ?? '',
        this.showSensitiveCustomerData ? thread.clientPhone ?? '' : '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }

  loadThreads(preferredThreadId?: number | null): void {
    this.isLoadingThreads = true;
    this.threadError = '';

    const request = this.inboxService
      .listThreads({ page: 1, limit: 100 })
      .pipe(finalize(() => (this.isLoadingThreads = false)))
      .subscribe({
        next: ({ data }) => {
          this.threads = data ?? [];
          const nextThread =
            this.threads.find((thread) => thread.id === preferredThreadId) ??
            (this.selectedThread ? this.threads.find((thread) => thread.id === this.selectedThread?.id) : null) ??
            this.threads[0] ??
            null;

          if (!nextThread) {
            this.selectedThread = null;
            this.messages = [];
            this.threadOrders = [];
            return;
          }

          this.selectThread(nextThread, false);
        },
        error: () => {
          this.threadError = 'No pudimos cargar las conversaciones.';
          this.threads = [];
          this.selectedThread = null;
          this.messages = [];
          this.threadOrders = [];
        },
      });

    this.subscriptions.add(request);
  }

  loadThreadFromOrder(serviceOrderId: number): void {
    this.isLoadingThreads = true;
    this.threadError = '';

    const request = this.inboxService
      .getThreadByOrder(serviceOrderId)
      .pipe(finalize(() => (this.isLoadingThreads = false)))
      .subscribe({
        next: (thread) => {
          this.selectedThread = thread;
          this.loadThreads(thread.id);
          this.loadThreadDetail(thread.id, false);
        },
        error: () => {
          this.threadError = 'No pudimos resolver la conversación para esa orden.';
          this.loadThreads(null);
        },
      });

    this.subscriptions.add(request);
  }

  selectThread(thread: ServiceOrderInboxThreadSummary, syncRoute = true): void {
    this.selectedThread = thread;
    this.loadThreadDetail(thread.id, syncRoute);
  }

  sendMessage(): void {
    const text = this.draftMessage.trim();
    if (!this.selectedThread || this.isSendingMessage || (!text && !this.draftAttachments.length)) {
      return;
    }

    if (!this.isCustomerServiceWindowOpen) {
      this.messageError = this.closedWindowMessage;
      return;
    }

    this.isSendingMessage = true;
    const attachments = this.draftAttachments.map((attachment) => attachment.file);
    const selectedOrderIds = [...this.selectedComposerOrderIds];

    const request = this.inboxService
      .sendMessage(this.selectedThread.id, text, attachments, selectedOrderIds)
      .pipe(finalize(() => (this.isSendingMessage = false)))
      .subscribe({
        next: () => {
          this.draftMessage = '';
          this.clearDraftAttachments();
          this.loadThreadDetail(this.selectedThread!.id, false);
        },
        error: (error) => {
          this.messageError = error?.error?.message || 'No pudimos enviar el mensaje.';
        },
      });

    this.subscriptions.add(request);
  }

  replaceMessageOrders(message: ServiceOrderInboxMessage, serviceOrderIds: number[]): void {
    const request = this.inboxService.replaceMessageOrders(message.id, serviceOrderIds).subscribe({
      next: (updatedMessage) => {
        this.messages = this.messages.map((entry) =>
          entry.id === message.id ? { ...entry, serviceOrderIds: updatedMessage.serviceOrderIds ?? [] } : entry,
        );
      },
      error: () => {
        this.messageError = 'No pudimos reasociar las órdenes del mensaje.';
      },
    });

    this.subscriptions.add(request);
  }

  onFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    if (!files.length) {
      return;
    }

    const nextAttachments = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    this.draftAttachments = [...this.draftAttachments, ...nextAttachments];
    target.value = '';
  }

  removeDraftAttachment(index: number): void {
    const attachment = this.draftAttachments[index];
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    this.draftAttachments.splice(index, 1);
  }

  downloadAttachment(attachment: ServiceOrderInboxAttachment): void {
    const request = this.inboxService.downloadAttachmentBlob(attachment.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = attachment.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
    });

    this.subscriptions.add(request);
  }

  getMessageOrders(message: ServiceOrderInboxMessage): ServiceOrderInboxThreadOrderSummary[] {
    const ids = new Set(message.serviceOrderIds ?? []);
    return this.threadOrders.filter((order) => ids.has(order.id));
  }

  isMessagePendingAssociation(message: ServiceOrderInboxMessage): boolean {
    return (message.serviceOrderIds ?? []).length === 0;
  }

  getThreadSecondaryMeta(thread: ServiceOrderInboxThreadSummary): string {
    const parts = [thread.equipmentLabel || 'Sin equipo'];
    if (this.showSensitiveCustomerData) {
      parts.unshift(thread.clientPhone || 'Sin teléfono');
    }
    return parts.filter(Boolean).join(' · ');
  }

  trackByThreadId(_: number, thread: ServiceOrderInboxThreadSummary): number {
    return thread.id;
  }

  trackByMessageId(_: number, message: ServiceOrderInboxMessage): number {
    return message.id;
  }

  trackByOrderId(_: number, order: ServiceOrderInboxThreadOrderSummary): number {
    return order.id;
  }

  private loadThreadDetail(threadId: number, syncRoute: boolean): void {
    this.isLoadingMessages = true;
    this.messageError = '';

    const request = forkJoin({
      response: this.inboxService.getMessages(threadId),
      orders: this.inboxService.getThreadOrders(threadId),
      markRead: this.inboxService.markRead(threadId).pipe(catchError(() => of({ ok: false }))),
    })
      .pipe(finalize(() => (this.isLoadingMessages = false)))
      .subscribe({
        next: ({ response, orders }) => {
          this.selectedThread = response.thread;
          this.messages = response.messages ?? [];
          this.messageError = '';
          this.threadOrders = orders ?? response.thread.orders ?? [];
          this.selectedComposerOrderIds = this.resolveDefaultComposerOrderIds(response.thread, this.threadOrders);
          this.threads = this.threads.map((thread) =>
            thread.id === response.thread.id ? { ...response.thread, unreadCount: 0 } : thread,
          );
          this.clearAttachmentPreviews();
          this.hydrateAttachmentPreviews(this.messages);
          if (syncRoute) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                threadId: response.thread.id,
                serviceOrderId: response.thread.serviceOrderId ?? undefined,
              },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
          }
        },
        error: () => {
          this.messageError = 'No pudimos cargar el detalle de la conversación.';
          this.messages = [];
          this.threadOrders = [];
        },
      });

    this.subscriptions.add(request);
  }

  private resolveDefaultComposerOrderIds(
    thread: ServiceOrderInboxThreadSummary,
    orders: ServiceOrderInboxThreadOrderSummary[],
  ): number[] {
    if (orders.length === 1) {
      return [orders[0].id];
    }

    if ((thread.activeServiceOrderIds ?? []).length === 1) {
      return [thread.activeServiceOrderIds![0]];
    }

    return [];
  }

  private hydrateAttachmentPreviews(messages: ServiceOrderInboxMessage[]): void {
    messages
      .flatMap((message) => (message.attachments ?? []).filter((attachment) => attachment.previewable))
      .forEach((attachment) => {
        if (this.attachmentPreviewUrls[attachment.id]) {
          return;
        }

        const request = this.inboxService.downloadAttachmentBlob(attachment.id).subscribe({
          next: (blob) => {
            this.attachmentPreviewUrls[attachment.id] = URL.createObjectURL(blob);
          },
        });

        this.subscriptions.add(request);
      });
  }

  private clearAttachmentPreviews(): void {
    Object.values(this.attachmentPreviewUrls).forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    this.attachmentPreviewUrls = {};
  }

  private clearDraftAttachments(): void {
    this.draftAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    this.draftAttachments = [];
  }

  private isWithinCustomerServiceWindow(lastCustomerMessageAt: string | null | undefined): boolean {
    if (!lastCustomerMessageAt) {
      return false;
    }

    const lastCustomerActivityAt = new Date(lastCustomerMessageAt).getTime();
    if (!Number.isFinite(lastCustomerActivityAt)) {
      return false;
    }

    return Date.now() - lastCustomerActivityAt <= 24 * 60 * 60 * 1000;
  }
}
