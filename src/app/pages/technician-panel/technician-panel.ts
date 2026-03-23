import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { forkJoin, of } from "rxjs"
import { finalize, map, switchMap } from "rxjs/operators"
import {
  EquipmentType,
  ServiceOrder,
  ServiceOrderPaymentStatus,
  ServiceOrderStatus,
  ServiceOrderWorkflowStatus,
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
  ServiceOrderAgreement,
  ServiceOrderAgreementProduct,
  ServiceOrderAgreementService as ServiceOrderAgreementServiceItem,
  ServiceOrderAgreementStatus,
} from "../../models/service-orders/service-agreement"
import { ServiceOrderAgreementService } from "../../services/service-orders/service-agreement.service"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { ServiceService } from "../../services/service-catalog/service.service"
import { Service } from "../../models/service-catalog/service"
import { PricingQueryApiService } from "../../services/pricing/pricing-query-api.service"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { CurrentUserService } from "../../services/current-user.service"
import { User } from "../../models/user/user"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"

type InboxAuthor = "TECHNICIAN" | "CLIENT" | "SYSTEM"

interface ServiceOrderInboxMessage {
  id: number
  author: InboxAuthor
  text: string
  createdAt: Date
}

interface ServiceOrderInboxThread {
  serviceOrderId: number
  serviceOrderCode: string
  equipmentLabel: string
  clientAlias: string
  assignedTechnicianAlias: string
  unreadForSupervisor: number
  messages: ServiceOrderInboxMessage[]
}

interface AgreementProductComposer {
  id: number
  type: "product"
  productId: number | null
  quantity: number
  unitPrice: number
  requiresPurchase: boolean
  notes: string
}

interface AgreementServiceComposer {
  id: number
  type: "service"
  serviceId: number | null
  notes: string
}

type AgreementComposerItem = AgreementProductComposer | AgreementServiceComposer

@Component({
  selector: "app-technician-panel",
  standalone: false,
  templateUrl: "./technician-panel.html",
  styleUrls: ["./technician-panel.scss"],
})
export class TechnicianPanel implements OnInit {
  activeTab: "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all" = "todo"
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
  agreementItems: AgreementComposerItem[] = []
  products: Product[] = []
  services: Service[] = []
  productPriceLoading: Record<number, boolean> = {}

  orderInDiagnosis = false
  currentOrderInDiagnosisId: number | null = null

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingOrders = false
  isSavingDiagnosis = false
  showInboxModal = false
  inboxDraftMessage = ""
  inboxActiveThread: ServiceOrderInboxThread | null = null
  inboxThreads: ServiceOrderInboxThread[] = []

  private currentUser: User | null = null
  private techniciansMap = new Map<number, string>()

