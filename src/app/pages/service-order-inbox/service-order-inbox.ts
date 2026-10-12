import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  auditTime,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  Subject,
  Subscription,
  tap,
} from 'rxjs';

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
  RECEPTIONIST_ROLE_NAMES,
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
  CANCELACION_SOLICITADA: 'Cancelación solicitada',
  LISTA_PARA_ENTREGA: 'Lista para entrega',
  ENTREGA_PARCIAL: 'Entrega parcial',
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
  GARANTIA_RECHAZADA: 'Garantía rechazada',
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

  @ViewChild('timeline') timeline?: ElementRef<HTMLElement>;
  folder: 'active' | 'archived' | 'all' = 'active';
  unreadOnly = false;
  totalThreads = 0;
  threadPage = 1;
  hasOlderMessages = false;
  olderCursor: number | null = null;
  isLoadingOlder = false;
  mobileChatOpen = false;
  contextDrawerOpen = false;
  orderSearch = '';
  linkableOrders: ServiceOrder[] = [];
  linkingOrder = false;
  linkError = '';
  private readonly searches = new Subject<string>();
  private readonly orderSearches = new Subject<string>();
  private readonly drafts = new Map<
    number,
    { text: string; attachments: InboxDraftAttachment[] }
  >();
  private listVersion = 0;
  private detailVersion = 0;
  private detailRequest?: Subscription;
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
    this.folder = this.isTechnicianViewer ? 'active' : 'all';
    this.subscriptions.add(
      this.searches
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => this.loadThreads()),
    );
    this.subscriptions.add(
      this.orderSearches.pipe(debounceTime(500), distinctUntilChanged()).subscribe((search) => {
        if (search.trim().length < 3) {
          this.linkableOrders = [];
          return;
        }
        this.subscriptions.add(
          this.serviceOrderService
            .findAll({ search: search.trim(), page: 1, limit: 20 })
            .subscribe({
              next: (response) => {
                if (this.orderSearch === search) this.linkableOrders = response.data;
              },
              error: () => (this.linkError = 'No pudimos buscar las órdenes.'),
            }),
        );
      }),
    );
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
    this.saveDraft();
    this.drafts.forEach((draft) =>
      draft.attachments.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }),
    );
    this.drafts.clear();
    this.searches.complete();
    this.orderSearches.complete();
  }

  get isTechnicianViewer(): boolean {
    const roles = this.currentUserService.value?.roles;
    return (
      hasAnyRole(roles, TECHNICIAN_ROLE_NAMES) &&
      !hasAnyRole(roles, [
        ...ADMIN_ROLE_NAMES,
        ...SUPERVISOR_ROLE_NAMES,
        ...RECEPTIONIST_ROLE_NAMES,
      ])
    );
  }

  get showSensitiveCustomerData(): boolean {
    const roles = this.currentUserService.value?.roles;
    return hasAnyRole(roles, SUPERVISOR_ROLE_NAMES) || hasAnyRole(roles, ADMIN_ROLE_NAMES);
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
    return this.threads;
  }
  get canCompose(): boolean {
    return (
      !!this.selectedThread &&
      this.selectedThread.canSend !== false &&
      this.isCustomerServiceWindowOpen
    );
  }
  get hasMoreThreads(): boolean {
    return this.threads.length < this.totalThreads;
  }
  searchChanged(): void {
    this.searches.next(this.searchTerm);
  }
  setFolder(folder: 'active' | 'archived' | 'all'): void {
    this.detailRequest?.unsubscribe();
    ++this.detailVersion;
    this.clearSelection();
    this.folder = folder;
    this.loadThreads();
  }
  toggleUnread(): void {
    this.unreadOnly = !this.unreadOnly;
    this.loadThreads();
  }
  loadMoreThreads(): void {
    if (!this.isLoadingThreads && this.hasMoreThreads) this.loadThreads(null, true);
  }

  loadThreads(preferredThreadId?: number | null, append = false, refresh = false): void {
    if (refresh && this.isLoadingThreads) return;
    const version = ++this.listVersion;
    const page = append ? this.threadPage + 1 : 1;
    this.isLoadingThreads = true;
    this.threadError = '';
    const query = { limit: 30, folder: this.folder, search: this.searchTerm.trim(), unread: this.unreadOnly };
    // Refresh only explicitly loaded pages and preserve pagination position.
    const source = refresh
      ? forkJoin(Array.from({ length: this.threadPage }, (_, index) => this.inboxService.listThreads({ ...query, page: index + 1 }))).pipe(map(pages => ({ ...pages[0], data: pages.flatMap(result => result.data ?? []) })))
      : this.inboxService.listThreads({ ...query, page });
    this.subscriptions.add(
      source
        .pipe(
          finalize(() => {
            if (version === this.listVersion) this.isLoadingThreads = false;
          }),
        )
        .subscribe({
          next: ({ data, total }) => {
            if (version !== this.listVersion) return;
            if (!refresh) this.threadPage = page;
            this.totalThreads = total;
            const combined = append ? [...this.threads, ...(data ?? [])] : (data ?? []);
            this.threads = [
              ...new Map(combined.map((thread) => [Number(thread.id), thread])).values(),
            ];
            const preferred = this.threads.find(
              (thread) => Number(thread.id) === Number(preferredThreadId),
            );
            if (preferred && preferred.id !== this.selectedThread?.id)
              this.selectThread(preferred, false);
            else if (!this.selectedThread && this.threads.length)
              this.selectThread(this.threads[0], false);
          },
          error: () => {
            if (version === this.listVersion)
              this.threadError = 'No pudimos cargar las conversaciones. Intenta actualizar.';
          },
        }),
    );
  }

  loadThreadFromOrder(serviceOrderId: number): void {
    this.isLoadingThreads = true;
    this.threadError = '';

    const request = this.inboxService
      .getThreadByOrder(serviceOrderId)
      .pipe(finalize(() => (this.isLoadingThreads = false)))
      .subscribe({
        next: (thread) => {
          this.selectThread(thread, false);
          this.mobileChatOpen = true;
          this.loadThreads(thread.id);
        },
        error: () => {
          this.threadError = 'No pudimos resolver la conversación para esa orden.';
          this.loadThreads(null);
        },
      });

    this.subscriptions.add(request);
  }

  selectThread(thread: ServiceOrderInboxThreadSummary, syncRoute = true): void {
    this.saveDraft();
    const saved = this.drafts.get(Number(thread.id));
    this.draftMessage = saved?.text ?? '';
    this.draftAttachments = saved?.attachments ?? [];
    this.contextDrawerOpen = false;
    this.linkableOrders = [];
    this.orderSearch = '';
    this.linkError = '';
    this.mobileChatOpen = syncRoute;
    this.selectedThread = { ...thread, unreadCount: 0 };
    this.clearThreadUnreadCount(thread.id);
    this.loadThreadDetail(thread.id, syncRoute);
  }

  sendMessage(): void {
    const text = this.draftMessage.trim();
    if (!this.selectedThread || this.isSendingMessage || (!text && !this.draftAttachments.length)) {
      return;
    }

    if (!this.canCompose) {
      this.messageError =
        this.selectedThread.canSend === false
          ? 'El chat archivado es de solo lectura.'
          : this.closedWindowMessage;
      return;
    }

    const threadId = Number(this.selectedThread.id);
    const sentDraft = this.draftAttachments;
    this.isSendingMessage = true;
    const attachments = this.draftAttachments.map((attachment) => attachment.file);
    const request = this.inboxService
      .sendMessage(threadId, text, attachments)
      .pipe(finalize(() => (this.isSendingMessage = false)))
      .subscribe({
        next: () => {
          sentDraft.forEach((attachment) => {
            if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
          });
          this.drafts.delete(threadId);
          if (Number(this.selectedThread?.id) === threadId) {
            if (this.draftMessage.trim() === text) this.draftMessage = '';
            this.draftAttachments = this.draftAttachments.filter(
              (attachment) => !sentDraft.includes(attachment),
            );
            this.loadThreadDetail(threadId, false, true);
          }
        },
        error: (error) => {
          if (Number(this.selectedThread?.id) === threadId)
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
      [ServiceType.STANDARD_SERVICE]: 'Servicio express',
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
    return value
      ? (EQUIPMENT_TYPE_LABELS[value] ?? 'Equipo no especificado')
      : 'Equipo no especificado';
  }

  private loadThreadDetail(threadId: number, syncRoute: boolean, refresh = false): void {
    this.detailRequest?.unsubscribe();
    const version = ++this.detailVersion;
    if (!refresh) {
      this.isLoadingMessages = true;
      this.messages = [];
      this.clearAttachmentPreviews();
    }
    this.messageError = '';
    const wasNearBottom = this.isNearBottom();
    this.detailRequest = forkJoin({
      response: this.inboxService.getMessages(threadId),
      orders: refresh ? of(null) : this.inboxService.getThreadOrders(threadId),
      markRead: this.inboxService.markRead(threadId).pipe(catchError(() => of({ ok: false }))),
    })
      .pipe(
        finalize(() => {
          if (version === this.detailVersion) this.isLoadingMessages = false;
        }),
      )
      .subscribe({
        next: ({ response, orders }) => {
          if (
            version !== this.detailVersion ||
            Number(this.selectedThread?.id) !== Number(threadId)
          )
            return;
          this.selectedThread = { ...response.thread, unreadCount: 0 };
          const latest = response.messages ?? [];
          const gap =
            refresh &&
            response.hasMore &&
            latest.length &&
            this.messages.length &&
            Number(latest[0].id) > Number(this.messages[this.messages.length - 1].id);
          this.messages = this.mergeMessages(refresh && !gap ? this.messages : [], latest);
          if (gap) {
            this.hasOlderMessages = response.hasMore ?? false;
            this.olderCursor = response.nextCursor ?? null;
          }
          if (!refresh) {
            this.hasOlderMessages = response.hasMore ?? false;
            this.olderCursor = response.nextCursor ?? null;
          }
          this.threadOrders = orders ?? response.thread.orders ?? [];
          this.threads = this.threads.map((thread) =>
            Number(thread.id) === Number(threadId) ? this.selectedThread! : thread,
          );
          this.hydrateAttachmentPreviews(this.messages);
          if (!refresh || wasNearBottom) this.scrollToLatest();
          if (syncRoute)
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                threadId,
                serviceOrderId: response.thread.serviceOrderId ?? undefined,
              },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
        },
        error: (error) => {
          if (
            version !== this.detailVersion ||
            Number(this.selectedThread?.id) !== Number(threadId)
          )
            return;
          if (error?.status === 403 || error?.status === 404) this.clearSelection();
          this.messageError = 'No pudimos cargar el chat. Puede haber cambiado su asignación.';
        },
      });
    this.subscriptions.add(this.detailRequest);
  }

  loadOlderMessages(): void {
    const threadId = this.selectedThread?.id,
      cursor = this.olderCursor;
    if (!threadId || !cursor || this.isLoadingOlder) return;
    const version = this.detailVersion;
    const previousHeight = this.timeline?.nativeElement.scrollHeight ?? 0;
    const previousTop = this.timeline?.nativeElement.scrollTop ?? 0;
    this.isLoadingOlder = true;
    this.subscriptions.add(
      this.inboxService
        .getMessages(threadId, { limit: 50, beforeId: cursor })
        .pipe(finalize(() => (this.isLoadingOlder = false)))
        .subscribe({
          next: (response) => {
            if (version !== this.detailVersion || this.selectedThread?.id !== threadId) return;
            this.messages = this.mergeMessages(response.messages, this.messages);
            this.hasOlderMessages = response.hasMore ?? false;
            this.olderCursor = response.nextCursor ?? null;
            this.hydrateAttachmentPreviews(response.messages);
            requestAnimationFrame(() => {
              const element = this.timeline?.nativeElement;
              if (element && this.selectedThread?.id === threadId)
                element.scrollTop = previousTop + element.scrollHeight - previousHeight;
            });
          },
          error: () => (this.messageError = 'No pudimos cargar los mensajes anteriores.'),
        }),
    );
  }

  private subscribeToInboxChanges(): void {
    const changedIds = new Set<number>();
    let reconcile = false;
    this.subscriptions.add(
      this.inboxService
        .watchChanges()
        .pipe(
          tap((event) => {
            if (event?.threadId) changedIds.add(Number(event.threadId));
            else reconcile = true;
          }),
          auditTime(250),
        )
        .subscribe(() => {
        this.loadThreads(undefined, false, true);
          const id = Number(this.selectedThread?.id);
          if (id && (reconcile || changedIds.has(id))) this.loadThreadDetail(id, false, true);
          changedIds.clear();
          reconcile = false;
        }),
    );
  }

  private saveDraft(): void {
    if (this.selectedThread)
      this.drafts.set(Number(this.selectedThread.id), {
        text: this.draftMessage,
        attachments: this.draftAttachments,
      });
  }
  private clearSelection(): void {
    this.saveDraft();
    this.selectedThread = null;
    this.messages = [];
    this.threadOrders = [];
    this.draftMessage = '';
    this.draftAttachments = [];
    this.contextDrawerOpen = false;
    this.mobileChatOpen = false;
    this.clearAttachmentPreviews();
  }
  private mergeMessages(
    first: ServiceOrderInboxMessage[],
    second: ServiceOrderInboxMessage[],
  ): ServiceOrderInboxMessage[] {
    return [
      ...new Map([...first, ...second].map((message) => [Number(message.id), message])).values(),
    ].sort((a, b) => Number(a.id) - Number(b.id));
  }
  private isNearBottom(): boolean {
    const el = this.timeline?.nativeElement;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }
  private scrollToLatest(): void {
    const id = this.selectedThread?.id;
    requestAnimationFrame(() => {
      const el = this.timeline?.nativeElement;
      if (el && this.selectedThread?.id === id) el.scrollTop = el.scrollHeight;
    });
  }
  isNewDay(index: number): boolean {
    return (
      index === 0 ||
      new Date(this.messages[index].createdAt).toDateString() !==
        new Date(this.messages[index - 1].createdAt).toDateString()
    );
  }
  deliveryIcon(message: ServiceOrderInboxMessage): string {
    return {
      QUEUED: 'far fa-clock',
      SENT: 'fas fa-check',
      DELIVERED: 'fas fa-check-double',
      READ: 'fas fa-check-double',
      FAILED: 'fas fa-exclamation-circle',
      SKIPPED: 'fas fa-ban',
      RECEIVED: 'fas fa-check',
    }[message.deliveryStatus];
  }
  composerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  backToList(): void {
    this.mobileChatOpen = false;
    this.contextDrawerOpen = false;
  }
  searchOrders(): void {
    this.orderSearches.next(this.orderSearch);
  }
  linkOrder(order: ServiceOrder): void {
    const id = this.selectedThread?.id;
    if (!id || this.isTechnicianViewer || this.linkingOrder) return;
    this.linkingOrder = true;
    this.linkError = '';
    this.subscriptions.add(
      this.inboxService
        .linkThreadOrder(id, order.id)
        .pipe(finalize(() => (this.linkingOrder = false)))
        .subscribe({
          next: (thread) => {
            if (this.selectedThread?.id !== id) return;
            this.selectedThread = thread;
            this.threadOrders = thread.orders ?? [];
            this.linkableOrders = [];
            this.orderSearch = '';
            this.loadThreads();
          },
          error: (error) =>
            (this.linkError = error?.error?.message ?? 'No pudimos vincular la orden.'),
        }),
    );
  }

  private clearThreadUnreadCount(threadId: number): void {
    this.threads = this.threads.map((thread) =>
      thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
    );
  }

  private hydrateAttachmentPreviews(messages: ServiceOrderInboxMessage[]): void {
    const threadId = this.selectedThread?.id;
    messages
      .flatMap((message) =>
        (message.attachments ?? []).filter((attachment) => attachment.previewable),
      )
      .forEach((attachment) => {
        if (this.attachmentPreviewUrls[attachment.id]) {
          return;
        }

        const request = this.inboxService.downloadAttachmentBlob(attachment.id).subscribe({
          next: (blob) => {
            if (this.selectedThread?.id === threadId)
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
