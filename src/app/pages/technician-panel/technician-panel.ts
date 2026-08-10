import { Component, OnDestroy, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Router } from "@angular/router"
import { forkJoin, of } from "rxjs"
import { catchError, finalize, map, switchMap } from "rxjs/operators"
import {
  EquipmentType,
  ServiceOrderDerivedMetric,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderItemCancellationResult,
  ServiceOrderCommercialStatus,
  ServiceOrderOperativeStatus,
  ServiceOrderSlaStage,
  ServiceOrderTechnicalStatus,
  ServiceType,
} from "../../models/service-orders/service-order"
import { ServiceOrderService } from "../../services/service-orders/service-order.service"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import {
  ServiceOrderDiagnosis,
  ServiceOrderDiagnosisOutcome,
  ServiceOrderDiagnosisStatus,
} from "../../models/service-orders/service-order-diagnosis"
import { ServiceOrderDiagnosisSaveRequest } from "../../models/service-orders/service-order-diagnosis-request"
import {
  AgreementLineProvenance,
  AgreementLineUiMeta,
  ServiceOrderAgreement,
  ServiceOrderAgreementItemLink,
  ServiceOrderAgreementProduct,
  ServiceOrderAgreementService as ServiceOrderAgreementServiceItem,
  ServiceOrderAgreementStatus,
  ServiceOrderClientDecision,
  ServiceOrderItemCommercialVersion,
} from "../../models/service-orders/service-agreement"
import {
  ServiceOrderClientDecisionChannel,
  ServiceOrderClientDecisionType,
  ServiceOrderCommercialRevisionLineRequest,
} from "../../models/service-orders/service-agreement-request"
import { ServiceOrderAgreementService } from "../../services/service-orders/service-agreement.service"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { PricingQueryApiService } from "../../services/pricing/pricing-query-api.service"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { CurrentUserService } from "../../services/current-user.service"
import { User } from "../../models/user/user"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"
import { ServiceOrderInboxService } from "../../services/service-orders/service-order-inbox.service"
import { ServiceOrderItemCancellationTarget } from "../../components/service-order-item-cancellation-modal/service-order-item-cancellation-modal"

interface AgreementProductComposer {
  id: number
  type: "product"
  productId: number | null
  productCodeSnapshot: string | null
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  discountPct?: number
  discountOverrideReason?: string
  requiresPurchase: boolean
  notes: string
  permissions: AgreementLineUiMeta
}

interface AgreementServiceComposer {
  id: number
  type: "service"
  serviceId: number | null
  serviceCodeSnapshot: string | null
  serviceNameSnapshot: string
  unitPrice: number
  discountPct?: number
  discountOverrideReason?: string
  notes: string
  permissions: AgreementLineUiMeta
}

type AgreementComposerItem = AgreementProductComposer | AgreementServiceComposer

interface AgreementModalContext {
  summary: ServiceOrderAgreement | null
  baseAgreement: ServiceOrderAgreement | null
  sourceAgreement: ServiceOrderAgreement | null
  derivedMode: boolean
  inheritedNotes: string
  formNotes: string
  currency: string
}

interface FixedTechnicalServiceOption {
  id: number
  code: string
  name: string
  price: number
}

interface ItemTransitionContext {
  order: ServiceOrder
  nextStatus: ServiceOrderTechnicalStatus
  sourceStatuses: ServiceOrderTechnicalStatus[]
  title: string
  description: string
  confirmLabel: string
  successMessage: string
}

type TechnicianPanelTab = "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all"
type TechnicianDetailTab = "equipment" | "sla" | "history" | "agreements"

const TECHNICAL_SERVICE_OPTION: FixedTechnicalServiceOption = {
  id: 1,
  code: "TECHNICAL_SERVICE",
  name: "Servicio técnico",
  price: 20,
}

const EDITABLE_AGREEMENT_STATUSES: ServiceOrderTechnicalStatus[] = [
  ServiceOrderTechnicalStatus.DIAGNOSTICADA,
  ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL,
]

const ACTIVE_AGREEMENT_STATUSES = new Set<ServiceOrderAgreementStatus>([
  ServiceOrderAgreementStatus.CONFIRMED,
])

export function hasReachedAgreementExecution(order: Pick<ServiceOrder, "serviceStartedAt" | "serviceCompletedAt" | "resolvedAt"> | null): boolean {
  if (!order) return false
  return Boolean(order.serviceStartedAt || order.serviceCompletedAt || order.resolvedAt)
}

export function resolveLatestActiveAgreement(agreements: ServiceOrderAgreement[]): ServiceOrderAgreement | null {
  return [...(agreements ?? [])]
    .filter((agreement) => agreement && ACTIVE_AGREEMENT_STATUSES.has(agreement.status))
    .sort((left, right) => Number(right.sequenceNumber ?? 0) - Number(left.sequenceNumber ?? 0))[0] ?? null
}

export function shouldOpenDerivedAgreementComposer(
  order: Pick<ServiceOrder, "technicalStatus" | "serviceType" | "serviceStartedAt" | "serviceCompletedAt" | "resolvedAt"> | null,
  diagnoses: Array<Pick<ServiceOrderDiagnosis, "status">>,
  agreements: ServiceOrderAgreement[],
): boolean {
  if (!order || order.serviceType === ServiceType.WARRANTY_SERVICE) return false
  if (!EDITABLE_AGREEMENT_STATUSES.includes(order.technicalStatus)) return false
  if (!hasReachedAgreementExecution(order)) return false
  if (!diagnoses.some((entry) => entry.status === ServiceOrderDiagnosisStatus.SUPERSEDED)) return false
  return !!resolveLatestActiveAgreement(agreements)
}

@Component({
  selector: "app-technician-panel",
  standalone: false,
  templateUrl: "./technician-panel.html",
  styleUrls: ["./technician-panel.scss"],
})
export class TechnicianPanel implements OnInit, OnDestroy {

  activeTab: TechnicianPanelTab = "todo"
  activeDetailTab: TechnicianDetailTab = "equipment"
  currentPage = 1
  itemsPerPage = 6

  todoOrders: ServiceOrder[] = []
  diagnosisOrders: ServiceOrder[] = []
  pendingApprovalOrders: ServiceOrder[] = []
  repairOrders: ServiceOrder[] = []
  repairedOrders: ServiceOrder[] = []
  allOrders: ServiceOrder[] = []
  selectedServiceOrder: ServiceOrder | null = null
  selectedDiagnosisItemId: number | null = null
  selectedAgreementItemId: number | null = null
  itemCancellationTarget: ServiceOrderItemCancellationTarget | null = null
  showItemTransitionModal = false
  selectedItemTransitionId: number | null = null
  itemTransitionContext: ItemTransitionContext | null = null
  isSavingItemTransition = false

  showDiagnosisModal = false
  diagnosisForm: FormGroup
  showAgreementModal = false
  agreementForm: FormGroup
  showClientDecisionModal = false
  clientDecisionForm: FormGroup
  diagnosticHistory: ServiceOrderDiagnosis[] = []
  agreementSummary: ServiceOrderAgreement | null = null
  agreementHistory: ServiceOrderAgreement[] = []
  isLoadingServiceOrderAgreement = false
  isSavingAgreement = false
  isSavingClientDecision = false
  agreementBaseVersion: ServiceOrderAgreement | null = null
  agreementInheritedItems: AgreementComposerItem[] = []
  agreementEditableTechnicalService: AgreementServiceComposer | null = null
  agreementNewItems: AgreementProductComposer[] = []
  agreementInheritedNotes = ""
  isDerivedAgreementComposerActive = false
  products: Product[] = []
  productPriceLoading: Record<number, boolean> = {}

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingOrders = false
  isSavingDiagnosis = false
  private currentUser: User | null = null
  private techniciansMap = new Map<number, string>()
  isViewingAgreementHistory = false
  liveElapsedSeconds = 0
  private liveTimer: ReturnType<typeof setInterval> | null = null

  private readonly equipmentTypeLabels: Record<EquipmentType, string> = {
    [EquipmentType.LAPTOP]: "Laptop",
    [EquipmentType.DESKTOP_PC]: "PC de escritorio",
    [EquipmentType.ALL_IN_ONE]: "All in One",
    [EquipmentType.PRINTER]: "Impresora",
    [EquipmentType.SCANNER]: "Escáner",
    [EquipmentType.PROJECTOR]: "Proyector",
    [EquipmentType.MONITOR]: "Monitor",
    [EquipmentType.SERVER]: "Servidor",
    [EquipmentType.NETWORK_DEVICE]: "Equipo de red",
    [EquipmentType.OTHER]: "Otro",
  }

  private readonly slaStageLabels: Record<ServiceOrderSlaStage, string> = {
    assignment: "Asignación",
    diagnosis: "Diagnóstico",
    service: "Servicio",
    pickup: "Recojo",
    terminal: "Terminal",
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly productsService: ProductsService,
    private readonly pricingQuery: PricingQueryApiService,
    private readonly usersApi: UsersApiService,
    private readonly currentUserService: CurrentUserService,
    private readonly serviceOrderInboxService: ServiceOrderInboxService,
    private readonly router: Router,
  ) {
    this.diagnosisForm = this.createDiagnosisForm()
    this.agreementForm = this.createAgreementForm()
    this.clientDecisionForm = this.createClientDecisionForm()
  }

  ngOnInit(): void {
    this.syncCurrentUserContext()
    this.loadAgreementCatalogs()
    this.loadTechnicianOrders()
    this.loadTechnicians()
  }

  ngOnDestroy(): void {
    this.stopLiveTimer()
  }

  setActiveTab(tab: TechnicianPanelTab): void {
    if (this.activeTab === tab) {
      return
    }

    this.activeTab = tab
    this.currentPage = 1
    this.clearSelectedServiceOrder()
  }

  setActiveDetailTab(tab: TechnicianDetailTab): void {
    this.activeDetailTab = tab
  }

