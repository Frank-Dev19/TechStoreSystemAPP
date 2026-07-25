import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { auditTime, catchError, finalize, forkJoin, of, Subscription } from 'rxjs';

import {
  ServiceOrderInboxAttachment,
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadOrderSummary,
  ServiceOrderInboxThreadSummary,
} from '../../models/service-orders/service-order-inbox';
import { ServiceOrderDiagnosis } from '../../models/service-orders/service-order-diagnosis';
import { ServiceOrderAgreement } from '../../models/service-orders/service-agreement';
import { ServiceOrder, ServiceType } from '../../models/service-orders/service-order';
import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import {
  ADMIN_ROLE_NAMES,
  hasAnyRole,
  SUPERVISOR_ROLE_NAMES,
  TECHNICIAN_ROLE_NAMES,
} from '../../utils/role.utils';

interface InboxDraftAttachment {
  file: File;
  previewUrl: string | null;
}

const SERVICE_ORDER_LABELS: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En proceso',
  LISTA_PARA_ENTREGA: 'Lista para entrega',
  ENTREGADA: 'Entregada',
  CANCELADA: 'Cancelada',
  CERRADA_SIN_SOLUCION: 'Cerrada sin solución',
  PENDIENTE_ASIGNACION: 'Pendiente de asignación',
  ASIGNADA: 'Asignada',
  EN_DIAGNOSTICO: 'En diagnóstico',
  DIAGNOSTICADA: 'Diagnosticada',
  PENDIENTE_DEFINICION_COMERCIAL: 'Pendiente de definición comercial',
  AUTORIZADA_PARA_EJECUCION: 'Autorizada para ejecución',
  EN_EJECUCION: 'En ejecución',
  BLOQUEADA: 'Bloqueada',
  ESPERANDO_REPUESTOS_O_TERCERO: 'Esperando repuestos o servicio externo',
  RESUELTA: 'Resuelta',
  SIN_SOLUCION: 'Sin solución',
  NO_REQUIERE: 'No requiere',
  PENDIENTE_PROPUESTA: 'Pendiente de propuesta',
  PROPUESTA_EMITIDA: 'Propuesta emitida',
  PENDIENTE_RESPUESTA_CLIENTE: 'Pendiente de respuesta del cliente',
  AUTORIZADA: 'Autorizada',
  RECHAZADA: 'Rechazada',
  EXPIRADA: 'Expirada',
  REEMPLAZADA: 'Reemplazada',
  NO_APLICA: 'No aplica',
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  TOTAL: 'Pagada',
  EXONERADO: 'Exonerado',
  REVERTIDO: 'Revertido',
  CURRENT: 'Vigente',
  SUPERSEDED: 'Reemplazado',
  REPAIRABLE: 'Reparable',
  IRREPARABLE: 'Irreparable',
  NOT_COST_EFFECTIVE: 'Reparación no conveniente',
  NO_PARTS_AVAILABLE: 'Sin repuestos disponibles',
  NO_FAULT_FOUND: 'No se encontró ninguna falla',
  WARRANTY_APPLIES: 'Aplica garantía',
  WARRANTY_REJECTED: 'Garantía rechazada',
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  VOIDED: 'Anulado',
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CLIENT: 'Cliente',
  TECHNICIAN: 'Técnico',
  RECEPTION: 'Recepción',
  SUPERVISOR: 'Supervisor',
  SYSTEM: 'Sistema',
  QUEUED: 'En cola',
  SENT: 'Enviado',
  DELIVERED: 'Entregado',
  READ: 'Leído',
  RECEIVED: 'Recibido',
  FAILED: 'Fallido',
  SKIPPED: 'Omitido',
};

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  LAPTOP: 'Laptop',
  DESKTOP_PC: 'Computadora de escritorio',
  ALL_IN_ONE: 'Todo en uno',
  PRINTER: 'Impresora',
  SCANNER: 'Escáner',
  PROJECTOR: 'Proyector',
  MONITOR: 'Monitor',
  SERVER: 'Servidor',
  NETWORK_DEVICE: 'Equipo de red',
  OTHER: 'Otro',
};

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
  attachmentPreviewUrls: Record<number, string> = {};
  selectedOrderDetail: ServiceOrder | null = null;
  selectedOrderDiagnoses: ServiceOrderDiagnosis[] = [];
  selectedOrderAgreements: ServiceOrderAgreement[] = [];
  orderDetailTab: 'general' | 'diagnosis' | 'agreement' = 'general';
  isOrderDetailOpen = false;
  isLoadingOrderDetail = false;
  orderDetailError = '';
  isLoadingThreads = false;
  isLoadingMessages = false;
  isSendingMessage = false;
  threadError = '';
  messageError = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly inboxService: ServiceOrderInboxService,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosisService: ServiceOrderDiagnosisService,
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly currentUserService: CurrentUserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.subscribeToInboxChanges();
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
    const roles = this.currentUserService.value?.roles;
    return (
      hasAnyRole(roles, SUPERVISOR_ROLE_NAMES) ||
      hasAnyRole(roles, ADMIN_ROLE_NAMES)
    );
  }

  get searchPlaceholder(): string {
    return this.showSensitiveCustomerData
      ? 'Buscar cliente, código o teléfono...'
      : 'Buscar cliente, código o equipo...';
  }

  get contextCardTitle(): string {
    return this.showSensitiveCustomerData ? 'Contexto del cliente' : 'Contexto operativo';
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
    this.selectedThread = { ...thread, unreadCount: 0 };
    this.clearThreadUnreadCount(thread.id);
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
    const request = this.inboxService
      .sendMessage(this.selectedThread.id, text, attachments)
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

  getInitials(value: string | null | undefined): string {
    const parts = String(value ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return 'CL';
    }

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  formatStatus(value: string | null | undefined): string {
    if (!value) {
      return 'Sin etapa';
    }

    return SERVICE_ORDER_LABELS[value] ?? 'Estado no reconocido';
  }

  openOrderDetail(order: ServiceOrderInboxThreadOrderSummary): void {
    this.isOrderDetailOpen = true;
    this.isLoadingOrderDetail = true;
    this.orderDetailError = '';
    this.orderDetailTab = 'general';
    this.selectedOrderDetail = null;
    this.selectedOrderDiagnoses = [];
    this.selectedOrderAgreements = [];

    const request = forkJoin({
      order: this.serviceOrderService.findOne(order.id),
      diagnoses: this.diagnosisService
        .findAll({ serviceOrderId: order.id, page: 1, limit: 100 })
        .pipe(catchError(() => of({ data: [], total: 0, page: 1, limit: 100 }))),
      agreements: this.agreementService
        .findAll({ serviceOrderId: order.id, page: 1, limit: 100 })
        .pipe(catchError(() => of({ data: [], total: 0, page: 1, limit: 100 }))),
    })
      .pipe(finalize(() => (this.isLoadingOrderDetail = false)))
      .subscribe({
        next: ({ order: detail, diagnoses, agreements }) => {
          this.selectedOrderDetail = detail;
          this.selectedOrderDiagnoses = diagnoses.data ?? [];
          this.selectedOrderAgreements = agreements.data ?? [];
        },
        error: () => {
          this.orderDetailError = 'No pudimos cargar los detalles de la orden.';
        },
      });

    this.subscriptions.add(request);
  }

  closeOrderDetail(): void {
    this.isOrderDetailOpen = false;
    this.selectedOrderDetail = null;
    this.selectedOrderDiagnoses = [];
    this.selectedOrderAgreements = [];
    this.orderDetailError = '';
  }

  setOrderDetailTab(tab: 'general' | 'diagnosis' | 'agreement'): void {
    this.orderDetailTab = tab;
  }

  get orderHasDiagnosisFlow(): boolean {
    return this.selectedOrderDetail?.serviceType !== ServiceType.STANDARD_SERVICE;
  }

  formatServiceType(value: ServiceType | null | undefined): string {
    const labels: Record<ServiceType, string> = {
      [ServiceType.STANDARD_SERVICE]: 'Servicio estándar',
      [ServiceType.DIAGNOSIS]: 'Diagnóstico',
      [ServiceType.WARRANTY_SERVICE]: 'Garantía',
      [ServiceType.ASSEMBLY]: 'Ensamblaje',
      [ServiceType.CUSTOMER_SERVICE]: 'Atención al cliente',
    };
    return value ? labels[value] : 'Sin especificar';
  }

  formatEquipmentType(value: string | null | undefined, other?: string | null): string {
    if (value === 'OTHER' && other?.trim()) {
      return other.trim();
    }
    return value ? (EQUIPMENT_TYPE_LABELS[value] ?? 'Equipo no especificado') : 'Equipo no especificado';
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
          this.selectedThread = { ...response.thread, unreadCount: 0 };
          this.messages = response.messages ?? [];
          this.messageError = '';
          this.threadOrders = orders ?? response.thread.orders ?? [];
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

  private subscribeToInboxChanges(): void {
    const request = this.inboxService
      .watchChanges()
      .pipe(auditTime(250))
      .subscribe(() => {
        const selectedThreadId = this.selectedThread?.id ?? null;
        const threadsRequest = this.inboxService
          .listThreads({ page: 1, limit: 100 })
          .subscribe(({ data }) => {
            this.threads = (data ?? []).map((thread) =>
              thread.id === selectedThreadId ? { ...thread, unreadCount: 0 } : thread,
            );
            if (selectedThreadId) {
              const updatedSelection = this.threads.find((thread) => thread.id === selectedThreadId);
              if (updatedSelection) {
                this.selectedThread = updatedSelection;
              }
            }
          });
        this.subscriptions.add(threadsRequest);

        if (selectedThreadId) {
          this.loadThreadDetail(selectedThreadId, false);
        }
      });

    this.subscriptions.add(request);
  }

  private clearThreadUnreadCount(threadId: number): void {
    this.threads = this.threads.map((thread) =>
      thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
    );
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
