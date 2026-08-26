import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import {
  ServiceOrderAgreement,
  ServiceOrderAgreementItemLink,
  ServiceOrderAgreementStatus,
  ServiceOrderClientDecisionResult,
} from '../../models/service-orders/service-agreement';
import { ServiceOrderClientDecisionTarget } from '../../components/service-order-client-decision-modal/service-order-client-decision-modal';
import { ServiceOrderLineDiscountTarget } from '../../components/service-order-line-discount-modal/service-order-line-discount-modal';
import {
  ServiceOrderAgreementService,
  TechnicianRevenueRanking,
} from '../../services/service-orders/service-agreement.service';
import {
  EquipmentType,
  ServiceOrder,
  ServiceOrderDerivedMetric,
  ServiceOrderItem,
  ServiceOrderCancellationResult,
  ServiceOrderOperativeStatus,
  ServiceOrderSlaStage,
  ServiceType,
} from '../../models/service-orders/service-order';
import {
  FailedServiceOrderNotification,
  ServiceOrderService,
} from '../../services/service-orders/service-order.service';
import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderDiagnosis } from '../../models/service-orders/service-order-diagnosis';
import { Product } from '../../models/catalog/product';
import { ProductsService } from '../../services/inventory/products.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderItemCancellationTarget } from '../../components/service-order-item-cancellation-modal/service-order-item-cancellation-modal';

const TECHNICAL_SERVICE_LABEL = 'Servicio técnico';

@Component({
  selector: 'app-supervisor-panel',
  standalone: false,
  templateUrl: './supervisor-panel.html',
  styleUrls: ['./supervisor-panel.scss'],
})
export class SupervisorPanel implements OnInit {
  activeSection: 'ranking' | 'orders' = 'orders';
  activeTab: 'open' | 'answered' | 'all' = 'open';
  currentPage = 1;
  itemsPerPage = 6;

  openServiceOrderAgreements: ServiceOrderAgreement[] = [];
  answeredServiceOrderAgreements: ServiceOrderAgreement[] = [];
  allServiceOrderAgreements: ServiceOrderAgreement[] = [];
  serviceOrders: ServiceOrder[] = [];

  selectedServiceOrderAgreement: ServiceOrderAgreement | null = null;
  selectedServiceOrder: ServiceOrder | null = null;
  currentDiagnosis: ServiceOrderDiagnosis | null = null;
  selectedOrderAgreements: ServiceOrderAgreement[] = [];
  clientDecisionTarget: ServiceOrderClientDecisionTarget | null = null;
  lineDiscountTarget: ServiceOrderLineDiscountTarget | null = null;
  itemCancellationTarget: ServiceOrderItemCancellationTarget | null = null;

  orderSearchTerm = '';
  orderOperativeStatusFilter: ServiceOrderOperativeStatus | 'ALL' = 'ALL';

  products: Product[] = [];
  technicianRankings: TechnicianRevenueRanking[] = [];
  failedNotifications: FailedServiceOrderNotification[] = [];
  showFailedNotifications = false;
  readonly retryingNotificationIds = new Set<number>();

  isLoadingServiceOrderAgreements = false;
  isLoadingDiagnosis = false;
  isLoadingTechnicianRankings = false;

  showAlert = false;
  alertType = '';
  alertMessage = '';
  alertIcon = '';

  private readonly equipmentTypeLabels: Record<EquipmentType, string> = {
    [EquipmentType.LAPTOP]: 'Laptop',
    [EquipmentType.DESKTOP_PC]: 'PC de escritorio',
    [EquipmentType.ALL_IN_ONE]: 'All in One',
    [EquipmentType.PRINTER]: 'Impresora',
    [EquipmentType.SCANNER]: 'Escáner',
    [EquipmentType.PROJECTOR]: 'Proyector',
    [EquipmentType.MONITOR]: 'Monitor',
    [EquipmentType.SERVER]: 'Servidor',
    [EquipmentType.NETWORK_DEVICE]: 'Equipo de red',
    [EquipmentType.OTHER]: 'Otro',
  };

