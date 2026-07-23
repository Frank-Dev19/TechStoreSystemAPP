import { Component, OnDestroy, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Router } from "@angular/router"
import { forkJoin, of } from "rxjs"
import { catchError, finalize, map, switchMap } from "rxjs/operators"
import {
  EquipmentType,
  ServiceOrderDerivedMetric,
  ServiceOrder,
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
  ServiceOrderAgreementProduct,
  ServiceOrderAgreementService as ServiceOrderAgreementServiceItem,
  ServiceOrderAgreementStatus,
} from "../../models/service-orders/service-agreement"
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

interface AgreementProductComposer {
  id: number
  type: "product"
  productId: number | null
  productCodeSnapshot: string | null
  productNameSnapshot: string
  quantity: number
  unitPrice: number
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

  showDiagnosisModal = false
  diagnosisForm: FormGroup
  showAgreementModal = false
  agreementForm: FormGroup
  diagnosticHistory: ServiceOrderDiagnosis[] = []
  agreementSummary: ServiceOrderAgreement | null = null
  agreementHistory: ServiceOrderAgreement[] = []
  isLoadingServiceOrderAgreement = false
  isSavingAgreement = false
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
    this.transitionWorkflow(
      order,
      ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      this.isWarrantyService(order) ? "Revision de garantia iniciada correctamente." : "Diagnostico iniciado correctamente.",
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
    this.showDiagnosisModal = true
    this.diagnosisForm.reset({
      summary: "",
      details: "",
      outcome: presetOutcome,
    })
  }

  closeDiagnosisModal(): void {
    this.showDiagnosisModal = false
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
    this.resetAgreementComposerState()
    this.agreementSummary = agreement
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
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.resetAgreementComposerState()
    this.productPriceLoading = {}
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

  calculateAgreementItemSubtotal(item: AgreementComposerItem): number {
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    return Number(item.unitPrice ?? TECHNICAL_SERVICE_OPTION.price)
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
    if (this.diagnosisForm.invalid || !this.selectedServiceOrder) {
      this.markFormGroupAsTouched(this.diagnosisForm)
      return
    }

    const wasInService = this.selectedServiceOrder.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION
    const orderId = Number(this.selectedServiceOrder.id)
    const selectedOutcome =
      (this.diagnosisForm.get("outcome")?.value as ServiceOrderDiagnosisOutcome | null) ??
      ServiceOrderDiagnosisOutcome.REPAIRABLE
    const chargesDiagnosisFee = selectedOutcome === ServiceOrderDiagnosisOutcome.IRREPARABLE
    const waivesCharge = selectedOutcome === ServiceOrderDiagnosisOutcome.NO_FAULT_FOUND

    const payload: ServiceOrderDiagnosisSaveRequest = {
      serviceOrderId: orderId,
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
    if (order.technicalStatus !== ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "La orden debe estar aprobada para iniciar el servicio.",
      )
      return
    }
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.EN_EJECUCION, "Servicio iniciado.")
  }

  markRepaired(order: ServiceOrder): void {
    if (order.technicalStatus !== ServiceOrderTechnicalStatus.EN_EJECUCION) {
      return
    }
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.RESUELTA, "Equipo marcado como reparado.")
  }

  canFinishRepair(order?: ServiceOrder | null): boolean {
    if (!order) return false
    return order.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION
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
    return order.technicalStatus === ServiceOrderTechnicalStatus.ASIGNADA &&
      [ServiceType.DIAGNOSIS, ServiceType.WARRANTY_SERVICE].includes(order.serviceType)
  }

  canOpenRediagnosis(order: ServiceOrder | null): boolean {
    if (!order) return false
    return order.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION && order.serviceType === ServiceType.DIAGNOSIS
  }

  canManageAgreement(order: ServiceOrder | null): boolean {
    if (!order || this.isWarrantyService(order)) return false
    return EDITABLE_AGREEMENT_STATUSES.includes(order.technicalStatus)
  }

  isAgreementEditable(): boolean {
    return !this.agreementSummary || this.agreementSummary.status === ServiceOrderAgreementStatus.DRAFT
  }

  getAgreementModalMessage(): string | null {
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
    return this.selectedServiceOrder?.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION
  }

  canStartRepairDirectly(order: ServiceOrder): boolean {
    return (
      order.technicalStatus === ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION &&
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
    return this.isStandardService(order) && order.technicalStatus === ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION
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