  private createDiagnosisForm(): FormGroup {
    return this.formBuilder.group({
      summary: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      details: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]],
      outcome: [ServiceOrderDiagnosisOutcome.REPAIRABLE, Validators.required],
    })
  }

  private createAgreementForm(): FormGroup {
    return this.formBuilder.group({
      notes: ["", Validators.maxLength(500)],
      currency: ["PEN", Validators.required],
    })
  }

  private createClientDecisionForm(): FormGroup {
    return this.formBuilder.group({
      decision: ["ACCEPTED" as ServiceOrderClientDecisionType, Validators.required],
      channel: ["WHATSAPP" as ServiceOrderClientDecisionChannel, Validators.required],
      observation: ["", Validators.maxLength(1000)],
    })
  }

  private loadAgreementCatalogs(): void {
    this.productsService.list().subscribe({
      next: (products) => {
        this.products = products ?? []
      },
      error: () => {
        this.products = []
      },
    })
  }

  private loadTechnicianOrders(): void {
    const technicianId = this.getCurrentUserId()
    if (!technicianId) {
      this.allOrders = []
      this.hydrateLists([])
      return
    }

    this.isLoadingOrders = true
    this.serviceOrderService
      .findAll({
        page: 1,
        limit: 50,
        technicianId,
      })
      .pipe(finalize(() => (this.isLoadingOrders = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar tus órdenes asignadas."),
      })
  }

  private hydrateLists(orders: ServiceOrder[]): void {
    this.allOrders = [...orders]

    this.todoOrders = orders.filter((order) =>
      [
        ServiceOrderTechnicalStatus.ASIGNADA,
        ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      ].includes(order.technicalStatus),
    )

    this.diagnosisOrders = orders.filter((order) => order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO)

    this.pendingApprovalOrders = orders.filter((order) =>
      [
        ServiceOrderTechnicalStatus.DIAGNOSTICADA,
        ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL,
      ].includes(order.technicalStatus),
    )

    this.repairOrders = orders.filter((order) =>
      [ServiceOrderTechnicalStatus.EN_EJECUCION, ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO].includes(order.technicalStatus),
    )

    this.repairedOrders = orders.filter((order) => order.technicalStatus === ServiceOrderTechnicalStatus.RESUELTA)

    if (this.selectedServiceOrder) {
      const updated = orders.find((entry) => Number(entry.id) === Number(this.selectedServiceOrder?.id))
      this.selectedServiceOrder = updated ?? null
      if (this.selectedServiceOrder) {
        if (!this.isOrderVisibleInCurrentTab(this.selectedServiceOrder)) {
          this.clearSelectedServiceOrder()
        } else {
          this.loadServiceOrderDiagnosisHistory(Number(this.selectedServiceOrder.id))
          this.loadServiceOrderAgreementSummary(this.selectedServiceOrder)
        }
      } else {
        this.diagnosticHistory = []
        this.agreementSummary = null
        this.agreementHistory = []
      }
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }
  }

  get visibleOrders(): ServiceOrder[] {
    switch (this.activeTab) {
      case "todo":
        return this.todoOrders
      case "diagnosis":
        return this.diagnosisOrders
      case "pending_approval":
        return this.pendingApprovalOrders
      case "repair":
        return this.repairOrders
      case "repaired":
        return this.repairedOrders
      default:
        return this.allOrders
    }
  }

  get paginatedVisibleOrders(): ServiceOrder[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.visibleOrders.slice(start, start + this.itemsPerPage)
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.visibleOrders.length / this.itemsPerPage))
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1
    }
  }

  selectServiceOrder(order: ServiceOrder): void {
    this.selectedServiceOrder = order
    this.activeDetailTab = "equipment"
    this.loadServiceOrderDiagnosisHistory(Number(order.id))
    this.loadServiceOrderAgreementSummary(order)
    this.startLiveTimer(order.sla?.elapsedMinutes ?? 0)
  }

  clearSelectedServiceOrder(): void {
    this.selectedServiceOrder = null
    this.activeDetailTab = "equipment"
    this.diagnosticHistory = []
    this.agreementSummary = null
    this.agreementHistory = []
    this.stopLiveTimer()
  }

  isOrderSelected(order: ServiceOrder): boolean {
    return Number(this.selectedServiceOrder?.id) === Number(order.id)
  }

  private isOrderVisibleInCurrentTab(order: ServiceOrder): boolean {
    return this.visibleOrders.some((entry) => Number(entry.id) === Number(order.id))
  }

  getTabLabel(tab: TechnicianPanelTab): string {
    switch (tab) {
      case "todo":
        return "Por hacer"
      case "diagnosis":
        return "En diagnóstico"
      case "pending_approval":
        return "Pendientes de acuerdo"
      case "repair":
        return "En servicio"
      case "repaired":
        return "Finalizados"
      case "all":
      default:
        return "Todos"
    }
  }

  getTabIcon(tab: TechnicianPanelTab): string {
    switch (tab) {
      case "todo":
        return "fas fa-tasks"
      case "diagnosis":
        return "fas fa-stethoscope"
      case "pending_approval":
        return "fas fa-hourglass-half"
      case "repair":
        return "fas fa-wrench"
      case "repaired":
        return "fas fa-check-circle"
      case "all":
      default:
        return "fas fa-list"
    }
  }

  getTabCount(tab: TechnicianPanelTab): number {
    switch (tab) {
      case "todo":
        return this.todoOrders.length
      case "diagnosis":
        return this.diagnosisOrders.length
      case "pending_approval":
        return this.pendingApprovalOrders.length
      case "repair":
        return this.repairOrders.length
      case "repaired":
        return this.repairedOrders.length
      case "all":
      default:
        return this.allOrders.length
    }
  }

  getEmptyStateLabel(): string {
    switch (this.activeTab) {
      case "todo":
        return "No hay órdenes por atender"
      case "diagnosis":
        return "No hay órdenes en diagnóstico"
      case "pending_approval":
        return "No hay órdenes pendientes de coordinación o acuerdo"
      case "repair":
        return "No hay órdenes en servicio"
      case "repaired":
        return "No hay órdenes finalizadas"
      case "all":
      default:
        return "No hay órdenes registradas"
    }
  }

  getOrderBadgeClass(order: ServiceOrder): string {
    if (order.operativeStatus === ServiceOrderOperativeStatus.ENTREGA_PARCIAL) {
      return "badge badge-waiting"
    }
    if (order.operativeStatus === ServiceOrderOperativeStatus.CANCELACION_SOLICITADA) {
      return "badge badge-waiting"
    }
    switch (order.technicalStatus) {
      case ServiceOrderTechnicalStatus.EN_DIAGNOSTICO:
        return "badge badge-diagnosis"
      case ServiceOrderTechnicalStatus.DIAGNOSTICADA:
      case ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL:
        return "badge badge-commercial-pending"
      case ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION:
        return "badge badge-authorized"
      case ServiceOrderTechnicalStatus.EN_EJECUCION:
        return "badge badge-repair"
      case ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO:
        return "badge badge-waiting"
      case ServiceOrderTechnicalStatus.RESUELTA:
        return "badge badge-success-strong"
      default:
        return "badge badge-info-strong"
    }
  }

  getOrderStatusPillLabel(order: ServiceOrder): string {
    if (order.operativeStatus === ServiceOrderOperativeStatus.ENTREGA_PARCIAL) {
      return "Entrega parcial"
    }
    if (order.operativeStatus === ServiceOrderOperativeStatus.CANCELACION_SOLICITADA) {
      return "Cancelación solicitada"
    }
    switch (order.technicalStatus) {
      case ServiceOrderTechnicalStatus.DIAGNOSTICADA:
        return "Diagnosticado"
      case ServiceOrderTechnicalStatus.EN_EJECUCION:
      case ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO:
      case ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION:
        return "En servicio"
      case ServiceOrderTechnicalStatus.RESUELTA:
        return "Finalizado"
      case ServiceOrderTechnicalStatus.EN_DIAGNOSTICO:
        return "En diagnóstico"
      default:
        return this.getWorkflowLabel(order)
    }
  }

  getOrderStageIcon(order: ServiceOrder): string {
    switch (order.technicalStatus) {
      case ServiceOrderTechnicalStatus.DIAGNOSTICADA:
      case ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL:
        return "fas fa-hourglass-half"
      case ServiceOrderTechnicalStatus.EN_EJECUCION:
      case ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO:
      case ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION:
        return "fas fa-wrench"
      case ServiceOrderTechnicalStatus.RESUELTA:
        return "fas fa-circle-check"
      default:
        return "fas fa-hourglass-half"
    }
  }

  getOrderStageLabel(order: ServiceOrder): string {
    if (order.operativeStatus === ServiceOrderOperativeStatus.ENTREGA_PARCIAL) {
      const delivered = order.itemProgress?.delivered ?? 0
      const active = order.itemProgress?.active ?? order.items?.length ?? 0
      return `${delivered} de ${active} equipos entregados`
    }
    if (order.operativeStatus === ServiceOrderOperativeStatus.CANCELACION_SOLICITADA) {
      return "Esperando revisión de supervisión"
    }
    if (order.technicalStatus === ServiceOrderTechnicalStatus.DIAGNOSTICADA) {
      return "Esperando coordinación"
    }
    if (order.technicalStatus === ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL) {
      return "Esperando acuerdo"
    }
    if (order.technicalStatus === ServiceOrderTechnicalStatus.ASIGNADA && order.serviceType === ServiceType.STANDARD_SERVICE) {
      return "Esperando inicio de servicio"
    }
    return this.getWorkflowLabel(order)
  }

  canShowAgreementShortcut(order: ServiceOrder): boolean {
    return this.canManageAgreement(order)
  }

  shouldShowHistoryTab(order: ServiceOrder | null): boolean {
    return !!order && (this.isDiagnosisService(order) || this.isWarrantyService(order))
  }

  canOpenClientInbox(order: ServiceOrder | null): boolean {
    if (!order) return false
    return ![
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ].includes(order.operativeStatus)
  }

  openWhatsAppInbox(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenClientInbox(order)) return

    this.serviceOrderInboxService.getThreadByOrder(Number(order.id)).subscribe({
      next: (thread) => {
        void this.router.navigate(['/service-order-inbox'], {
          queryParams: {
            threadId: thread.id,
            serviceOrderId: Number(order.id),
          },
        })
      },
      error: () => {
        this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos abrir la conversación del cliente.")
      },
    })
  }

  startDiagnosis(order: ServiceOrder): void {
    if (![ServiceType.DIAGNOSIS, ServiceType.WARRANTY_SERVICE].includes(order.serviceType)) return
    const isWarranty = this.isWarrantyService(order)
    this.requestItemTransition(
      order,
      ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      [ServiceOrderTechnicalStatus.ASIGNADA],
      isWarranty ? "Seleccionar equipo para iniciar revisión" : "Seleccionar equipo para iniciar diagnóstico",
      isWarranty
        ? "Elige el equipo cuya revisión de garantía deseas iniciar."
        : "Elige el equipo cuyo diagnóstico deseas iniciar.",
      isWarranty ? "Iniciar revisión" : "Iniciar diagnóstico",
      isWarranty ? "Revisión de garantía iniciada correctamente." : "Diagnóstico iniciado correctamente.",
    )
  }

  startStandardService(order: ServiceOrder): void {
    if (!this.isStandardService(order)) return
    this.startRepair(order)
  }

  openDiagnosisModal(
    order?: ServiceOrder,
    event?: Event,
    presetOutcome: ServiceOrderDiagnosisOutcome = ServiceOrderDiagnosisOutcome.REPAIRABLE,
  ): void {
    event?.stopPropagation()
    if (order) {
      this.selectServiceOrder(order)
    }
    if (!this.selectedServiceOrder) return
    if (!this.isDiagnosisService(this.selectedServiceOrder)) return
    const eligibleItems = this.diagnosisEligibleItems
    this.selectedDiagnosisItemId = eligibleItems.length === 1 ? Number(eligibleItems[0].id) : null
    this.showDiagnosisModal = true
    this.diagnosisForm.reset({
      summary: "",
      details: "",
      outcome: presetOutcome,
    })
  }

  closeDiagnosisModal(): void {
    this.showDiagnosisModal = false
    this.selectedDiagnosisItemId = null
    this.diagnosisForm.reset({
      summary: "",
      details: "",
      outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE,
    })
  }

  openAgreementModal(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.selectServiceOrder(order)
    this.showAgreementModal = true
    this.isViewingAgreementHistory = false
    this.resetAgreementComposerState()
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.isLoadingServiceOrderAgreement = true

    forkJoin({
      agreements: this.agreementService
        .findAll({ page: 1, limit: 5, serviceOrderId: Number(order.id) })
        .pipe(catchError(() => of({ data: [] }))),
      diagnoses: this.diagnosticService
        .findAll({ serviceOrderId: Number(order.id), limit: 20 })
        .pipe(catchError(() => of({ data: [] }))),
    })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreement = false)))
      .subscribe({
        next: ({ agreements, diagnoses }) => {
          this.diagnosticHistory = diagnoses.data ?? []
          const list = agreements.data ?? []
          this.agreementHistory = list

          if (this.usesItemCommercialComposer(order)) {
            this.agreementSummary = this.resolveLatestAgreement(list)
            const eligibleItems = this.getAgreementEligibleItems()
            const preferredItem = eligibleItems.find((item) => !this.isAgreementItemLocked(item) && [
              ServiceOrderCommercialStatus.PENDIENTE_PROPUESTA,
              ServiceOrderCommercialStatus.RECHAZADA,
              ServiceOrderCommercialStatus.PENDIENTE_RESPUESTA_CLIENTE,
              ServiceOrderCommercialStatus.PROPUESTA_EMITIDA,
            ].includes(item.commercialStatus))
              ?? eligibleItems.find((item) => !this.isAgreementItemLocked(item))
              ?? eligibleItems[0]
            this.selectAgreementItem(preferredItem?.id ?? null, true)
            return
          }

          const context = this.resolveAgreementModalContext(order, list)
          this.agreementSummary = context.summary
          this.agreementBaseVersion = context.baseAgreement
          this.isDerivedAgreementComposerActive = context.derivedMode
          this.agreementInheritedNotes = context.inheritedNotes
          this.agreementForm.patchValue({
            notes: context.formNotes,
            currency: context.currency,
          })

          if (context.sourceAgreement) {
            this.hydrateAgreementComposer(context.sourceAgreement)
          } else {
            this.ensureTechnicalServiceItem()
          }
        },
        error: () => {
          this.resetAgreementComposerState()
          this.agreementHistory = []
        },
      })
  }

  openAgreementHistoryModal(agreement: ServiceOrderAgreement, event?: Event): void {
    event?.stopPropagation()
    if (!this.selectedServiceOrder) return

    this.showAgreementModal = true
    this.isViewingAgreementHistory = true
    this.resetAgreementComposerState()
    this.agreementSummary = agreement

    if (this.usesItemCommercialComposer()) {
      const firstLinkedItem = agreement.items?.find((link) =>
        this.getAgreementEligibleItems().some((item) => Number(item.id) === Number(link.serviceOrderItemId)),
      )
      this.selectedAgreementItemId = this.toNumericId(firstLinkedItem?.serviceOrderItemId)
      this.agreementForm.reset({
        notes: firstLinkedItem?.commercialVersion?.notes ?? agreement.notes ?? "",
        currency: agreement.currency ?? "PEN",
      })
      this.hydrateItemCommercialVersion(firstLinkedItem?.commercialVersion ?? null)
      return
    }

    this.agreementBaseVersion = this.resolveAgreementBaseById(agreement.derivedFromAgreementId ?? null, this.agreementHistory)
    this.isDerivedAgreementComposerActive = this.isDerivedAgreement(agreement)
    this.agreementInheritedNotes = this.agreementBaseVersion?.notes ?? ""
    this.agreementForm.reset({
      notes: this.isDerivedAgreementComposerActive ? agreement.notes ?? "" : agreement.notes ?? "",
      currency: agreement.currency ?? "PEN",
    })
    this.hydrateAgreementComposer(agreement)
  }

  closeAgreementModal(): void {
    this.showAgreementModal = false
    this.closeClientDecisionModal()
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.resetAgreementComposerState()
    this.productPriceLoading = {}
  }

  canRecordClientDecision(): boolean {
    const status = this.getSelectedAgreementVersionLink()?.commercialVersion?.status
    return this.usesItemCommercialComposer()
      && !this.isViewingAgreementHistory
      && (status === "DRAFT" || status === "ISSUED")
  }

  openClientDecisionModal(): void {
    const version = this.getSelectedAgreementVersionLink()?.commercialVersion
    if (!version) {
      this.showMessage("warning", "fas fa-info-circle", "Primero guarda una versión comercial para este equipo.")
      return
    }
    if (!this.canRecordClientDecision()) {
      this.showMessage("warning", "fas fa-info-circle", "Esta versión ya no admite nuevas decisiones.")
      return
    }

    this.clientDecisionForm.reset({
      decision: "ACCEPTED",
      channel: "WHATSAPP",
      observation: "",
    })
    this.showClientDecisionModal = true
  }

  closeClientDecisionModal(): void {
    this.showClientDecisionModal = false
    this.clientDecisionForm.reset({
      decision: "ACCEPTED",
      channel: "WHATSAPP",
      observation: "",
    })
  }

  submitClientDecision(): void {
    if (this.clientDecisionForm.invalid) {
      this.markFormGroupAsTouched(this.clientDecisionForm)
      return
    }
    const versionId = this.toNumericId(this.getSelectedAgreementVersionLink()?.commercialVersionId)
    if (!versionId) {
      this.showMessage("warning", "fas fa-info-circle", "No pudimos identificar la versión comercial del equipo.")
      return
    }

    const decision = this.clientDecisionForm.get("decision")?.value as ServiceOrderClientDecisionType
    const channel = this.clientDecisionForm.get("channel")?.value as ServiceOrderClientDecisionChannel
    const observation = String(this.clientDecisionForm.get("observation")?.value ?? "").trim()
    this.isSavingClientDecision = true
    this.agreementService.recordClientDecision({
      commercialVersionId: versionId,
      decision,
      channel,
      ...(observation ? { observation } : {}),
    })
      .pipe(finalize(() => (this.isSavingClientDecision = false)))
      .subscribe({
        next: (result) => {
          const message = decision === "CHANGES_REQUESTED"
            ? "Se registró que el cliente solicita cambios para este equipo."
            : result.allAccepted
              ? "Se registró la aceptación y el acuerdo consolidado quedó confirmado."
              : "Se registró la aceptación de este equipo. Los demás equipos siguen pendientes."
          this.closeClientDecisionModal()
          this.closeAgreementModal()
          this.showMessage("success", "fas fa-check-circle", message)
          this.loadTechnicianOrders()
        },
        error: (error) => {
          const backendMessage = error?.error?.message
          const message = Array.isArray(backendMessage)
            ? backendMessage.join(" ")
            : backendMessage || "No pudimos registrar la decisión del cliente."
          this.showMessage("danger", "fas fa-times-circle", message)
        },
      })
  }

  addAgreementProduct(): void {
    if (!this.isAgreementEditable()) return
    this.agreementNewItems.push({
      id: Date.now() + Math.random(),
      type: "product",
      productId: null,
      productCodeSnapshot: null,
      productNameSnapshot: "",
      quantity: 1,
      unitPrice: 0,
      discountPct: 0,
      discountOverrideReason: "",
      requiresPurchase: true,
      notes: "",
      permissions: this.buildUiMeta("NEW", true, true),
    })
  }

  removeAgreementItem(index: number): void {
    if (!this.isAgreementEditable()) return
    const item = this.getAgreementProductItems()[index]
    if (!item || !item.permissions.canDelete) return
    this.agreementNewItems = this.agreementNewItems.filter((entry) => entry.id !== item.id)
  }

  updateTechnicalServiceAmount(value: unknown): void {
    const item = this.getTechnicalServiceItem()
    if (!item) return
    item.unitPrice = Number(value) || 0
  }

  onAgreementProductSelected(item: AgreementProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (!item.productId) {
      item.unitPrice = 0
      return
    }
    this.fetchAgreementProductPrice(item)
  }

  onAgreementProductQuantityChange(item: AgreementProductComposer, value: any): void {
    item.quantity = Math.max(1, Number(value) || 1)
    if (item.productId) {
      this.fetchAgreementProductPrice(item)
    }
  }

  private fetchAgreementProductPrice(item: AgreementProductComposer): void {
    if (!item.productId) return
    this.productPriceLoading[item.id] = true
    this.pricingQuery
      .calculatePrice(item.productId)
      .pipe(finalize(() => (this.productPriceLoading[item.id] = false)))
      .subscribe({
        next: (res) => {
          item.unitPrice = res?.salePrice ?? 0
        },
        error: () => {
          this.showMessage("warning", "fas fa-info-circle", "No pudimos obtener el precio del producto.")
        },
      })
  }

  calculateAgreementItemGross(item: AgreementComposerItem): number {
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    return Number(item.unitPrice ?? TECHNICAL_SERVICE_OPTION.price)
  }

  calculateAgreementItemDiscount(item: AgreementComposerItem): number {
    const gross = this.calculateAgreementItemGross(item)
    const percentage = Math.min(100, Math.max(0, Number(item.discountPct ?? 0)))
    return Number((gross * percentage / 100).toFixed(2))
  }

  calculateAgreementItemSubtotal(item: AgreementComposerItem): number {
    return Number((this.calculateAgreementItemGross(item) - this.calculateAgreementItemDiscount(item)).toFixed(2))
  }

  updateAgreementItemDiscount(item: AgreementComposerItem, value: unknown): void {
    item.discountPct = Math.min(100, Math.max(0, Number(value) || 0))
  }

  calculateAgreementTotal(): number {
    return this.getAgreementComposerItems().reduce((total, item) => total + this.calculateAgreementItemSubtotal(item), 0)
  }

  getAgreementProductsTotal(): number {
    return this.getAgreementProductItems().reduce((total, item) => total + this.calculateAgreementItemSubtotal(item), 0)
  }

  submitAgreement(confirmImmediately = true): void {
    const order = this.selectedServiceOrder
    if (!order?.id) return
    if (!this.isAgreementEditable()) {
      this.showMessage("warning", "fas fa-info-circle", "El acuerdo ya está confirmado y no puede modificarse.")
      return
    }
    if (!this.hasAgreementComposerItems()) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Agrega al menos un producto o servicio al acuerdo.")
      return
    }
    if (!this.isTechnicalServiceAmountValid()) {
      this.showMessage("warning", "fas fa-exclamation-circle", "El servicio técnico debe ser de al menos S/20.")
      return
    }

    if (this.usesItemCommercialComposer(order)) {
      this.submitItemCommercialRevision(order)
      return
    }

    const currentDiagnosisId = this.toNumericId(
      this.diagnosticHistory.find((entry) => entry.status === ServiceOrderDiagnosisStatus.CURRENT)?.id,
    )

    const productsPayload = this.getAgreementProductItems().flatMap((entry) => {
      const productId = this.toNumericId(entry.productId)
      if (!productId) return []

      const quantity = Math.max(1, Number(entry.quantity) || 1)
      const unitPriceRaw = entry.unitPrice !== undefined && entry.unitPrice !== null ? Number(entry.unitPrice) : undefined
      const unitPrice = unitPriceRaw !== undefined && Number.isFinite(unitPriceRaw)
        ? Number(unitPriceRaw.toFixed(2))
        : undefined

      return [{
        productId,
        quantity,
        unitPrice,
        requiresPurchase: entry.requiresPurchase,
        notes: entry.notes || undefined,
      }]
    })

    const payload = this.isDerivedAgreementComposer()
      ? {
          serviceOrderId: Number(order.id),
          ...(currentDiagnosisId ? { diagnosisId: currentDiagnosisId } : {}),
          ...(this.agreementBaseVersion?.id ? { baseAgreementId: Number(this.agreementBaseVersion.id) } : {}),
          notes: this.agreementForm.get("notes")?.value || undefined,
          technicalServiceAmount: this.resolveTechnicalServiceAmount(),
          newProducts: productsPayload,
        }
      : {
          serviceOrderId: Number(order.id),
          ...(currentDiagnosisId ? { diagnosisId: currentDiagnosisId } : {}),
          notes: this.agreementForm.get("notes")?.value || undefined,
          technicalServiceAmount: this.resolveTechnicalServiceAmount(),
          products: productsPayload,
        }

    const request$ = this.agreementSummary?.status === ServiceOrderAgreementStatus.DRAFT
      ? this.agreementService.update(this.agreementSummary.id, payload)
      : this.agreementService.create(payload)

    this.isSavingAgreement = true
    request$
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: (agreement) => {
          if (!confirmImmediately) {
            this.agreementSummary = agreement
            this.showMessage("success", "fas fa-check-circle", "Borrador de acuerdo guardado.")
            this.closeAgreementModal()
            this.loadTechnicianOrders()
            return
          }

          this.confirmAgreement(agreement.id)
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos guardar el acuerdo."),
      })
  }

  confirmAgreement(agreementId: number): void {
    if (!this.isAgreementEditable()) {
      this.showMessage("warning", "fas fa-info-circle", "El acuerdo ya está confirmado.")
      return
    }
    this.isSavingAgreement = true
    this.agreementService
      .confirm(agreementId)
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage(
            "success",
            "fas fa-check-circle",
            this.isDerivedAgreementComposer()
              ? "Nueva versión de acuerdo confirmada. La versión anterior quedó reemplazada."
              : "Acuerdo confirmado. Ya puedes continuar con el servicio.",
          )
          this.closeAgreementModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos confirmar el acuerdo."),
      })
  }

  markNoAgreement(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.selectServiceOrder(order)
    this.isSavingAgreement = true
    this.agreementService
      .createDiagnosisFeeAgreement(Number(order.id))
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Orden marcada para recojo con cargo de diagnóstico.")
          this.closeAgreementModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos cerrar la orden sin acuerdo."),
      })
  }

  submitDiagnosis(): void {
    if (this.diagnosisForm.invalid || !this.selectedServiceOrder || !this.canSubmitDiagnosis) {
      this.markFormGroupAsTouched(this.diagnosisForm)
      return
    }

    const selectedItem = this.selectedDiagnosisItem
    const wasInService =
      selectedItem?.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION ||
      (!selectedItem && this.selectedServiceOrder.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION)
    const orderId = Number(this.selectedServiceOrder.id)
    const selectedOutcome =
      (this.diagnosisForm.get("outcome")?.value as ServiceOrderDiagnosisOutcome | null) ??
      ServiceOrderDiagnosisOutcome.REPAIRABLE
    const chargesDiagnosisFee = selectedOutcome === ServiceOrderDiagnosisOutcome.IRREPARABLE
    const waivesCharge = selectedOutcome === ServiceOrderDiagnosisOutcome.NO_FAULT_FOUND

    const payload: ServiceOrderDiagnosisSaveRequest = {
      ...(selectedItem
        ? { serviceOrderItemId: Number(selectedItem.id) }
        : { serviceOrderId: orderId }),
      summary: this.diagnosisForm.get("summary")?.value,
      details: this.diagnosisForm.get("details")?.value,
      outcome: selectedOutcome,
    }

    this.isSavingDiagnosis = true
    this.diagnosticService
      .create(payload)
      .pipe(
        switchMap(() => {
          if (chargesDiagnosisFee) {
            return this.agreementService.createDiagnosisFeeAgreement(orderId).pipe(map(() => "DIAGNOSIS_FEE"))
          }

          if (waivesCharge) {
            return of("WAIVED")
          }

          return of("NORMAL")
        }),
        finalize(() => (this.isSavingDiagnosis = false)),
      )
      .subscribe({
        next: (resolution) => {
          this.showMessage(
            "success",
            "fas fa-check-circle",
            resolution === "DIAGNOSIS_FEE"
              ? "Diagnóstico registrado. La orden quedó lista para entrega con cobro de diagnóstico."
              : resolution === "WAIVED"
                ? "Diagnóstico registrado. La orden quedó lista para entrega sin cobro."
                : wasInService
                  ? "Nuevo diagnóstico registrado. La orden volvió a coordinación para generar un nuevo acuerdo."
                  : "Diagnostico registrado correctamente.",
          )
          this.closeDiagnosisModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar el diagnóstico."),
      })
  }

  getAgreementDiscountTotal(): number {
    return this.getAgreementComposerItems().reduce(
      (total, item) => total + this.calculateAgreementItemDiscount(item),
      0,
    )
  }

  get diagnosisEligibleItems(): ServiceOrderItem[] {
    const items = this.selectedServiceOrder?.items ?? []
    return items.filter((item) =>
      [ServiceOrderTechnicalStatus.EN_DIAGNOSTICO, ServiceOrderTechnicalStatus.EN_EJECUCION].includes(
        item.technicalStatus,
      ),
    )
  }

  get selectedDiagnosisItem(): ServiceOrderItem | null {
    if (!this.selectedDiagnosisItemId) return null
    return this.diagnosisEligibleItems.find((item) => Number(item.id) === Number(this.selectedDiagnosisItemId)) ?? null
  }

  get canSubmitDiagnosis(): boolean {
    const items = this.selectedServiceOrder?.items ?? []
    return items.length === 0 || this.selectedDiagnosisItem !== null
  }

  getDiagnosisItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(' ')
    return `${item.code}${equipment ? ` · ${equipment}` : ''}`
  }

  submitDiagnosisAsNoSolution(): void {
    if (!this.selectedServiceOrder || !this.isDiagnosisService(this.selectedServiceOrder)) return

    const currentOutcome =
      (this.diagnosisForm.get("outcome")?.value as ServiceOrderDiagnosisOutcome | null) ??
      ServiceOrderDiagnosisOutcome.REPAIRABLE

    if (currentOutcome === ServiceOrderDiagnosisOutcome.REPAIRABLE) {
      this.diagnosisForm.patchValue({ outcome: ServiceOrderDiagnosisOutcome.IRREPARABLE })
    }

    this.submitDiagnosis()
  }

  startRepair(order: ServiceOrder): void {
    this.requestItemTransition(
      order,
      ServiceOrderTechnicalStatus.EN_EJECUCION,
      [ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION],
      "Seleccionar equipo para iniciar servicio",
      "Elige el equipo cuya atención deseas iniciar.",
      "Iniciar servicio",
      "Servicio iniciado correctamente.",
      "No hay equipos autorizados para iniciar el servicio.",
    )
  }

  markRepaired(order: ServiceOrder): void {
    this.requestItemTransition(
      order,
      ServiceOrderTechnicalStatus.RESUELTA,
      [ServiceOrderTechnicalStatus.EN_EJECUCION],
      "Seleccionar equipo para finalizar servicio",
      "Elige el equipo que terminó su atención técnica.",
      "Finalizar servicio",
      "Equipo marcado como reparado.",
      "No hay equipos en ejecución que puedan finalizarse.",
    )
  }

  canFinishRepair(order?: ServiceOrder | null): boolean {
    if (!order) return false
    return this.hasItemInTechnicalStatus(order, [ServiceOrderTechnicalStatus.EN_EJECUCION])
  }

  get itemTransitionEligibleItems(): ServiceOrderItem[] {
    if (!this.itemTransitionContext) return []
    return this.getItemsInTechnicalStatuses(
      this.itemTransitionContext.order,
      this.itemTransitionContext.sourceStatuses,
    )
  }

  confirmItemTransition(): void {
    const context = this.itemTransitionContext
    const item = this.itemTransitionEligibleItems.find(
      (entry) => Number(entry.id) === Number(this.selectedItemTransitionId),
    )
    if (!context || !item || this.isSavingItemTransition) return
    this.executeItemTransition(context, item)
  }

  closeItemTransitionModal(): void {
    if (this.isSavingItemTransition) return
    this.showItemTransitionModal = false
    this.selectedItemTransitionId = null
    this.itemTransitionContext = null
  }

  private requestItemTransition(
    order: ServiceOrder,
    nextStatus: ServiceOrderTechnicalStatus,
    sourceStatuses: ServiceOrderTechnicalStatus[],
    title: string,
    description: string,
    confirmLabel: string,
    successMessage: string,
    emptyMessage = "No hay equipos en una etapa que permita realizar esta acción.",
  ): void {
    const context: ItemTransitionContext = {
      order,
      nextStatus,
      sourceStatuses,
      title,
      description,
      confirmLabel,
      successMessage,
    }
    const items = order.items ?? []

    if (items.length === 0) {
      if (!sourceStatuses.includes(order.technicalStatus)) {
        this.showMessage("warning", "fas fa-exclamation-circle", emptyMessage)
        return
      }
      this.transitionWorkflow(order, nextStatus, successMessage)
      return
    }

    const eligibleItems = this.getItemsInTechnicalStatuses(order, sourceStatuses)
    if (eligibleItems.length === 0) {
      this.showMessage("warning", "fas fa-exclamation-circle", emptyMessage)
      return
    }
    if (eligibleItems.length === 1) {
      this.executeItemTransition(context, eligibleItems[0])
      return
    }

    this.itemTransitionContext = context
    this.selectedItemTransitionId = null
    this.showItemTransitionModal = true
  }

  private executeItemTransition(context: ItemTransitionContext, item: ServiceOrderItem): void {
    this.isSavingItemTransition = true
    this.serviceOrderService
      .changeItemTechnicalStatus(Number(context.order.id), Number(item.id), context.nextStatus)
      .pipe(finalize(() => (this.isSavingItemTransition = false)))
      .subscribe({
        next: () => {
          this.showItemTransitionModal = false
          this.selectedItemTransitionId = null
          this.itemTransitionContext = null
          this.showMessage("success", "fas fa-check-circle", context.successMessage)
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el estado del equipo."),
      })
  }

  private getItemsInTechnicalStatuses(
    order: ServiceOrder,
    statuses: ServiceOrderTechnicalStatus[],
  ): ServiceOrderItem[] {
    return (order.items ?? []).filter((item) => statuses.includes(item.technicalStatus))
  }

  private hasItemInTechnicalStatus(
    order: ServiceOrder,
    statuses: ServiceOrderTechnicalStatus[],
  ): boolean {
    const items = order.items ?? []
    return items.length > 0
      ? items.some((item) => statuses.includes(item.technicalStatus))
      : statuses.includes(order.technicalStatus)
  }

  acceptWarrantyReview(order: ServiceOrder): void {
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION, "Garantia aceptada correctamente.")
  }

  rejectWarrantyReview(order: ServiceOrder): void {
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.SIN_SOLUCION, "Garantia rechazada correctamente.")
  }

  private transitionWorkflow(order: ServiceOrder, status: ServiceOrderTechnicalStatus, successMessage: string): void {
    const orderId = Number(order.id)
    if (!orderId) {
      this.showMessage("danger", "fas fa-times-circle", "ID de orden invalido.")
      return
    }

    this.serviceOrderService.changeTechnicalStatus(orderId, status).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", successMessage)
        this.loadTechnicianOrders()
      },
      error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el estado de la orden."),
    })
  }

  getTechnicianName(order: ServiceOrder): string {
    if (order.assignedToTechnicianName) {
      return order.assignedToTechnicianName
    }
    if (order.assignedToTechnicianId) {
      return this.techniciansMap.get(order.assignedToTechnicianId) ?? `Tecnico #${order.assignedToTechnicianId}`
    }
    return "Sin asignar"
  }

  private loadServiceOrderDiagnosisHistory(serviceOrderId: number): void {
    const normalizedId = Number(serviceOrderId)
    if (!normalizedId) {
      this.diagnosticHistory = []
      return
    }
    this.diagnosticService.findAll({ serviceOrderId: normalizedId, limit: 20 }).subscribe({
      next: ({ data }) => (this.diagnosticHistory = data ?? []),
      error: () => this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el historial de diagnósticos."),
    })
  }

  canStartDiagnosis(order: ServiceOrder): boolean {
    return [ServiceType.DIAGNOSIS, ServiceType.WARRANTY_SERVICE].includes(order.serviceType) &&
      this.hasItemInTechnicalStatus(order, [ServiceOrderTechnicalStatus.ASIGNADA])
  }

  canOpenRediagnosis(order: ServiceOrder | null): boolean {
    if (!order) return false
    return order.serviceType === ServiceType.DIAGNOSIS &&
      this.hasItemInTechnicalStatus(order, [ServiceOrderTechnicalStatus.EN_EJECUCION])
  }

  canRegisterDiagnosis(order: ServiceOrder | null): boolean {
    if (!order || !this.isDiagnosisService(order)) return false
    return this.hasItemInTechnicalStatus(order, [
      ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      ServiceOrderTechnicalStatus.EN_EJECUCION,
    ])
  }

  canManageAgreement(order: ServiceOrder | null): boolean {
    if (!order || this.isWarrantyService(order)) return false
    return EDITABLE_AGREEMENT_STATUSES.includes(order.technicalStatus)
  }

  isAgreementEditable(): boolean {
    if (this.usesItemCommercialComposer()) {
      const selectedItem = this.getSelectedAgreementItem()
      return !this.isViewingAgreementHistory && selectedItem !== null && !this.isAgreementItemLocked(selectedItem)
    }
    return !this.agreementSummary || this.agreementSummary.status === ServiceOrderAgreementStatus.DRAFT
  }

  getAgreementModalMessage(): string | null {
    if (this.usesItemCommercialComposer()) {
      if (this.getSelectedAgreementItem() && this.isAgreementItemLocked(this.getSelectedAgreementItem()!)) {
        return "Esta versión ya fue aceptada y permanece bloqueada. Selecciona un equipo pendiente para preparar cambios."
      }
      return this.getSelectedAgreementVersionLink()?.commercialVersion
        ? "Estás preparando una nueva versión comercial para el equipo seleccionado. Los demás equipos conservarán su versión vigente."
        : "Estás preparando la primera versión comercial del equipo seleccionado."
    }

    if (this.isDerivedAgreementComposer()) {
      return 'Estás preparando una nueva versión derivada. Al confirmar, este acuerdo reemplaza al acuerdo activo anterior.'
    }

    if (!this.agreementSummary) {
      return null
    }

    switch (this.agreementSummary.status) {
      case ServiceOrderAgreementStatus.DRAFT:
        return 'Este acuerdo está en borrador. Puedes editarlo o confirmarlo.'
      case ServiceOrderAgreementStatus.CONFIRMED:
        return 'Este acuerdo ya está confirmado. Solo puedes revisarlo.'
      case ServiceOrderAgreementStatus.SUPERSEDED:
        return 'Este acuerdo fue reemplazado por una versión más reciente. Solo puedes revisarlo.'
      case ServiceOrderAgreementStatus.VOIDED:
        return 'Este acuerdo fue anulado. Solo puedes revisarlo.'
      default:
        return null
    }
  }

  isAdditionalDiagnosisFlow(): boolean {
    return this.selectedDiagnosisItem?.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION ||
      (!this.selectedDiagnosisItem &&
        this.selectedServiceOrder?.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION)
  }

  canStartRepairDirectly(order: ServiceOrder): boolean {
    return (
      this.hasItemInTechnicalStatus(order, [ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION]) &&
      !this.isStandardService(order)
    )
  }

  isWarrantyService(order: ServiceOrder | null): boolean {
    return !!order && order.serviceType === ServiceType.WARRANTY_SERVICE
  }

  canAcceptWarrantyReview(order: ServiceOrder | null): boolean {
    return !!order && this.isWarrantyService(order) && order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO
  }

  canRejectWarrantyReview(order: ServiceOrder | null): boolean {
    return !!order && this.isWarrantyService(order) && order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO
  }

  canStartStandardService(order: ServiceOrder): boolean {
    return this.isStandardService(order) &&
      this.hasItemInTechnicalStatus(order, [ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION])
  }


  private showMessage(type: string, icon: string, message: string): void {
    this.alertType = type
    this.alertIcon = icon
    this.alertMessage = message
    this.showAlert = true

    setTimeout(() => {
      this.showAlert = false
    }, 4000)
  }

  private markFormGroupAsTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key)
      control?.markAsTouched()
    })
  }

  private loadTechnicians(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.techniciansMap.clear()
        const list = users ?? []
        list.forEach((user: UserApi) => {
          const hasTechRole = hasAnyRole(user.roles, TECHNICIAN_ROLE_NAMES)
          if (hasTechRole) {
            this.techniciansMap.set(Number(user.id), user.name)
          }
        })
      },
      error: () => {
        this.techniciansMap.clear()
      },
    })
  }

  isDiagnosisService(order: ServiceOrder | null): boolean {
    return !!order && order.serviceType === ServiceType.DIAGNOSIS
  }

  isStandardService(order: ServiceOrder | null): boolean {
    return !!order && [ServiceType.STANDARD_SERVICE, ServiceType.ASSEMBLY].includes(order.serviceType)
  }

  private syncCurrentUserContext(): void {
    this.currentUser = this.currentUserService.value ?? this.restoreUserFromStorage()
  }

  private getCurrentUserId(): number | null {
    const id = Number(this.currentUser?.id)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  private restoreUserFromStorage(): User | null {
    const raw = localStorage.getItem("current_user")
    if (!raw) {
      return null
    }
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  }

  getEquipmentTypeLabel(type?: EquipmentType | null, equipmentTypeOther?: string | null): string {
    if (!type) {
      return "Sin tipo"
    }
    if (type === EquipmentType.OTHER) {
      const custom = String(equipmentTypeOther ?? "").trim()
      return custom || (this.equipmentTypeLabels[type] ?? String(type))
    }
    return this.equipmentTypeLabels[type] ?? String(type)
  }

  getDiagnosisStatusLabel(status?: ServiceOrderDiagnosisStatus | null): string {
    if (!status) return "Sin estado"
    switch (status) {
      case ServiceOrderDiagnosisStatus.CURRENT:
        return "Actual"
      case ServiceOrderDiagnosisStatus.SUPERSEDED:
        return "Reemplazado"
      default:
        return status
    }
  }

  getServiceOrderSlaStageLabel(stage?: ServiceOrderSlaStage | null): string {
    if (!stage) return "Sin etapa"
    return this.slaStageLabels[stage] ?? stage
  }

  formatMinutes(value?: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "â€”"
    }
    const totalMinutes = Math.max(0, Math.round(Number(value)))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (!hours) {
      return `${minutes} min`
    }
    if (!minutes) {
      return `${hours} h`
    }
    return `${hours} h ${minutes} min`
  }

  getMetricDisplayValue(metric?: ServiceOrderDerivedMetric | null): string {
    if (!metric?.isComputable) {
      return "No computable"
    }
    return this.formatMinutes(metric.valueMinutes)
  }

  getMetricMissingLabel(metric?: ServiceOrderDerivedMetric | null): string {
    if (metric?.isComputable || !metric?.missingTimestamps?.length) {
      return ""
    }
    return `Falta: ${metric.missingTimestamps.join(", ")}`
  }

  getProductName(product: ServiceOrderAgreementProduct): string {
    if (product?.product?.name) {
      const sku = product.product.sku ? `${product.product.sku} | ` : ""
      return `${sku}${product.product.name}`
    }
    if (product?.productId) return `Producto #${product.productId}`
    return "Producto sin referencia"
  }

  getCatalogProductName(productId: number | null): string {
    const product = this.products.find((entry) => Number(entry.id) === Number(productId))
    if (!product) return "Producto"
    return product.sku ? `${product.sku} | ${product.name}` : product.name
  }

  getServiceName(service: ServiceOrderAgreementServiceItem): string {
    return service?.serviceNameSnapshot || TECHNICAL_SERVICE_OPTION.name
  }

  getTechnicalServiceLabel(): string {
    return TECHNICAL_SERVICE_OPTION.name
  }

  getAgreementTechnicalServiceAmount(): number {
    return this.resolveTechnicalServiceAmount()
  }

  getAgreementEquipmentName(order: ServiceOrder | null): string {
    if (!order) return "Equipo sin referencia"
    const parts = [order.brand, order.model].map((value) => String(value ?? "").trim()).filter(Boolean)
    return parts.length ? parts.join(" ") : this.getEquipmentTypeLabel(order.equipmentType, order.equipmentTypeOther)
  }

  getAgreementEquipmentDescription(order: ServiceOrder | null): string {
    const issue = String(order?.initialIssue ?? "").trim()
    return issue || "Sin detalle adicional del servicio."
  }

  getEquipmentDetailValue(value: string | null | undefined, fallback: string): string {
    const normalizedValue = String(value ?? "").trim()
    return normalizedValue || fallback
  }

  private shouldLoadServiceOrderAgreement(order: ServiceOrder | null): boolean {
    if (!order) return false
    if (order.serviceType === ServiceType.WARRANTY_SERVICE) return false
    return [
      ServiceOrderTechnicalStatus.DIAGNOSTICADA,
      ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL,
      ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      ServiceOrderTechnicalStatus.EN_EJECUCION,
      ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO,
      ServiceOrderTechnicalStatus.RESUELTA,
    ].includes(order.technicalStatus)
  }

  canShowServiceOrderAgreementSection(order: ServiceOrder | null): boolean {
    return !!order && !this.isWarrantyService(order)
  }

  private loadServiceOrderAgreementSummary(order: ServiceOrder | null): void {
    if (!order?.id || !this.canShowServiceOrderAgreementSection(order)) {
      this.agreementSummary = null
      this.agreementHistory = []
      return
    }
    this.isLoadingServiceOrderAgreement = true
    this.agreementSummary = null
    this.agreementHistory = []
    this.agreementService
      .findAll({ page: 1, limit: 20, serviceOrderId: Number(order.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreement = false)))
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          this.agreementHistory = list
          const draft = list.find((agreement) => agreement.status === ServiceOrderAgreementStatus.DRAFT) ?? null
          const confirmed = resolveLatestActiveAgreement(list)
          if (this.canManageAgreement(order) && !draft) {
            this.agreementSummary = null
            return
          }
          this.agreementSummary = draft ?? confirmed ?? list[0] ?? null
        },
        error: () => {
          this.agreementSummary = null
          this.agreementHistory = []
        },
      })
  }

  private hydrateAgreementComposer(agreement: ServiceOrderAgreement): void {
    this.agreementInheritedItems = []
    this.agreementNewItems = []
    this.agreementEditableTechnicalService = null

    if (this.isDerivedAgreementComposer()) {
      const baseAgreement = this.agreementBaseVersion ?? agreement
      this.hydrateDerivedAgreementComposer(baseAgreement, agreement)
      return
    }

    agreement.productItems?.forEach((product) => {
      this.agreementNewItems.push(this.mapAgreementProductToComposer(product, "NEW", true, true))
    })

    const technicalService = agreement.serviceItems?.find((service) => this.isTechnicalService(service)) ?? null
    if (technicalService) {
      this.agreementEditableTechnicalService = this.mapAgreementServiceToComposer(technicalService, "NEW", true, false)
    }

    this.ensureTechnicalServiceItem()
  }

  getPendingItemCancellation(item: ServiceOrderItem) {
    return (item.cancellationRequests ?? []).find((request) =>
      ["PENDING", "AWAITING_CLIENT_ACCEPTANCE"].includes(request.status),
    ) ?? null
  }

  canRequestItemCancellation(item: ServiceOrderItem): boolean {
    return ![
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ].includes(item.operativeStatus) && !this.getPendingItemCancellation(item)
  }

  canRequestAnyItemCancellation(order: ServiceOrder): boolean {
    return (order.items ?? []).some((item) => this.canRequestItemCancellation(item))
  }

  openItemCancellationModal(order: ServiceOrder, event?: Event, item?: ServiceOrderItem): void {
    event?.stopPropagation()
    const items = (order.items ?? []).filter((candidate) => this.canRequestItemCancellation(candidate))
    if (!items.length) {
      this.showMessage("warning", "fas fa-info-circle", "Esta orden no tiene equipos disponibles para cancelar.")
      return
    }
    this.itemCancellationTarget = {
      mode: "REQUEST",
      serviceOrderId: Number(order.id),
      orderCode: order.code,
      items,
      selectedItemId: item?.id ?? items[0].id,
    }
  }

  handleItemCancellationSaved(result: ServiceOrderItemCancellationResult): void {
    this.itemCancellationTarget = null
    this.selectedServiceOrder = result.order
    this.loadTechnicianOrders()
    const pending = ["PENDING", "AWAITING_CLIENT_ACCEPTANCE"].includes(result.request.status)
    this.showMessage(
      "success",
      "fas fa-check-circle",
      pending
        ? "La cancelación quedó pendiente de revisión por supervisión."
        : "El equipo quedó cancelado correctamente.",
    )
  }

  usesItemCommercialComposer(order: ServiceOrder | null = this.selectedServiceOrder): boolean {
    return Boolean(order?.items?.length)
  }

  getAgreementEligibleItems(): ServiceOrderItem[] {
    const terminalStatuses = new Set<ServiceOrderOperativeStatus>([
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ])
    return (this.selectedServiceOrder?.items ?? [])
      .filter((item) => !terminalStatuses.has(item.operativeStatus))
      .sort((left, right) => Number(left.position) - Number(right.position))
  }

  getSelectedAgreementItem(): ServiceOrderItem | null {
    const selectedId = Number(this.selectedAgreementItemId ?? 0)
    return this.getAgreementEligibleItems().find((item) => Number(item.id) === selectedId) ?? null
  }

  getAgreementItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(" ") || this.equipmentTypeLabels[item.equipmentType]
    return `${item.code} · ${equipment}`
  }

  selectAgreementItem(value: unknown, allowLocked = false): void {
    const itemId = this.toNumericId(value)
    const item = this.getAgreementEligibleItems().find((entry) => Number(entry.id) === Number(itemId))
    if (item && this.isAgreementItemLocked(item) && !allowLocked && !this.isViewingAgreementHistory) {
      return
    }
    this.selectedAgreementItemId = item?.id ?? null

    if (!item) {
      this.hydrateItemCommercialVersion(null)
      this.agreementForm.patchValue({ notes: "" })
      return
    }

    const version = this.getSelectedAgreementVersionLink()?.commercialVersion ?? null
    this.agreementForm.patchValue({ notes: version?.notes ?? "" })
    this.hydrateItemCommercialVersion(version)
  }

  getSelectedAgreementVersionLink(): ServiceOrderAgreementItemLink | null {
    return this.getAgreementVersionLinkForItem(this.selectedAgreementItemId)
  }

  getAgreementVersionLinkForItem(value: unknown): ServiceOrderAgreementItemLink | null {
    const itemId = Number(value ?? 0)
    if (!itemId) return null

    const agreements = [
      ...(this.agreementSummary ? [this.agreementSummary] : []),
      ...this.agreementHistory.filter((agreement) => Number(agreement.id) !== Number(this.agreementSummary?.id)),
    ].sort((left, right) => {
      const bySequence = Number(right.sequenceNumber ?? 0) - Number(left.sequenceNumber ?? 0)
      return bySequence || Number(right.id ?? 0) - Number(left.id ?? 0)
    })

    for (const agreement of agreements) {
      const link = agreement.items?.find((entry) => Number(entry.serviceOrderItemId) === itemId)
      if (link) return link
    }
    return null
  }

  isAgreementItemLocked(item: ServiceOrderItem): boolean {
    return this.getAgreementVersionLinkForItem(item.id)?.commercialVersion?.status === "ACCEPTED"
  }

  getAgreementItemVersionLabel(item: ServiceOrderItem): string {
    const version = this.getAgreementVersionLinkForItem(item.id)?.commercialVersion
    if (!version) return "Sin propuesta"
    const latestDecision = this.getAgreementItemLatestDecision(item)
    if (latestDecision?.decision === "CHANGES_REQUESTED") return "Cambios solicitados"
    if (latestDecision?.decision === "ACCEPTED") return "Aceptado"
    if (item.commercialStatus === ServiceOrderCommercialStatus.RECHAZADA) return "Cambios solicitados"
    if (
      version.status === "DRAFT"
      && [
        ServiceOrderCommercialStatus.PROPUESTA_EMITIDA,
        ServiceOrderCommercialStatus.PENDIENTE_RESPUESTA_CLIENTE,
      ].includes(item.commercialStatus)
    ) {
      return "Pendiente de respuesta"
    }
    const labels: Record<string, string> = {
      DRAFT: "Borrador",
      ISSUED: "Pendiente de respuesta",
      ACCEPTED: "Aceptado",
      REPLACED: "Reemplazado",
      VOIDED: "Anulado",
    }
    return labels[version.status] ?? version.status
  }

  getAgreementItemVersionNumber(item: ServiceOrderItem): number | null {
    return this.getAgreementVersionLinkForItem(item.id)?.commercialVersion?.versionNumber ?? null
  }

  getAgreementItemVersionTotal(item: ServiceOrderItem): number {
    return Number(this.getAgreementVersionLinkForItem(item.id)?.commercialVersion?.totalAmount ?? 0)
  }

  getAgreementItemLatestDecision(item: ServiceOrderItem): ServiceOrderClientDecision | null {
    const decisions = this.getAgreementVersionLinkForItem(item.id)?.commercialVersion?.decisions ?? []
    return [...decisions].sort(
      (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
    )[0] ?? null
  }

  getAgreementItemDecisionAuditLabel(item: ServiceOrderItem): string | null {
    const decision = this.getAgreementItemLatestDecision(item)
    if (!decision) return null
    const channels: Record<ServiceOrderClientDecisionChannel, string> = {
      WHATSAPP: "WhatsApp",
      PHONE: "Llamada telefónica",
      IN_PERSON: "Presencial",
      EMAIL: "Correo electrónico",
      OTHER: "Otro canal",
    }
    const recorder = decision.recordedByUser?.name || `usuario #${decision.recordedByUserId}`
    return `${channels[decision.channel]} · registrado por ${recorder}`
  }

  private hydrateItemCommercialVersion(version: ServiceOrderItemCommercialVersion | null): void {
    this.agreementInheritedItems = []
    this.agreementNewItems = []
    this.agreementEditableTechnicalService = null
    this.agreementBaseVersion = null
    this.agreementInheritedNotes = ""
    this.isDerivedAgreementComposerActive = false

    for (const line of version?.lines ?? []) {
      if (line.type === "PRODUCT") {
        this.agreementNewItems.push({
          id: Number(line.id),
          type: "product",
          productId: line.productId,
          productCodeSnapshot: line.catalogCodeSnapshot,
          productNameSnapshot: line.catalogNameSnapshot,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discountPct: Number(line.discounts?.[0]?.percentage ?? 0),
          discountOverrideReason: line.discounts?.[0]?.overrideReason ?? "",
          requiresPurchase: Boolean(line.requiresPurchase),
          notes: line.notes ?? "",
          permissions: this.buildUiMeta("NEW", true, true),
        })
        continue
      }

      if (line.type === "SERVICE" && !this.agreementEditableTechnicalService) {
        this.agreementEditableTechnicalService = {
          id: Number(line.id),
          type: "service",
          serviceId: line.serviceId,
          serviceCodeSnapshot: line.catalogCodeSnapshot,
          serviceNameSnapshot: line.catalogNameSnapshot,
          unitPrice: Number(line.unitPrice),
          discountPct: Number(line.discounts?.[0]?.percentage ?? 0),
          discountOverrideReason: line.discounts?.[0]?.overrideReason ?? "",
          notes: line.notes ?? "",
          permissions: this.buildUiMeta("NEW", true, false),
        }
        continue
      }

      if (line.type === "SERVICE") {
        this.agreementInheritedItems.push({
          id: Number(line.id),
          type: "service",
          serviceId: line.serviceId,
          serviceCodeSnapshot: line.catalogCodeSnapshot,
          serviceNameSnapshot: line.catalogNameSnapshot,
          unitPrice: Number(line.unitPrice),
          discountPct: Number(line.discounts?.[0]?.percentage ?? 0),
          discountOverrideReason: line.discounts?.[0]?.overrideReason ?? "",
          notes: line.notes ?? "",
          permissions: this.buildUiMeta("INHERITED", false, false),
        })
      }
    }

    this.ensureTechnicalServiceItem()
  }

  private submitItemCommercialRevision(order: ServiceOrder): void {
    const selectedItem = this.getSelectedAgreementItem()
    if (!selectedItem) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Selecciona el equipo que deseas cotizar.")
      return
    }

    const notes = String(this.agreementForm.get("notes")?.value ?? "").trim()
    const lines: ServiceOrderCommercialRevisionLineRequest[] = []
    const technicalService = this.getTechnicalServiceItem()
    if (technicalService) {
      const discountPct = Number(technicalService.discountPct ?? 0)
      const discountOverrideReason = String(technicalService.discountOverrideReason ?? "").trim()
      lines.push({
        type: "SERVICE",
        ...(technicalService.serviceId ? { serviceId: Number(technicalService.serviceId) } : {}),
        quantity: 1,
        unitPrice: Number(Number(technicalService.unitPrice).toFixed(2)),
        ...(discountPct > 0 ? { discountPct } : {}),
        ...(discountOverrideReason ? { discountOverrideReason } : {}),
        ...(technicalService.notes ? { notes: technicalService.notes } : {}),
      })
    }

    for (const service of this.agreementInheritedItems.filter((item): item is AgreementServiceComposer => item.type === "service")) {
      const discountPct = Number(service.discountPct ?? 0)
      const discountOverrideReason = String(service.discountOverrideReason ?? "").trim()
      lines.push({
        type: "SERVICE",
        ...(service.serviceId ? { serviceId: Number(service.serviceId) } : {}),
        quantity: 1,
        unitPrice: Number(Number(service.unitPrice).toFixed(2)),
        ...(discountPct > 0 ? { discountPct } : {}),
        ...(discountOverrideReason ? { discountOverrideReason } : {}),
        ...(service.notes ? { notes: service.notes } : {}),
      })
    }

    for (const product of this.getAgreementProductItems()) {
      const productId = this.toNumericId(product.productId)
      if (!productId) continue
      const discountPct = Number(product.discountPct ?? 0)
      const discountOverrideReason = String(product.discountOverrideReason ?? "").trim()
      lines.push({
        type: "PRODUCT",
        productId,
        quantity: Math.max(1, Number(product.quantity) || 1),
        unitPrice: Number(Number(product.unitPrice).toFixed(2)),
        ...(discountPct > 0 ? { discountPct } : {}),
        ...(discountOverrideReason ? { discountOverrideReason } : {}),
        requiresPurchase: Boolean(product.requiresPurchase),
        ...(product.notes ? { notes: product.notes } : {}),
      })
    }

    const currentLink = this.getSelectedAgreementVersionLink()
    const payload = {
      serviceOrderId: Number(order.id),
      ...(notes ? { notes } : {}),
      items: [{
        serviceOrderItemId: Number(selectedItem.id),
        ...(currentLink?.commercialVersionId ? { baseVersionId: Number(currentLink.commercialVersionId) } : {}),
        ...(notes ? { notes } : {}),
        lines,
      }],
    }

    this.isSavingAgreement = true
    this.agreementService.createRevision(payload)
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage(
            "success",
            "fas fa-check-circle",
            "Revisión comercial guardada. Falta registrar la decisión del cliente para cada equipo.",
          )
          this.closeAgreementModal()
          this.loadTechnicianOrders()
        },
        error: (error) => {
          const backendMessage = error?.error?.message
          const message = Array.isArray(backendMessage)
            ? backendMessage.join(" ")
            : backendMessage || "No pudimos guardar la revisión comercial."
          this.showMessage("danger", "fas fa-times-circle", message)
        },
      })
  }

  private resolveLatestAgreement(agreements: ServiceOrderAgreement[]): ServiceOrderAgreement | null {
    return [...agreements].sort((left, right) => {
      const bySequence = Number(right.sequenceNumber ?? 0) - Number(left.sequenceNumber ?? 0)
      return bySequence || Number(right.id ?? 0) - Number(left.id ?? 0)
    })[0] ?? null
  }

  private hydrateDerivedAgreementComposer(baseAgreement: ServiceOrderAgreement, draftAgreement: ServiceOrderAgreement): void {
    baseAgreement.productItems?.forEach((product) => {
      this.agreementInheritedItems.push(this.mapAgreementProductToComposer(product, "INHERITED", false, false))
    })

    const baseTechnicalService = baseAgreement.serviceItems?.find((service) => this.isTechnicalService(service)) ?? null
    const draftTechnicalService = draftAgreement.serviceItems?.find((service) => this.isTechnicalService(service)) ?? null

    if (baseTechnicalService || draftTechnicalService) {
      const technicalServiceSource = draftTechnicalService ?? baseTechnicalService
      if (technicalServiceSource) {
        this.agreementEditableTechnicalService = this.mapAgreementServiceToComposer(
          technicalServiceSource,
          "INHERITED",
          true,
          false,
          draftTechnicalService?.unitPrice ?? baseTechnicalService?.unitPrice ?? TECHNICAL_SERVICE_OPTION.price,
        )
      }
    }

    if (Number(draftAgreement.id) !== Number(baseAgreement.id)) {
      draftAgreement.productItems?.forEach((product) => {
        const provenance = product.provenance === "INHERITED" ? "INHERITED" : "NEW"
        const canEdit = provenance === "NEW"
        const canDelete = provenance === "NEW"
        if (provenance === "INHERITED") {
          return
        }

        this.agreementNewItems.push(this.mapAgreementProductToComposer(product, provenance, canEdit, canDelete))
      })
    }

    const inheritedNonTechnicalServices = (baseAgreement.serviceItems ?? []).filter((service) => !this.isTechnicalService(service))
    inheritedNonTechnicalServices.forEach((service) => {
      this.agreementInheritedItems.push(this.mapAgreementServiceToComposer(service, "INHERITED", false, false))
    })

    this.ensureTechnicalServiceItem()
  }

  getAgreementStatusLabel(status?: ServiceOrderAgreementStatus | null): string {
    if (!status) return "Sin estado"
    switch (status) {
      case ServiceOrderAgreementStatus.DRAFT:
        return "Borrador"
      case ServiceOrderAgreementStatus.CONFIRMED:
        return "Confirmado"
      case ServiceOrderAgreementStatus.SUPERSEDED:
        return "Reemplazado"
      case ServiceOrderAgreementStatus.VOIDED:
        return "Anulado"
      default:
        return status
    }
  }

  private toNumericId(value: unknown): number | null {
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }

  productSearchFn = (term: string, item: Product): boolean => {
    const query = term.toLowerCase().trim()
    return !query || `${item?.sku ?? ""} ${item?.name ?? ""}`.toLowerCase().includes(query)
  }

  private resolveTechnicalServiceAmount(): number {
    return Number(this.getTechnicalServiceItem()?.unitPrice ?? 0)
  }

  getTechnicalServiceItem(): AgreementServiceComposer | null {
    return this.agreementEditableTechnicalService
  }

  getAgreementProductItems(): AgreementProductComposer[] {
    return this.agreementNewItems
  }

  getAgreementInheritedItems(): AgreementComposerItem[] {
    return this.agreementInheritedItems
  }

  getAgreementComposerItems(): AgreementComposerItem[] {
    return [
      ...this.agreementInheritedItems,
      ...(this.agreementEditableTechnicalService ? [this.agreementEditableTechnicalService] : []),
      ...this.agreementNewItems,
    ]
  }

  canRemoveAgreementItemById(itemId: number): boolean {
    return this.agreementNewItems.find((entry) => entry.id === itemId)?.permissions.canDelete ?? false
  }

  isTechnicalServiceAmountValid(): boolean {
    return this.resolveTechnicalServiceAmount() >= TECHNICAL_SERVICE_OPTION.price
  }

  isDerivedAgreementComposer(): boolean {
    return this.isDerivedAgreementComposerActive
  }

  hasAgreementComposerItems(): boolean {
    return this.getAgreementComposerItems().length > 0
  }

  canEditAgreementItem(item: AgreementComposerItem): boolean {
    return item.permissions.canEdit
  }

  getAgreementItemDisplayName(item: AgreementComposerItem): string {
    if (item.type === "product") {
      if (item.permissions.provenance === "NEW") {
        return item.productNameSnapshot || this.getCatalogProductName(item.productId)
      }
      const code = item.productCodeSnapshot ? `${item.productCodeSnapshot} · ` : ""
      return `${code}${item.productNameSnapshot || this.getCatalogProductName(item.productId)}`
    }

    const code = item.serviceCodeSnapshot ? `${item.serviceCodeSnapshot} · ` : ""
    return `${code}${item.serviceNameSnapshot || TECHNICAL_SERVICE_OPTION.name}`
  }

  getAgreementItemProvenanceLabel(item: AgreementComposerItem): string {
    if (item.permissions.provenance === "NEW") return "Nuevo agregado"
    return item.permissions.canEdit ? "Heredado · solo monto editable" : "Heredado bloqueado"
  }

  private ensureTechnicalServiceItem(): void {
    const current = this.getTechnicalServiceItem()
    if (current) {
      current.serviceId = TECHNICAL_SERVICE_OPTION.id
      current.serviceCodeSnapshot = current.serviceCodeSnapshot || TECHNICAL_SERVICE_OPTION.code
      current.serviceNameSnapshot = current.serviceNameSnapshot || TECHNICAL_SERVICE_OPTION.name
      if (!Number.isFinite(Number(current.unitPrice)) || Number(current.unitPrice) <= 0) {
        current.unitPrice = TECHNICAL_SERVICE_OPTION.price
      }
      return
    }

    this.agreementEditableTechnicalService = {
      id: Date.now() + Math.random(),
      type: "service",
      serviceId: TECHNICAL_SERVICE_OPTION.id,
      serviceCodeSnapshot: TECHNICAL_SERVICE_OPTION.code,
      serviceNameSnapshot: TECHNICAL_SERVICE_OPTION.name,
      unitPrice: TECHNICAL_SERVICE_OPTION.price,
      discountPct: 0,
      discountOverrideReason: "",
      notes: "",
      permissions: this.buildUiMeta(this.isDerivedAgreementComposer() ? "INHERITED" : "NEW", true, false),
    }
  }

  private mapAgreementProductToComposer(
    product: ServiceOrderAgreementProduct,
    provenance: AgreementLineProvenance,
    canEdit: boolean,
    canDelete: boolean,
  ): AgreementProductComposer {
    return {
      id: Date.now() + Math.random(),
      type: "product",
      productId: product.productId,
      productCodeSnapshot: product.productCodeSnapshot ?? null,
      productNameSnapshot: product.productNameSnapshot ?? this.getProductName(product),
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      discountPct: 0,
      discountOverrideReason: "",
      requiresPurchase: product.requiresPurchase,
      notes: product.notes || "",
      permissions: this.buildUiMeta(provenance, product.canEdit ?? canEdit, product.canDelete ?? canDelete, product.derivedFromItemId ?? null),
    }
  }

  private mapAgreementServiceToComposer(
    service: ServiceOrderAgreementServiceItem,
    provenance: AgreementLineProvenance,
    canEdit: boolean,
    canDelete: boolean,
    unitPriceOverride?: number,
  ): AgreementServiceComposer {
    return {
      id: Date.now() + Math.random(),
      type: "service",
      serviceId: service.serviceId,
      serviceCodeSnapshot: service.serviceCodeSnapshot ?? TECHNICAL_SERVICE_OPTION.code,
      serviceNameSnapshot: service.serviceNameSnapshot || this.getServiceName(service),
      unitPrice: Number(unitPriceOverride ?? service.unitPrice ?? TECHNICAL_SERVICE_OPTION.price),
      discountPct: 0,
      discountOverrideReason: "",
      notes: service.notes || "",
      permissions: this.buildUiMeta(provenance, service.canEdit ?? canEdit, service.canDelete ?? canDelete, service.derivedFromItemId ?? null),
    }
  }

  private buildUiMeta(
    provenance: AgreementLineProvenance,
    canEdit: boolean,
    canDelete: boolean,
    derivedFromItemId: number | null = null,
  ): AgreementLineUiMeta {
    return {
      provenance,
      canEdit,
      canDelete,
      derivedFromItemId,
    }
  }

  private isTechnicalService(service: Pick<ServiceOrderAgreementServiceItem, "serviceId" | "serviceCodeSnapshot" | "serviceNameSnapshot"> | null): boolean {
    if (!service) return false
    const name = String(service.serviceNameSnapshot ?? "").toLowerCase()
    const code = String(service.serviceCodeSnapshot ?? "").toUpperCase()
    return Number(service.serviceId) === TECHNICAL_SERVICE_OPTION.id || code === TECHNICAL_SERVICE_OPTION.code || name.includes("servicio técnico") || name.includes("servicio tecnico")
  }

  private resetAgreementComposerState(): void {
    this.agreementSummary = null
    this.selectedAgreementItemId = null
    this.agreementBaseVersion = null
    this.agreementInheritedItems = []
    this.agreementEditableTechnicalService = null
    this.agreementNewItems = []
    this.agreementInheritedNotes = ""
    this.isDerivedAgreementComposerActive = false
  }

  private resolveAgreementModalContext(order: ServiceOrder, agreements: ServiceOrderAgreement[]): AgreementModalContext {
    const draft = [...agreements]
      .filter((entry) => entry.status === ServiceOrderAgreementStatus.DRAFT)
      .sort((left, right) => Number(right.sequenceNumber ?? 0) - Number(left.sequenceNumber ?? 0))[0] ?? null
    const activeAgreement = resolveLatestActiveAgreement(agreements)
    const derivedWithoutDraft = !draft && shouldOpenDerivedAgreementComposer(order, this.diagnosticHistory, agreements)

    if (draft) {
      const baseAgreement = this.resolveAgreementBaseById(draft.derivedFromAgreementId ?? null, agreements) ?? activeAgreement
      const derivedMode = this.isDerivedAgreement(draft)
      return {
        summary: draft,
        baseAgreement: derivedMode ? baseAgreement : null,
        sourceAgreement: draft,
        derivedMode,
        inheritedNotes: derivedMode ? baseAgreement?.notes ?? "" : "",
        formNotes: draft.notes ?? "",
        currency: draft.currency ?? baseAgreement?.currency ?? "PEN",
      }
    }

    if (derivedWithoutDraft && activeAgreement) {
      return {
        summary: null,
        baseAgreement: activeAgreement,
        sourceAgreement: activeAgreement,
        derivedMode: true,
        inheritedNotes: activeAgreement.notes ?? "",
        formNotes: "",
        currency: activeAgreement.currency ?? "PEN",
      }
    }

    const allowNewAgreement = this.canManageAgreement(order)
    const summary = !allowNewAgreement ? activeAgreement ?? agreements[0] ?? null : null
    return {
      summary,
      baseAgreement: null,
      sourceAgreement: summary,
      derivedMode: false,
      inheritedNotes: "",
      formNotes: summary?.notes ?? "",
      currency: summary?.currency ?? "PEN",
    }
  }

  private resolveAgreementBaseById(agreementId: number | null, agreements: ServiceOrderAgreement[]): ServiceOrderAgreement | null {
    if (!agreementId) return null
    return agreements.find((entry) => Number(entry.id) === Number(agreementId)) ?? null
  }

  private isDerivedAgreement(agreement: ServiceOrderAgreement | null): boolean {
    if (!agreement) return false
    if (agreement.derivedFromAgreementId) return true
    const hasInheritedProduct = (agreement.productItems ?? []).some((item) => item.provenance === "INHERITED")
    const hasInheritedService = (agreement.serviceItems ?? []).some((item) => item.provenance === "INHERITED")
    return hasInheritedProduct || hasInheritedService
  }

  getWorkflowLabel(order: ServiceOrder): string {
    switch (order.technicalStatus) {
      case ServiceOrderTechnicalStatus.PENDIENTE_ASIGNACION:
        return "Pendiente de asignación"
      case ServiceOrderTechnicalStatus.ASIGNADA:
        return "Asignado"
      case ServiceOrderTechnicalStatus.EN_DIAGNOSTICO:
        return this.isWarrantyService(order) ? "En revisión de garantía" : "En diagnóstico"
      case ServiceOrderTechnicalStatus.DIAGNOSTICADA:
        return "Diagnosticado"
      case ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL:
        return "En coordinación"
      case ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION:
        return this.isWarrantyService(order) ? "Garantía aceptada" : "Aprobado para servicio"
      case ServiceOrderTechnicalStatus.EN_EJECUCION:
        return "En servicio"
      case ServiceOrderTechnicalStatus.BLOQUEADA:
        return "Bloqueada"
      case ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO:
        return "Esperando repuestos"
      case ServiceOrderTechnicalStatus.RESUELTA:
        return "Servicio finalizado"
      case ServiceOrderTechnicalStatus.SIN_SOLUCION:
        return "Sin solución"
      default:
        return order.technicalStatus
    }
  }



  private startLiveTimer(elapsedMinutes: number): void {
    this.stopLiveTimer()
    this.liveElapsedSeconds = Math.round((elapsedMinutes ?? 0) * 60)
    this.liveTimer = setInterval(() => {
      this.liveElapsedSeconds += 1
    }, 1000)
  }

  private stopLiveTimer(): void {
    if (this.liveTimer !== null) {
      clearInterval(this.liveTimer)
      this.liveTimer = null
    }
    this.liveElapsedSeconds = 0
  }

  formatLiveTime(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const mm = String(m).padStart(2, '0')
    const ss = String(sec).padStart(2, '0')
    return h > 0 ? `${h}h ${mm}m ${ss}s` : `${mm}m ${ss}s`
  }

}