  private readonly serviceTypeLabels: Record<string, string> = {
    [ServiceType.DIAGNOSIS]: 'Diagnóstico',
    [ServiceType.STANDARD_SERVICE]: 'Servicio estándar',
    [ServiceType.WARRANTY_SERVICE]: 'Garantía',
    [ServiceType.ASSEMBLY]: 'Ensamblaje',
    [ServiceType.CUSTOMER_SERVICE]: 'Atención al cliente',
  };

  private readonly operativeStatusLabels: Record<ServiceOrderOperativeStatus, string> = {
    [ServiceOrderOperativeStatus.ABIERTA]: 'Abierto',
    [ServiceOrderOperativeStatus.EN_PROCESO]: 'En progreso',
    [ServiceOrderOperativeStatus.CANCELACION_SOLICITADA]: 'Cancelación solicitada',
    [ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA]: 'Listo para entrega',
    [ServiceOrderOperativeStatus.ENTREGA_PARCIAL]: 'Entrega parcial',
    [ServiceOrderOperativeStatus.ENTREGADA]: 'Entregado',
    [ServiceOrderOperativeStatus.CANCELADA]: 'Cancelado',
    [ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION]: 'Sin solución',
  };

  private readonly slaStageLabels: Record<ServiceOrderSlaStage, string> = {
    assignment: 'Asignación',
    diagnosis: 'Diagnóstico',
    service: 'Servicio',
    pickup: 'Recojo',
    terminal: 'Terminal',
  };

  constructor(
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly productsService: ProductsService,
    private readonly serviceOrderInboxService: ServiceOrderInboxService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadServiceOrderAgreements();
    this.loadServiceOrders();
    this.loadProducts();
    this.loadTechnicianRankings();
    this.loadFailedNotifications();
  }

  loadFailedNotifications(): void {
    this.serviceOrderService.getFinalNotificationFailures().subscribe({
      next: (notifications) => {
        this.failedNotifications = notifications;
        if (!notifications.length) this.closeFailedNotifications();
      },
      error: () => {
        this.failedNotifications = [];
        this.closeFailedNotifications();
      },
    });
  }

  openFailedNotifications(): void {
    if (!this.failedNotifications.length) return;
    this.showFailedNotifications = true;
  }

  closeFailedNotifications(): void {
    this.showFailedNotifications = false;
  }

  @HostListener('document:keydown.escape')
  closeFailedNotificationsWithEscape(): void {
    if (this.showFailedNotifications) this.closeFailedNotifications();
  }

  isRetryingNotification(notificationId: number): boolean {
    return this.retryingNotificationIds.has(Number(notificationId));
  }

  getNotificationTypeLabel(messageType: string): string {
    const labels: Record<string, string> = {
      'service.final.report': 'Informe final del servicio',
      'rediagnosis.quote.issued': 'Recotización por nuevo diagnóstico',
      'diagnosis.quote.issued': 'Diagnóstico y cotización',
      'order.intake.summary': 'Resumen de recepción',
      'cancellation.summary': 'Resumen de cancelación',
      'payment.receipt': 'Comprobante de pago',
      'pickup.reminder': 'Recordatorio de recojo',
      'quality.survey': 'Encuesta de calidad',
    };
    return labels[messageType] ?? 'Notificación al cliente';
  }

  getNotificationErrorSummary(lastError: string | null): string {
    const error = lastError?.toLowerCase() ?? '';
    if (error.includes('template name') && error.includes('does not exist')) {
      return 'La plantilla configurada no estaba disponible en Meta para el idioma seleccionado.';
    }
    if (error.includes('document') || error.includes('media')) {
      return 'Meta no pudo acceder al documento adjunto de esta notificación.';
    }
    if (error.includes('timeout') || error.includes('tempor')) {
      return 'El servicio de mensajería no respondió dentro del tiempo esperado.';
    }
    return 'El envío no pudo completarse después de varios intentos.';
  }