  private readonly equipmentTypeLabels: Record<EquipmentType, string> = {
    [EquipmentType.LAPTOP]: "Laptop",
    [EquipmentType.DESKTOP_PC]: "PC de escritorio",
    [EquipmentType.ALL_IN_ONE]: "All in One",
    [EquipmentType.PRINTER]: "Impresora",
    [EquipmentType.SCANNER]: "Escaner",
    [EquipmentType.PROJECTOR]: "Proyector",
    [EquipmentType.MONITOR]: "Monitor",
    [EquipmentType.SERVER]: "Servidor",
    [EquipmentType.NETWORK_DEVICE]: "Equipo de red",
    [EquipmentType.OTHER]: "Otro",
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly productsService: ProductsService,
    private readonly serviceCatalog: ServiceService,
    private readonly pricingQuery: PricingQueryApiService,
    private readonly usersApi: UsersApiService,
    private readonly currentUserService: CurrentUserService,
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

  setActiveTab(tab: "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all"): void {
    this.activeTab = tab
    this.currentPage = 1
  }

  private createDiagnosisForm(): FormGroup {
    return this.formBuilder.group({
      summary: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      details: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
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
    forkJoin({
      products: this.productsService.list(),
      services: this.serviceCatalog.findAll({ page: 1, limit: 100 }),
    }).subscribe({
      next: ({ products, services }) => {
        this.products = products ?? []
        this.services = services.data ?? []
      },
      error: () => {
        this.products = []
        this.services = []
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
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar tus ordenes asignadas."),
      })
  }

  private hydrateLists(orders: ServiceOrder[]): void {
    this.allOrders = [...orders]

    this.todoOrders = orders.filter((order) =>
      [
        ServiceOrderWorkflowStatus.ASSIGNED,
        ServiceOrderWorkflowStatus.APPROVED_FOR_WORK,
      ].includes(order.workflowStatus),
    )

    this.diagnosisOrders = orders.filter((order) => order.workflowStatus === ServiceOrderWorkflowStatus.UNDER_REVIEW)

    this.pendingApprovalOrders = orders.filter((order) =>
      [
        ServiceOrderWorkflowStatus.DIAGNOSIS_READY,
        ServiceOrderWorkflowStatus.UNDER_COORDINATION,
      ].includes(order.workflowStatus),
    )

    this.repairOrders = orders.filter((order) =>
      [ServiceOrderWorkflowStatus.IN_SERVICE, ServiceOrderWorkflowStatus.WAITING_PARTS].includes(order.workflowStatus),
    )

    this.repairedOrders = orders.filter((order) => order.workflowStatus === ServiceOrderWorkflowStatus.SERVICE_DONE)

    const activeDiagnosis = this.diagnosisOrders.find((order) => order.workflowStatus === ServiceOrderWorkflowStatus.UNDER_REVIEW)
    this.orderInDiagnosis = !!activeDiagnosis
    this.currentOrderInDiagnosisId = activeDiagnosis?.id ? Number(activeDiagnosis.id) : null

    if (this.selectedServiceOrder) {
      const updated = orders.find((entry) => Number(entry.id) === Number(this.selectedServiceOrder?.id))
      this.selectedServiceOrder = updated ?? null
      if (this.selectedServiceOrder) {
        this.loadServiceOrderDiagnosisHistory(Number(this.selectedServiceOrder.id))
        this.loadServiceOrderAgreementSummary(this.selectedServiceOrder)
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
    this.loadServiceOrderDiagnosisHistory(Number(order.id))
    this.loadServiceOrderAgreementSummary(order)
  }

  clearSelectedServiceOrder(): void {
    this.selectedServiceOrder = null
    this.diagnosticHistory = []
    this.agreementSummary = null
    this.agreementHistory = []
  }

  canOpenClientInbox(order: ServiceOrder | null): boolean {
    if (!order) return false
    return ![
      ServiceOrderStatus.DELIVERED,
      ServiceOrderStatus.CANCELLED,
      ServiceOrderStatus.CLOSED_NO_SOLUTION,
    ].includes(order.status)
  }

  openWhatsAppInbox(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenClientInbox(order)) return

    const existing = this.inboxThreads.find((thread) => thread.serviceOrderId === Number(order.id))
    if (existing) {
      existing.unreadForSupervisor = 0
      this.inboxActiveThread = existing
      this.showInboxModal = true
      return
    }

    const thread = this.buildInboxThread(order)
    this.inboxThreads = [thread, ...this.inboxThreads]
    this.inboxActiveThread = thread
    this.showInboxModal = true
  }

  closeInboxModal(): void {
    this.showInboxModal = false
    this.inboxDraftMessage = ""
    this.inboxActiveThread = null
  }

  sendInboxMessage(): void {
    if (!this.inboxActiveThread) return
    const text = this.inboxDraftMessage.trim()
    if (!text) return

    this.inboxActiveThread.messages.push({
      id: Date.now(),
      author: "TECHNICIAN",
      text,
      createdAt: new Date(),
    })
    this.inboxDraftMessage = ""

    this.inboxActiveThread.messages.push({
      id: Date.now() + 1,
      author: "CLIENT",
      text: "Recibido. Gracias por la actualizacion tecnica.",
      createdAt: new Date(),
    })
    this.inboxActiveThread.unreadForSupervisor += 1
  }

  getInboxAuthorLabel(author: InboxAuthor): string {
    switch (author) {
      case "TECHNICIAN":
        return "Tecnico"
      case "CLIENT":
        return this.inboxActiveThread?.clientAlias ?? "Cliente anonimo"
      default:
        return "Sistema"
    }
  }

  startDiagnosis(order: ServiceOrder): void {
    if (this.orderInDiagnosis && this.currentOrderInDiagnosisId !== Number(order.id)) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa la revision activa antes de iniciar otra.")
      return
    }
    this.transitionWorkflow(
      order,
      ServiceOrderWorkflowStatus.UNDER_REVIEW,
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
    this.agreementSummary = null
    this.agreementItems = []
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.isLoadingServiceOrderAgreement = true

    this.agreementService
      .findAll({ page: 1, limit: 5, serviceOrderId: Number(order.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreement = false)))
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          this.agreementHistory = list
          const draft = list.find((entry) => entry.status === ServiceOrderAgreementStatus.DRAFT)
          const confirmed = list.find((entry) => entry.status === ServiceOrderAgreementStatus.CONFIRMED)
          const allowNewAgreement = this.canManageAgreement(order)
          this.agreementSummary = draft ?? (!allowNewAgreement ? confirmed ?? null : null)
          this.agreementForm.patchValue({
            notes: this.agreementSummary?.notes ?? "",
            currency: this.agreementSummary?.currency ?? "PEN",
          })
          if (this.agreementSummary) {
            this.hydrateAgreementComposer(this.agreementSummary)
          }
        },
        error: () => {
          this.agreementSummary = null
          this.agreementHistory = []
        },
      })
  }

  openAgreementHistoryModal(agreement: ServiceOrderAgreement, event?: Event): void {
    event?.stopPropagation()
    if (!this.selectedServiceOrder) return

    this.showAgreementModal = true
    this.agreementSummary = agreement
    this.agreementForm.reset({
      notes: agreement.notes ?? "",
      currency: agreement.currency ?? "PEN",
    })
    this.hydrateAgreementComposer(agreement)
  }

  closeAgreementModal(): void {
    this.showAgreementModal = false
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.agreementItems = []
    this.productPriceLoading = {}
  }

  addAgreementProduct(): void {
    if (!this.isAgreementEditable()) return
    this.agreementItems.push({
      id: Date.now() + Math.random(),
      type: "product",
      productId: null,
      quantity: 1,
      unitPrice: 0,
      requiresPurchase: true,
      notes: "",
    })
  }

  addAgreementService(): void {
    if (!this.isAgreementEditable()) return
    this.agreementItems.push({
      id: Date.now() + Math.random(),
      type: "service",
      serviceId: null,
      notes: "",
    })
  }

  removeAgreementItem(index: number): void {
    if (!this.isAgreementEditable()) return
    this.agreementItems.splice(index, 1)
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
      .getProductPrice(item.productId, Math.max(1, Number(item.quantity) || 1))
      .pipe(finalize(() => (this.productPriceLoading[item.id] = false)))
      .subscribe({
        next: (res) => {
          item.unitPrice = res.finalUnitPrice ?? res.baseUnitPrice ?? 0
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
    const service = this.services.find((entry) => Number(entry.id) === Number(item.serviceId))
    return Number(service?.price ?? 0)
  }

  calculateAgreementTotal(): number {
    return this.agreementItems.reduce((total, item) => total + this.calculateAgreementItemSubtotal(item), 0)
  }

  submitAgreement(confirmImmediately = true): void {
    const order = this.selectedServiceOrder
    if (!order?.id) return
    if (!this.isAgreementEditable()) {
      this.showMessage("warning", "fas fa-info-circle", "El acuerdo ya esta confirmado y no puede modificarse.")
      return
    }
    if (!this.agreementItems.length) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Agrega al menos un producto o servicio al acuerdo.")
      return
    }

    const currentDiagnosisId = this.toNumericId(
      this.diagnosticHistory.find((entry) => entry.status === ServiceOrderDiagnosisStatus.CURRENT)?.id,
    )

    const payload = {
      serviceOrderId: Number(order.id),
      ...(currentDiagnosisId ? { diagnosisId: currentDiagnosisId } : {}),
      notes: this.agreementForm.get("notes")?.value || undefined,
      products: this.agreementItems.flatMap((entry) => {
        if (entry.type !== "product") return []
        const productId = this.toNumericId(entry.productId)
        if (!productId) return []
        return [{
          productId,
          quantity: Math.max(1, Number(entry.quantity) || 1),
          unitPrice: Number(entry.unitPrice || 0),
          requiresPurchase: entry.requiresPurchase,
          notes: entry.notes || undefined,
        }]
      }),
      services: this.agreementItems.flatMap((entry) => {
        if (entry.type !== "service") return []
        const serviceId = this.toNumericId(entry.serviceId)
        if (!serviceId) return []
        return [{ serviceId, notes: entry.notes || undefined }]
      }),
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
      this.showMessage("warning", "fas fa-info-circle", "El acuerdo ya esta confirmado.")
      return
    }
    this.isSavingAgreement = true
    this.agreementService
      .confirm(agreementId)
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Acuerdo confirmado. Ya puedes continuar con el servicio.")
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

    const wasInService = this.selectedServiceOrder.workflowStatus === ServiceOrderWorkflowStatus.IN_SERVICE
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
            return this.serviceOrderService
              .update(orderId, { paymentStatus: ServiceOrderPaymentStatus.WAIVED })
              .pipe(
                switchMap(() =>
                  this.serviceOrderService.changeWorkflowStatus(orderId, ServiceOrderWorkflowStatus.READY_FOR_PICKUP),
                ),
                map(() => "WAIVED"),
              )
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
              ? "Diagnostico registrado. La orden quedo lista para entrega con cobro de diagnostico."
              : resolution === "WAIVED"
                ? "Diagnostico registrado. La orden quedo lista para entrega sin cobro."
                : wasInService
                  ? "Nuevo diagnostico registrado. La orden volvio a coordinacion para generar un nuevo acuerdo."
                  : "Diagnostico registrado correctamente.",
          )
          this.closeDiagnosisModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar el diagnostico."),
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

  canSubmitDiagnosisAsIrreparable(): boolean {
    return this.diagnosisForm.get("outcome")?.value === ServiceOrderDiagnosisOutcome.IRREPARABLE
  }

  startRepair(order: ServiceOrder): void {
    if (order.workflowStatus !== ServiceOrderWorkflowStatus.APPROVED_FOR_WORK) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "La orden debe estar aprobada para iniciar el servicio.",
      )
      return
    }
    this.transitionWorkflow(order, ServiceOrderWorkflowStatus.IN_SERVICE, "Servicio iniciado.")
  }

  markRepaired(order: ServiceOrder): void {
    if (order.workflowStatus !== ServiceOrderWorkflowStatus.IN_SERVICE) {
      return
    }
    this.transitionWorkflow(order, ServiceOrderWorkflowStatus.SERVICE_DONE, "Equipo marcado como reparado.")
  }

  canFinishRepair(order?: ServiceOrder | null): boolean {
    if (!order) return false
    return order.workflowStatus === ServiceOrderWorkflowStatus.IN_SERVICE
  }

  acceptWarrantyReview(order: ServiceOrder): void {
    this.transitionWorkflow(order, ServiceOrderWorkflowStatus.APPROVED_FOR_WORK, "Garantia aceptada correctamente.")
  }

  rejectWarrantyReview(order: ServiceOrder): void {
    this.transitionWorkflow(order, ServiceOrderWorkflowStatus.CANCELLED, "Garantia rechazada correctamente.")
  }

  private transitionWorkflow(order: ServiceOrder, status: ServiceOrderWorkflowStatus, successMessage: string): void {
    const orderId = Number(order.id)
    if (!orderId) {
      this.showMessage("danger", "fas fa-times-circle", "ID de orden invalido.")
      return
    }

    this.serviceOrderService.changeWorkflowStatus(orderId, status).subscribe({
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
      error: () => this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el historial de diagnosticos."),
    })
  }

  canStartDiagnosis(order: ServiceOrder): boolean {
    return order.workflowStatus === ServiceOrderWorkflowStatus.ASSIGNED &&
      [ServiceType.DIAGNOSIS, ServiceType.WARRANTY_SERVICE].includes(order.serviceType)
  }

  canOpenRediagnosis(order: ServiceOrder | null): boolean {
    if (!order) return false
    return order.workflowStatus === ServiceOrderWorkflowStatus.IN_SERVICE && order.serviceType === ServiceType.DIAGNOSIS
  }

  canManageAgreement(order: ServiceOrder | null): boolean {
    if (!order || this.isWarrantyService(order)) return false
    return [
      ServiceOrderWorkflowStatus.DIAGNOSIS_READY,
      ServiceOrderWorkflowStatus.UNDER_COORDINATION,
    ].includes(order.workflowStatus)
  }

  isAgreementEditable(): boolean {
    return !this.agreementSummary || this.agreementSummary.status === ServiceOrderAgreementStatus.DRAFT
  }

  getAgreementModalMessage(): string | null {
    if (!this.agreementSummary) {
      return null
    }

    switch (this.agreementSummary.status) {
      case ServiceOrderAgreementStatus.DRAFT:
        return 'Este acuerdo esta en borrador. Puedes editarlo o confirmarlo.'
      case ServiceOrderAgreementStatus.CONFIRMED:
        return 'Este acuerdo ya esta confirmado. Solo puedes revisarlo.'
      case ServiceOrderAgreementStatus.SUPERSEDED:
        return 'Este acuerdo fue reemplazado por una version mas reciente. Solo puedes revisarlo.'
      case ServiceOrderAgreementStatus.VOIDED:
        return 'Este acuerdo fue anulado. Solo puedes revisarlo.'
      default:
        return null
    }
  }

  isAdditionalDiagnosisFlow(): boolean {
    return this.selectedServiceOrder?.workflowStatus === ServiceOrderWorkflowStatus.IN_SERVICE
  }

  getDiagnosisOutcomeOptions(): Array<{ value: ServiceOrderDiagnosisOutcome; label: string }> {
    return [
      { value: ServiceOrderDiagnosisOutcome.REPAIRABLE, label: "Reparable" },
      { value: ServiceOrderDiagnosisOutcome.IRREPARABLE, label: "Sin arreglo / irreparable" },
      { value: ServiceOrderDiagnosisOutcome.NO_FAULT_FOUND, label: "No replicable" },
    ]
  }

  canStartRepairDirectly(order: ServiceOrder): boolean {
    return (
      order.workflowStatus === ServiceOrderWorkflowStatus.APPROVED_FOR_WORK &&
      !this.isStandardService(order)
    )
  }

  isWarrantyService(order: ServiceOrder | null): boolean {
    return !!order && order.serviceType === ServiceType.WARRANTY_SERVICE
  }

  canAcceptWarrantyReview(order: ServiceOrder | null): boolean {
    return !!order && this.isWarrantyService(order) && order.workflowStatus === ServiceOrderWorkflowStatus.UNDER_REVIEW
  }

  canRejectWarrantyReview(order: ServiceOrder | null): boolean {
    return !!order && this.isWarrantyService(order) && order.workflowStatus === ServiceOrderWorkflowStatus.UNDER_REVIEW
  }

  canStartStandardService(order: ServiceOrder): boolean {
    return this.isStandardService(order) && order.workflowStatus === ServiceOrderWorkflowStatus.APPROVED_FOR_WORK
  }

  private buildInboxThread(order: ServiceOrder): ServiceOrderInboxThread {
    const serviceOrderCode = order.code ?? `SO-${order.id}`
    const equipmentLabel = this.getEquipmentTypeLabel(order.equipmentType, order.equipmentTypeOther)
    const shortRef = String(serviceOrderCode).slice(-4)
    const clientAlias = `Cliente-${shortRef || "XXXX"}`
    const techRef = order.assignedToTechnicianId ? String(order.assignedToTechnicianId).padStart(2, "0") : "00"
    const assignedTechnicianAlias = `Tecnico-${techRef}`

    return {
      serviceOrderId: Number(order.id),
      serviceOrderCode,
      equipmentLabel,
      clientAlias,
      assignedTechnicianAlias,
      unreadForSupervisor: 0,
      messages: [
        {
          id: Date.now(),
          author: "SYSTEM",
          text: "Canal supervisado: no se muestran nombre ni datos de contacto del cliente.",
          createdAt: new Date(),
        },
        {
          id: Date.now() + 1,
          author: "CLIENT",
          text: "Buenos dias, podrian indicarme el avance del equipo?",
          createdAt: new Date(),
        },
      ],
    }
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
    if (service?.service?.name) {
      const code = service.service.code ? `${service.service.code} | ` : ""
      return `${code}${service.service.name}`
    }
    if (service?.serviceId) return `Servicio #${service.serviceId}`
    return "Servicio sin referencia"
  }

  getCatalogServiceName(serviceId: number | null): string {
    const service = this.services.find((entry) => Number(entry.id) === Number(serviceId))
    if (!service) return "Servicio"
    return service.code ? `${service.code} | ${service.name}` : service.name
  }

  private shouldLoadServiceOrderAgreement(order: ServiceOrder | null): boolean {
    if (!order) return false
    if (order.serviceType === ServiceType.WARRANTY_SERVICE) return false
    return [
      ServiceOrderWorkflowStatus.DIAGNOSIS_READY,
      ServiceOrderWorkflowStatus.UNDER_COORDINATION,
      ServiceOrderWorkflowStatus.APPROVED_FOR_WORK,
      ServiceOrderWorkflowStatus.IN_SERVICE,
      ServiceOrderWorkflowStatus.WAITING_PARTS,
      ServiceOrderWorkflowStatus.SERVICE_DONE,
    ].includes(order.workflowStatus)
  }

  canShowServiceOrderAgreementSection(order: ServiceOrder | null): boolean {
    return this.shouldLoadServiceOrderAgreement(order)
  }

  private loadServiceOrderAgreementSummary(order: ServiceOrder | null): void {
    if (!order?.id || !this.shouldLoadServiceOrderAgreement(order)) {
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
          const confirmed = list.find((agreement) => agreement.status === ServiceOrderAgreementStatus.CONFIRMED) ?? null
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
    this.agreementItems = []
    agreement.productItems?.forEach((product) => {
      this.agreementItems.push({
        id: Date.now() + Math.random(),
        type: "product",
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        requiresPurchase: product.requiresPurchase,
        notes: product.notes || "",
      })
    })
    agreement.serviceItems?.forEach((service) => {
      this.agreementItems.push({
        id: Date.now() + Math.random(),
        type: "service",
        serviceId: service.serviceId,
        notes: service.notes || "",
      })
    })
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

  serviceSearchFn = (term: string, item: Service): boolean => {
    const query = term.toLowerCase().trim()
    return !query || `${item?.code ?? ""} ${item?.name ?? ""}`.toLowerCase().includes(query)
  }

  getWorkflowLabel(order: ServiceOrder): string {
    switch (order.workflowStatus) {
      case ServiceOrderWorkflowStatus.ASSIGNED:
        return "Asignado"
      case ServiceOrderWorkflowStatus.UNDER_REVIEW:
        return this.isWarrantyService(order) ? "En revision de garantia" : "En diagnostico"
      case ServiceOrderWorkflowStatus.DIAGNOSIS_READY:
        return "Diagnosticado"
      case ServiceOrderWorkflowStatus.UNDER_COORDINATION:
        return "En coordinacion"
      case ServiceOrderWorkflowStatus.APPROVED_FOR_WORK:
        return this.isWarrantyService(order) ? "Garantia aceptada" : "Aprobado para servicio"
      case ServiceOrderWorkflowStatus.IN_SERVICE:
        return "En servicio"
      case ServiceOrderWorkflowStatus.WAITING_PARTS:
        return "Esperando repuestos"
      case ServiceOrderWorkflowStatus.SERVICE_DONE:
        return "Servicio finalizado"
      case ServiceOrderWorkflowStatus.NO_SOLUTION:
        return "Sin solucion"
      case ServiceOrderWorkflowStatus.READY_FOR_PICKUP:
        return "Pendiente de recojo"
      case ServiceOrderWorkflowStatus.CANCELLED:
        return this.isWarrantyService(order) ? "Garantia rechazada" : "Cancelado"
      default:
        return order.workflowStatus
    }
  }
}