  retryNotification(notification: FailedServiceOrderNotification): void {
    if (this.isRetryingNotification(notification.id)) return;
    this.retryingNotificationIds.add(Number(notification.id));

    this.serviceOrderService
      .retryFinalNotification(notification.id)
      .pipe(finalize(() => this.retryingNotificationIds.delete(Number(notification.id))))
      .subscribe({
        next: (result) => {
          if (result.status === 'FAILED_FINAL') {
            this.failedNotifications = this.failedNotifications.map((item) =>
              Number(item.id) === Number(result.id) ? result : item,
            );
            this.showMessage(
              'danger',
              'fas fa-exclamation-circle',
              'La notificación sigue pendiente. Revisa el nuevo detalle del error.',
            );
            return;
          }

          this.failedNotifications = this.failedNotifications.filter(
            (item) => item.id !== notification.id,
          );
          if (!this.failedNotifications.length) this.closeFailedNotifications();
          const message =
            result.status === 'RETRY_SCHEDULED'
              ? 'Notificación reprogramada correctamente.'
              : 'Notificación reenviada correctamente.';
          this.showMessage('success', 'fas fa-redo', message);
        },
        error: () =>
          this.showMessage(
            'danger',
            'fas fa-exclamation-circle',
            'No pudimos reintentar la notificación.',
          ),
      });
  }

  setActiveSection(section: 'ranking' | 'orders'): void {
    this.activeSection = section;
    this.currentPage = 1;
  }

  setActiveTab(tab: 'open' | 'answered' | 'all'): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  getInboxThreadOperativeStatusLabel(status?: ServiceOrderOperativeStatus | null): string {
    if (!status) return 'Abierto';
    return this.operativeStatusLabels[status] ?? status;
  }

  getServiceOrderSlaStageLabel(stage?: ServiceOrderSlaStage | null): string {
    if (!stage) return 'Sin etapa';
    return this.slaStageLabels[stage] ?? stage;
  }

  formatMinutes(value?: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return '—';
    }
    const totalMinutes = Math.max(0, Math.round(Number(value)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} min`;
    if (!minutes) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  }

  getMetricDisplayValue(metric?: ServiceOrderDerivedMetric | null): string {
    if (!metric?.isComputable) {
      return 'Pendiente';
    }
    return this.formatMinutes(metric.valueMinutes);
  }

  getMetricMissingLabel(metric?: ServiceOrderDerivedMetric | null): string {
    if (metric?.isComputable || !metric?.missingTimestamps?.length) {
      return '';
    }
    return `Falta: ${metric.missingTimestamps.join(', ')}`;
  }

  private loadServiceOrderAgreements(): void {
    this.isLoadingServiceOrderAgreements = true;
    this.agreementService
      .findAll({ page: 1, limit: 100 })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreements = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () =>
          this.showMessage(
            'danger',
            'fas fa-exclamation-circle',
            'No pudimos cargar las cotizaciones.',
          ),
      });
  }

  private loadServiceOrders(): void {
    this.serviceOrderService.findAll({ page: 1, limit: 100 }).subscribe({
      next: ({ data }) => {
        this.serviceOrders = data ?? [];

        if (this.selectedServiceOrder?.id) {
          const updated =
            this.serviceOrders.find(
              (order) => Number(order.id) === Number(this.selectedServiceOrder?.id),
            ) ?? null;
          this.selectedServiceOrder = updated;
          if (updated) {
            this.loadOrderContext(updated.id);
          } else {
            this.clearSelectedServiceOrder();
          }
        }

        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      },
      error: () => {
        this.serviceOrders = [];
        this.showMessage(
          'warning',
          'fas fa-info-circle',
          'No pudimos cargar las órdenes del supervisor.',
        );
      },
    });
  }

  private hydrateLists(serviceOrderAgreements: ServiceOrderAgreement[]): void {
    this.allServiceOrderAgreements = [...serviceOrderAgreements];

    this.openServiceOrderAgreements = serviceOrderAgreements.filter((quote) =>
      [ServiceOrderAgreementStatus.DRAFT].includes(quote.status),
    );

    this.answeredServiceOrderAgreements = serviceOrderAgreements.filter((quote) =>
      [
        ServiceOrderAgreementStatus.CONFIRMED,
        ServiceOrderAgreementStatus.VOIDED,
        ServiceOrderAgreementStatus.SUPERSEDED,
      ].includes(quote.status),
    );

    if (this.selectedServiceOrderAgreement) {
      const updated = serviceOrderAgreements.find(
        (quote) => quote.id === this.selectedServiceOrderAgreement?.id,
      );
      this.selectedServiceOrderAgreement = updated ?? null;
      if (this.selectedServiceOrderAgreement) {
        this.loadServiceOrderDetail(this.selectedServiceOrderAgreement.serviceOrderId);
        this.loadCurrentDiagnosis(this.selectedServiceOrderAgreement.serviceOrderId);
      }
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  private loadProducts(): void {
    this.productsService.list().subscribe({
      next: (items) => (this.products = items ?? []),
      error: () => (this.products = []),
    });
  }

  private loadTechnicianRankings(): void {
    this.isLoadingTechnicianRankings = true;
    this.agreementService
      .getTechnicianRevenueRankings()
      .pipe(finalize(() => (this.isLoadingTechnicianRankings = false)))
      .subscribe({
        next: (response) => {
          this.technicianRankings = response.technicians ?? [];
        },
        error: () => {
          this.technicianRankings = [];
          this.showMessage(
            'warning',
            'fas fa-chart-line',
            'No pudimos cargar el ranking de tecnicos.',
          );
        },
      });
  }

  get topTechnician(): TechnicianRevenueRanking | null {
    return this.technicianRankings[0] ?? null;
  }

  get secondTechnician(): TechnicianRevenueRanking | null {
    return this.technicianRankings[1] ?? null;
  }

  get thirdTechnician(): TechnicianRevenueRanking | null {
    return this.technicianRankings[2] ?? null;
  }

  get totalItems(): number {
    switch (this.activeSection) {
      case 'ranking':
        return this.technicianRankings.length;
      case 'orders':
        return this.filteredServiceOrders.length;
      default:
        return this.getVisibleAgreements().length;
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  get paginatedTechnicianRankings(): TechnicianRevenueRanking[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.technicianRankings.slice(start, start + this.itemsPerPage);
  }

  get paginatedVisibleAgreements(): ServiceOrderAgreement[] {
    const visibleQuotes = this.getVisibleAgreements();
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return visibleQuotes.slice(start, start + this.itemsPerPage);
  }

  get filteredServiceOrders(): ServiceOrder[] {
    const query = this.orderSearchTerm.trim().toLowerCase();

    return this.serviceOrders.filter((order) => {
      const matchesStatus =
        this.orderOperativeStatusFilter === 'ALL' ||
        order.operativeStatus === this.orderOperativeStatusFilter;
      const matchesQuery =
        !query ||
        [order.code, order.brand, order.model, order.initialIssue, order.assignedToTechnicianName]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(query));

      return matchesStatus && matchesQuery;
    });
  }

  get paginatedServiceOrders(): ServiceOrder[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredServiceOrders.slice(start, start + this.itemsPerPage);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  getRevenueShare(technician: TechnicianRevenueRanking): number {
    const total = this.technicianRankings.reduce(
      (acc, item) => acc + Number(item.totalRevenue || 0),
      0,
    );
    if (!total) return 0;
    return Math.min(100, (Number(technician.totalRevenue || 0) / total) * 100);
  }

  selectServiceOrderAgreement(quote: ServiceOrderAgreement): void {
    this.selectedServiceOrderAgreement = quote;
    this.loadServiceOrderDetail(quote.serviceOrderId);
    this.loadCurrentDiagnosis(quote.serviceOrderId);
  }

  selectServiceOrder(order: ServiceOrder): void {
    this.selectedServiceOrder = order;
    this.loadOrderContext(order.id);
  }

  clearSelectedServiceOrderAgreement(): void {
    this.selectedServiceOrderAgreement = null;
    this.selectedServiceOrder = null;
    this.currentDiagnosis = null;
  }

  clearSelectedServiceOrder(): void {
    this.selectedServiceOrder = null;
    this.selectedServiceOrderAgreement = null;
    this.selectedOrderAgreements = [];
    this.currentDiagnosis = null;
    this.clientDecisionTarget = null;
    this.lineDiscountTarget = null;
    this.itemCancellationTarget = null;
  }

  canRecordClientDecision(link: ServiceOrderAgreementItemLink): boolean {
    return (
      link.commercialVersion?.status === 'DRAFT' || link.commercialVersion?.status === 'ISSUED'
    );
  }

  canEditCommercialDiscounts(link: ServiceOrderAgreementItemLink): boolean {
    return this.canRecordClientDecision(link) && Boolean(link.commercialVersion?.lines?.length);
  }

  getCommercialItemLabel(link: ServiceOrderAgreementItemLink): string {
    const item = link.serviceOrderItem;
    const equipment = [item?.brand, item?.model].filter(Boolean).join(' ');
    return [item?.code || `Equipo #${link.serviceOrderItemId}`, equipment]
      .filter(Boolean)
      .join(' · ');
  }

  getCommercialVersionStatusLabel(link: ServiceOrderAgreementItemLink): string {
    const latestDecision = [...(link.commercialVersion?.decisions ?? [])].sort(
      (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
    )[0];
    if (latestDecision?.decision === 'CHANGES_REQUESTED') return 'Cambios solicitados';
    if (latestDecision?.decision === 'ACCEPTED' || link.commercialVersion?.status === 'ACCEPTED')
      return 'Aceptado';
    return 'Pendiente de respuesta';
  }

  getCommercialDecisionAuditLabel(link: ServiceOrderAgreementItemLink): string | null {
    const latestDecision = [...(link.commercialVersion?.decisions ?? [])].sort(
      (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
    )[0];
    if (!latestDecision) return null;
    const channels: Record<string, string> = {
      WHATSAPP: 'WhatsApp',
      PHONE: 'Llamada telefónica',
      IN_PERSON: 'Presencial',
      EMAIL: 'Correo electrónico',
      OTHER: 'Otro canal',
    };
    const recorder =
      latestDecision.recordedByUser?.name || `usuario #${latestDecision.recordedByUserId}`;
    return `${channels[latestDecision.channel] ?? latestDecision.channel} · registrado por ${recorder}`;
  }

  openClientDecisionModal(link: ServiceOrderAgreementItemLink): void {
    if (!this.canRecordClientDecision(link) || !link.commercialVersion) {
      this.showMessage(
        'warning',
        'fas fa-info-circle',
        'Esta versión ya no admite nuevas decisiones.',
      );
      return;
    }
    this.clientDecisionTarget = {
      commercialVersionId: Number(link.commercialVersionId),
      itemLabel: this.getCommercialItemLabel(link),
      versionNumber: Number(link.commercialVersion.versionNumber),
      totalAmount: Number(link.commercialVersion.totalAmount),
    };
  }

  openLineDiscountModal(link: ServiceOrderAgreementItemLink): void {
    const version = link.commercialVersion;
    const serviceOrderId = this.selectedServiceOrderAgreement?.serviceOrderId;
    if (!this.canEditCommercialDiscounts(link) || !version || !serviceOrderId) {
      this.showMessage(
        'warning',
        'fas fa-info-circle',
        'Esta versión no admite cambios de descuento.',
      );
      return;
    }
    this.lineDiscountTarget = {
      serviceOrderId: Number(serviceOrderId),
      serviceOrderItemId: Number(link.serviceOrderItemId),
      itemLabel: this.getCommercialItemLabel(link),
      baseVersionId: Number(link.commercialVersionId),
      versionNumber: Number(version.versionNumber),
      notes: version.notes ?? null,
      lines: version.lines,
    };
  }

  handleLineDiscountRevisionCreated(agreement: ServiceOrderAgreement): void {
    this.lineDiscountTarget = null;
    const orderId = Number(agreement.serviceOrderId || this.selectedServiceOrder?.id || 0);
    if (orderId) this.loadOrderContext(orderId);
    this.loadServiceOrderAgreements();
    this.loadServiceOrders();
    this.showMessage(
      'success',
      'fas fa-check-circle',
      'Se creó una nueva versión con los descuentos actualizados.',
    );
  }

  handleClientDecisionRecorded(result: ServiceOrderClientDecisionResult): void {
    const message =
      result.decision.decision === 'CHANGES_REQUESTED'
        ? 'Se registró que el cliente solicita cambios para este equipo.'
        : result.allAccepted
          ? 'Se registró la aceptación y la cotización consolidada quedó confirmada.'
          : 'Se registró la aceptación de este equipo. Los demás equipos siguen pendientes.';
    this.clientDecisionTarget = null;
    const orderId = this.selectedServiceOrder?.id;
    if (orderId) this.loadOrderContext(Number(orderId));
    this.loadServiceOrderAgreements();
    this.loadServiceOrders();
    this.showMessage('success', 'fas fa-check-circle', message);
  }

  private loadOrderContext(serviceOrderId: number): void {
    this.loadServiceOrderDetail(serviceOrderId);
    this.loadCurrentDiagnosis(serviceOrderId);
    this.loadOrderAgreements(serviceOrderId);
  }

  private loadServiceOrderDetail(serviceOrderId: number): void {
    this.serviceOrderService.findOne(serviceOrderId).subscribe({
      next: (serviceOrder) => (this.selectedServiceOrder = serviceOrder),
      error: () => {
        this.selectedServiceOrder = null;
        this.showMessage(
          'warning',
          'fas fa-info-circle',
          'No pudimos cargar el detalle del equipo.',
        );
      },
    });
  }

  private loadOrderAgreements(serviceOrderId: number): void {
    this.agreementService.findAll({ page: 1, limit: 20, serviceOrderId }).subscribe({
      next: ({ data }) => {
        this.selectedOrderAgreements = data ?? [];
        this.selectedServiceOrderAgreement =
          this.selectedOrderAgreements.find(
            (agreement) => agreement.status === ServiceOrderAgreementStatus.DRAFT,
          ) ??
          this.selectedOrderAgreements.find(
            (agreement) => agreement.status === ServiceOrderAgreementStatus.CONFIRMED,
          ) ??
          this.selectedOrderAgreements[0] ??
          null;
      },
      error: () => {
        this.selectedOrderAgreements = [];
        this.selectedServiceOrderAgreement = null;
      },
    });
  }

  private loadCurrentDiagnosis(serviceOrderId: number): void {
    this.isLoadingDiagnosis = true;
    this.diagnosticService
      .findAll({ page: 1, limit: 1, serviceOrderId, status: 'CURRENT' })
      .pipe(finalize(() => (this.isLoadingDiagnosis = false)))
      .subscribe({
        next: ({ data }) => {
          this.currentDiagnosis = data?.[0] ?? null;
        },
        error: () => {
          this.currentDiagnosis = null;
        },
      });
  }

  getVisibleAgreements(): ServiceOrderAgreement[] {
    switch (this.activeTab) {
      case 'open':
        return this.openServiceOrderAgreements;
      case 'answered':
        return this.answeredServiceOrderAgreements;
      default:
        return this.allServiceOrderAgreements;
    }
  }

  getEquipmentTypeLabel(type?: EquipmentType | null, equipmentTypeOther?: string | null): string {
    if (!type) return 'Sin tipo';
    if (type === EquipmentType.OTHER && equipmentTypeOther?.trim()) {
      return equipmentTypeOther.trim();
    }
    return this.equipmentTypeLabels[type] ?? String(type);
  }

  getServiceTypeLabel(serviceType?: string | null): string {
    if (!serviceType) return 'Sin tipo';
    return this.serviceTypeLabels[serviceType] ?? serviceType;
  }

  getProductLabel(productId: number | null): string {
    if (!productId) return 'Producto sin referencia';
    const product = this.products.find((item) => Number(item.id) === Number(productId));
    return product ? `${product.sku} . ${product.name}` : `Producto #${productId}`;
  }

  getServiceLabel(serviceId: number | null): string {
    return serviceId ? TECHNICAL_SERVICE_LABEL : TECHNICAL_SERVICE_LABEL;
  }

  getServiceOrderAgreementHeaderLabel(quote: ServiceOrderAgreement): string {
    const serviceOrderCode = quote.serviceOrder?.code;
    const equipmentLabel = this.getEquipmentTypeLabel(
      quote.serviceOrder?.equipmentType,
      quote.serviceOrder?.equipmentTypeOther,
    );
    if (serviceOrderCode) {
      return `${serviceOrderCode} . ${equipmentLabel}`;
    }
    return equipmentLabel;
  }

  getServiceOrderAgreementStatusLabel(status: ServiceOrderAgreementStatus): string {
    const statusMap: Record<string, string> = {
      [ServiceOrderAgreementStatus.DRAFT]: 'Borrador',
      [ServiceOrderAgreementStatus.CONFIRMED]: 'Confirmado',
      [ServiceOrderAgreementStatus.SUPERSEDED]: 'Reemplazado',
      [ServiceOrderAgreementStatus.VOIDED]: 'Anulado',
    };
    return statusMap[status] || status;
  }

  getServiceOrderAgreementStatusClass(status: ServiceOrderAgreementStatus): string {
    const statusClassMap: Record<string, string> = {
      [ServiceOrderAgreementStatus.DRAFT]: 'status-current',
      [ServiceOrderAgreementStatus.CONFIRMED]: 'status-client-approved',
      [ServiceOrderAgreementStatus.VOIDED]: 'status-client-rejected',
      [ServiceOrderAgreementStatus.SUPERSEDED]: 'status-archived',
    };
    return statusClassMap[status] || 'status-default';
  }

  getOrderOperativeStatusOptions(): ServiceOrderOperativeStatus[] {
    return [
      ServiceOrderOperativeStatus.ABIERTA,
      ServiceOrderOperativeStatus.EN_PROCESO,
      ServiceOrderOperativeStatus.CANCELACION_SOLICITADA,
      ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ];
  }

  getPendingItemCancellation(item: ServiceOrderItem) {
    return (
      (item.cancellationRequests ?? []).find((request) =>
        ['PENDING', 'AWAITING_CLIENT_ACCEPTANCE'].includes(request.status),
      ) ?? null
    );
  }

  canRequestItemCancellation(item: ServiceOrderItem): boolean {
    return (
      ![
        ServiceOrderOperativeStatus.CANCELADA,
        ServiceOrderOperativeStatus.ENTREGADA,
        ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
      ].includes(item.operativeStatus) && !this.getPendingItemCancellation(item)
    );
  }

  getItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(' ');
    return [item.code || `Equipo #${item.id}`, equipment].filter(Boolean).join(' · ');
  }

  openItemCancellationModal(order: ServiceOrder, item?: ServiceOrderItem): void {
    const items = (order.items ?? []).filter((candidate) =>
      this.canRequestItemCancellation(candidate),
    );
    if (!items.length) {
      this.showMessage(
        'warning',
        'fas fa-info-circle',
        'Esta orden no tiene equipos disponibles para cancelar.',
      );
      return;
    }
    this.itemCancellationTarget = {
      mode: 'REQUEST',
      serviceOrderId: Number(order.id),
      orderCode: order.code,
      items,
      selectedItemId: item?.id ?? null,
    };
  }

  canSendPickupReminder(item: ServiceOrderItem): boolean {
    return !item.deliveredAt && Boolean(item.readyForPickupAt || item.cancelledAt);
  }

  sendEquipmentPickupReminder(order: ServiceOrder, item: ServiceOrderItem): void {
    if (!this.canSendPickupReminder(item)) return;
    this.serviceOrderService.sendPickupReminder(Number(order.id), [Number(item.id)]).subscribe({
      next: () =>
        this.showMessage(
          'success',
          'fas fa-paper-plane',
          'Recordatorio de recojo enviado al cliente.',
        ),
      error: (error) =>
        this.showMessage(
          'danger',
          'fas fa-exclamation-circle',
          error?.error?.message || 'No pudimos enviar el recordatorio de recojo.',
        ),
    });
  }

  openCancellationResolution(order: ServiceOrder, item: ServiceOrderItem): void {
    const request = this.getPendingItemCancellation(item);
    if (!request) {
      this.showMessage(
        'warning',
        'fas fa-info-circle',
        'Este equipo no tiene una cancelación pendiente.',
      );
      return;
    }
    this.itemCancellationTarget = {
      mode: 'RESOLVE',
      serviceOrderId: Number(order.id),
      orderCode: order.code,
      items: [item],
      selectedItemId: item.id,
      cancellationRequestId: request.id,
    };
  }

  handleItemCancellationSaved(result: ServiceOrderCancellationResult): void {
    this.itemCancellationTarget = null;
    this.selectedServiceOrder = result.order;
    this.loadServiceOrders();
    const message =
      'requests' in result
        ? result.chargedItemsCount > 0
          ? `${result.requests.length} equipo(s) cancelados. Se registró S/ ${result.chargeTotal.toFixed(2)} pendiente de pago.`
          : `${result.requests.length} equipo(s) cancelados correctamente.`
        : result.request.status === 'REJECTED'
          ? 'La solicitud fue rechazada y el equipo recuperó su estado anterior.'
          : result.request.status === 'APPROVED'
            ? 'La cancelación del equipo quedó aprobada.'
            : 'La cancelación quedó pendiente de revisión.';
    this.showMessage('success', 'fas fa-check-circle', message);
  }

  openInboxShortcut(order: ServiceOrder): void {
    this.openInboxWorkspace(order);
  }

  openInboxWorkspace(order?: ServiceOrder | null): void {
    if (order?.id) {
      this.serviceOrderInboxService.getThreadByOrder(Number(order.id)).subscribe({
        next: (thread) => {
          void this.router.navigate(['/service-order-inbox'], {
            queryParams: {
              threadId: thread.id,
              serviceOrderId: Number(order.id),
            },
          });
        },
        error: () => {
          this.showMessage(
            'danger',
            'fas fa-exclamation-circle',
            'No pudimos abrir la conversación del cliente.',
          );
        },
      });
      return;
    }

    void this.router.navigate(['/service-order-inbox']);
  }

  hasActiveSlaBreach(order?: ServiceOrder | null): boolean {
    return Boolean(order?.items?.some((item) => item.sla?.breached));
  }

  private showMessage(type: string, icon: string, message: string): void {
    this.alertType = type;
    this.alertIcon = icon;
    this.alertMessage = message;
    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
    }, 4000);
  }
}
