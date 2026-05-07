import { Component, OnInit } from "@angular/core"
import { catchError, finalize, of } from "rxjs"
import { ServiceOrderAgreement, ServiceOrderAgreementStatus } from "../../models/service-orders/service-agreement"
import {
  ServiceOrderAgreementService,
  TechnicianRevenueRanking,
} from "../../services/service-orders/service-agreement.service"
import {
  EquipmentType,
  ServiceOrder,
  ServiceOrderDerivedMetric,
  ServiceOrderOperativeStatus,
  ServiceOrderSlaStage,
  ServiceType,
} from "../../models/service-orders/service-order"
import { ServiceOrderService } from "../../services/service-orders/service-order.service"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import { ServiceOrderDiagnosis } from "../../models/service-orders/service-order-diagnosis"
import {
  ServiceOrderInboxAttachment,
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadSummary,
} from "../../models/service-orders/service-order-inbox"
import { Product } from "../../models/catalog/product"
import { ProductsService } from "../../services/inventory/products.service"
import { ServiceOrderInboxService } from "../../services/service-orders/service-order-inbox.service"

const TECHNICAL_SERVICE_LABEL = "Servicio técnico"

interface InboxDraftAttachment {
  file: File
  previewUrl: string | null
}

@Component({
  selector: "app-supervisor-panel",
  standalone: false,
  templateUrl: "./supervisor-panel.html",
  styleUrls: ["./supervisor-panel.scss"],
})
export class SupervisorPanel implements OnInit {
  activeSection: "ranking" | "inbox" | "orders" = "orders"
  activeTab: "open" | "answered" | "all" = "open"
  currentPage = 1
  itemsPerPage = 6

  openServiceOrderAgreements: ServiceOrderAgreement[] = []
  answeredServiceOrderAgreements: ServiceOrderAgreement[] = []
  allServiceOrderAgreements: ServiceOrderAgreement[] = []
  serviceOrders: ServiceOrder[] = []

  selectedServiceOrderAgreement: ServiceOrderAgreement | null = null
  selectedServiceOrder: ServiceOrder | null = null
  currentDiagnosis: ServiceOrderDiagnosis | null = null
  selectedOrderAgreements: ServiceOrderAgreement[] = []
  selectedInboxThreadByOrder: ServiceOrderInboxThreadSummary | null = null

  orderSearchTerm = ""
  orderOperativeStatusFilter: ServiceOrderOperativeStatus | "ALL" = "ALL"

  products: Product[] = []
  inboxThreads: ServiceOrderInboxThreadSummary[] = []
  selectedInboxThread: ServiceOrderInboxThreadSummary | null = null
  selectedInboxMessages: ServiceOrderInboxMessage[] = []
  supervisorInboxDraft = ""
  supervisorInboxDraftAttachments: InboxDraftAttachment[] = []
  supervisorInboxAttachmentPreviewUrls: Record<number, string> = {}
  technicianRankings: TechnicianRevenueRanking[] = []

  isLoadingServiceOrderAgreements = false
  isLoadingDiagnosis = false
  isLoadingTechnicianRankings = false
  isLoadingInboxThreads = false
  isLoadingInboxMessages = false
  isSendingInboxMessage = false
  inboxTotalItems = 0

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

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

  private readonly serviceTypeLabels: Record<string, string> = {
    [ServiceType.DIAGNOSIS]: "Diagnóstico",
    [ServiceType.STANDARD_SERVICE]: "Servicio estándar",
    [ServiceType.WARRANTY_SERVICE]: "Garantía",
    [ServiceType.ASSEMBLY]: "Ensamblaje",
    [ServiceType.CUSTOMER_SERVICE]: "Atención al cliente",
  }

  private readonly operativeStatusLabels: Record<ServiceOrderOperativeStatus, string> = {
    [ServiceOrderOperativeStatus.ABIERTA]: "Abierto",
    [ServiceOrderOperativeStatus.EN_PROCESO]: "En progreso",
    [ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA]: "Listo para entrega",
    [ServiceOrderOperativeStatus.ENTREGADA]: "Entregado",
    [ServiceOrderOperativeStatus.CANCELADA]: "Cancelado",
    [ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION]: "Sin solución",
  }

  private readonly slaStageLabels: Record<ServiceOrderSlaStage, string> = {
    assignment: "Asignación",
    diagnosis: "Diagnóstico",
    service: "Servicio",
    pickup: "Recojo",
    terminal: "Terminal",
  }

  constructor(
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly productsService: ProductsService,
    private readonly serviceOrderInboxService: ServiceOrderInboxService,
  ) {}

  ngOnInit(): void {
    this.loadServiceOrderAgreements()
    this.loadServiceOrders()
    this.loadProducts()
    this.loadInboxThreads()
    this.loadTechnicianRankings()
  }

  setActiveSection(section: "ranking" | "inbox" | "orders"): void {
    this.activeSection = section
    this.currentPage = 1
    if (section === "inbox") {
      this.loadInboxThreads()
    }
  }

  setActiveTab(tab: "open" | "answered" | "all"): void {
    this.activeTab = tab
    this.currentPage = 1
  }

  private loadInboxThreads(preferredThreadId?: number | null): void {
    this.isLoadingInboxThreads = true
    this.serviceOrderInboxService
      .listThreads({
        page: this.currentPage,
        limit: this.itemsPerPage,
      })
      .pipe(finalize(() => (this.isLoadingInboxThreads = false)))
      .subscribe({
        next: ({ data, total }) => {
          this.inboxThreads = data ?? []
          this.inboxTotalItems = total ?? this.inboxThreads.length

          const targetThread =
            this.inboxThreads.find((thread) => thread.id === preferredThreadId) ??
            this.inboxThreads.find((thread) => thread.id === this.selectedInboxThread?.id) ??
            this.inboxThreads[0] ??
            null

          if (targetThread) {
            this.selectInboxThread(targetThread)
            return
          }

          this.selectedInboxThread = null
          this.selectedInboxMessages = []
          this.clearSupervisorInboxAttachmentPreviews()
        },
        error: () => {
          this.inboxThreads = []
          this.inboxTotalItems = 0
          this.selectedInboxThread = null
          this.selectedInboxMessages = []
          this.clearSupervisorInboxAttachmentPreviews()
          this.showMessage("warning", "fas fa-comments", "No pudimos cargar las conversaciones.")
        },
      })
  }

  selectInboxThread(thread: ServiceOrderInboxThreadSummary): void {
    this.selectedInboxThread = thread
    this.isLoadingInboxMessages = true
    this.serviceOrderInboxService
      .getMessages(thread.id)
      .pipe(finalize(() => (this.isLoadingInboxMessages = false)))
      .subscribe({
        next: (response) => {
          this.selectedInboxThread = response.thread
          this.selectedInboxMessages = response.messages ?? []
          this.clearSupervisorInboxAttachmentPreviews()
          this.hydrateSupervisorInboxAttachmentPreviews(this.selectedInboxMessages)
          this.serviceOrderInboxService
            .markRead(thread.id)
            .pipe(catchError(() => of({ ok: false })))
            .subscribe(() => {
              this.inboxThreads = this.inboxThreads.map((item) =>
                item.id === thread.id ? { ...item, unreadCount: 0 } : item,
              )
              if (this.selectedInboxThread?.id === thread.id) {
                this.selectedInboxThread = { ...this.selectedInboxThread, unreadCount: 0 }
              }
            })
        },
        error: () => {
          this.selectedInboxMessages = []
          this.clearSupervisorInboxAttachmentPreviews()
          this.showMessage("warning", "fas fa-comments", "No pudimos cargar el detalle de la conversación.")
        },
      })
  }

  getInboxAuthorLabel(message: ServiceOrderInboxMessage): string {
    if (message.authorDisplayName?.trim()) {
      return message.authorDisplayName.trim()
    }

    switch (message.authorRole) {
      case "TECHNICIAN":
        return this.selectedInboxThread?.assignedTechnicianAlias ?? "Técnico"
      case "CLIENT":
        return this.selectedInboxThread?.clientAlias ?? "Cliente"
      case "RECEPTION":
        return "Recepción"
      case "SUPERVISOR":
        return "Supervisor"
      default:
        return "Sistema"
    }
  }

  getInboxThreadOperativeStatusLabel(status?: ServiceOrderOperativeStatus | null): string {
    if (!status) return "Abierto"
    return this.operativeStatusLabels[status] ?? status
  }

  getServiceOrderSlaStageLabel(stage?: ServiceOrderSlaStage | null): string {
    if (!stage) return "Sin etapa"
    return this.slaStageLabels[stage] ?? stage
  }

  formatMinutes(value?: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "—"
    }
    const totalMinutes = Math.max(0, Math.round(Number(value)))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (!hours) return `${minutes} min`
    if (!minutes) return `${hours} h`
    return `${hours} h ${minutes} min`
  }

  getMetricDisplayValue(metric?: ServiceOrderDerivedMetric | null): string {
    if (!metric?.isComputable) {
      return "Pendiente"
    }
    return this.formatMinutes(metric.valueMinutes)
  }

  getMetricMissingLabel(metric?: ServiceOrderDerivedMetric | null): string {
    if (metric?.isComputable || !metric?.missingTimestamps?.length) {
      return ""
    }
    return `Falta: ${metric.missingTimestamps.join(", ")}`
  }

  private loadServiceOrderAgreements(): void {
    this.isLoadingServiceOrderAgreements = true
    this.agreementService
      .findAll({ page: 1, limit: 100 })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreements = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar los acuerdos."),
      })
  }

  private loadServiceOrders(): void {
    this.serviceOrderService.findAll({ page: 1, limit: 100 }).subscribe({
      next: ({ data }) => {
        this.serviceOrders = data ?? []

        if (this.selectedServiceOrder?.id) {
          const updated = this.serviceOrders.find((order) => Number(order.id) === Number(this.selectedServiceOrder?.id)) ?? null
          this.selectedServiceOrder = updated
          if (updated) {
            this.loadOrderContext(updated.id)
          } else {
            this.clearSelectedServiceOrder()
          }
        }

        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages
        }
      },
      error: () => {
        this.serviceOrders = []
        this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar las órdenes del supervisor.")
      },
    })
  }

  private hydrateLists(serviceOrderAgreements: ServiceOrderAgreement[]): void {
    this.allServiceOrderAgreements = [...serviceOrderAgreements]

    this.openServiceOrderAgreements = serviceOrderAgreements.filter((quote) =>
      [ServiceOrderAgreementStatus.DRAFT].includes(quote.status),
    )

    this.answeredServiceOrderAgreements = serviceOrderAgreements.filter((quote) =>
      [ServiceOrderAgreementStatus.CONFIRMED, ServiceOrderAgreementStatus.VOIDED, ServiceOrderAgreementStatus.SUPERSEDED].includes(
        quote.status,
      ),
    )

    if (this.selectedServiceOrderAgreement) {
      const updated = serviceOrderAgreements.find((quote) => quote.id === this.selectedServiceOrderAgreement?.id)
      this.selectedServiceOrderAgreement = updated ?? null
      if (this.selectedServiceOrderAgreement) {
        this.loadServiceOrderDetail(this.selectedServiceOrderAgreement.serviceOrderId)
        this.loadCurrentDiagnosis(this.selectedServiceOrderAgreement.serviceOrderId)
      }
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }
  }

  private loadProducts(): void {
    this.productsService.list().subscribe({
      next: (items) => (this.products = items ?? []),
      error: () => (this.products = []),
    })
  }

  private loadTechnicianRankings(): void {
    this.isLoadingTechnicianRankings = true
    this.agreementService
      .getTechnicianRevenueRankings()
      .pipe(finalize(() => (this.isLoadingTechnicianRankings = false)))
      .subscribe({
        next: (response) => {
          this.technicianRankings = response.technicians ?? []
        },
        error: () => {
          this.technicianRankings = []
          this.showMessage("warning", "fas fa-chart-line", "No pudimos cargar el ranking de tecnicos.")
        },
      })
  }

  get topTechnician(): TechnicianRevenueRanking | null {
    return this.technicianRankings[0] ?? null
  }

  get secondTechnician(): TechnicianRevenueRanking | null {
    return this.technicianRankings[1] ?? null
  }

  get thirdTechnician(): TechnicianRevenueRanking | null {
    return this.technicianRankings[2] ?? null
  }

  get totalItems(): number {
    switch (this.activeSection) {
      case "ranking":
        return this.technicianRankings.length
      case "inbox":
        return this.inboxTotalItems
      case "orders":
        return this.filteredServiceOrders.length
      default:
        return this.getVisibleAgreements().length
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage))
  }

  get paginatedTechnicianRankings(): TechnicianRevenueRanking[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.technicianRankings.slice(start, start + this.itemsPerPage)
  }

  get paginatedInboxThreads(): ServiceOrderInboxThreadSummary[] {
    return this.inboxThreads
  }

  get paginatedVisibleAgreements(): ServiceOrderAgreement[] {
    const visibleQuotes = this.getVisibleAgreements()
    const start = (this.currentPage - 1) * this.itemsPerPage
    return visibleQuotes.slice(start, start + this.itemsPerPage)
  }

  get filteredServiceOrders(): ServiceOrder[] {
    const query = this.orderSearchTerm.trim().toLowerCase()

    return this.serviceOrders.filter((order) => {
      const matchesStatus =
        this.orderOperativeStatusFilter === "ALL" || order.operativeStatus === this.orderOperativeStatusFilter
      const matchesQuery =
        !query ||
        [order.code, order.brand, order.model, order.initialIssue, order.assignedToTechnicianName]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(query))

      return matchesStatus && matchesQuery
    })
  }

  get paginatedServiceOrders(): ServiceOrder[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.filteredServiceOrders.slice(start, start + this.itemsPerPage)
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1
      if (this.activeSection === "inbox") {
        this.loadInboxThreads()
      }
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1
      if (this.activeSection === "inbox") {
        this.loadInboxThreads()
      }
    }
  }

  sendSupervisorInboxMessage(): void {
    const trimmedMessage = this.supervisorInboxDraft.trim()
    if ((!trimmedMessage && !this.supervisorInboxDraftAttachments.length) || !this.selectedInboxThread || this.isSendingInboxMessage) {
      return
    }

    this.isSendingInboxMessage = true
    this.serviceOrderInboxService
      .sendMessage(
        this.selectedInboxThread.id,
        trimmedMessage,
        this.supervisorInboxDraftAttachments.map((attachment) => attachment.file),
      )
      .pipe(finalize(() => (this.isSendingInboxMessage = false)))
      .subscribe({
        next: (result) => {
          const currentThreadId = this.selectedInboxThread?.id ?? null
          this.supervisorInboxDraft = ""
          this.clearSupervisorInboxDraftAttachments()
          if (result.partialFailures?.length) {
            this.showMessage("warning", "fas fa-exclamation-triangle", "El mensaje salió parcialmente: revisá los adjuntos fallidos antes de reenviar.")
          }
          this.loadInboxThreads(currentThreadId)
        },
        error: () => {
          this.showMessage("danger", "fas fa-exclamation-circle", "No se pudo enviar el mensaje de WhatsApp.")
        },
      })
  }

  triggerSupervisorInboxAttachmentPicker(input: HTMLInputElement): void {
    input.click()
  }

  onSupervisorInboxFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null
    const files = Array.from(input?.files ?? [])
    if (!files.length) {
      return
    }

    const nextAttachments = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }))
    this.supervisorInboxDraftAttachments = [...this.supervisorInboxDraftAttachments, ...nextAttachments]

    if (input) {
      input.value = ""
    }
  }

  removeSupervisorInboxDraftAttachment(index: number): void {
    const target = this.supervisorInboxDraftAttachments[index]
    if (!target) {
      return
    }

    if (target.previewUrl) {
      URL.revokeObjectURL(target.previewUrl)
    }

    this.supervisorInboxDraftAttachments = this.supervisorInboxDraftAttachments.filter((_, itemIndex) => itemIndex !== index)
  }

  getSupervisorInboxAttachmentPreviewUrl(attachmentId: number): string | null {
    return this.supervisorInboxAttachmentPreviewUrls[attachmentId] ?? null
  }

  downloadSupervisorInboxAttachment(attachment: ServiceOrderInboxAttachment): void {
    this.serviceOrderInboxService.downloadAttachmentBlob(attachment.id).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = blobUrl
        anchor.download = attachment.fileName
        anchor.click()
        URL.revokeObjectURL(blobUrl)
      },
      error: () => {
        this.showMessage("warning", "fas fa-paperclip", "No se pudo descargar el adjunto.")
      },
    })
  }

  formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value || 0).toFixed(2)}`
  }

  getRevenueShare(technician: TechnicianRevenueRanking): number {
    const total = this.technicianRankings.reduce((acc, item) => acc + Number(item.totalRevenue || 0), 0)
    if (!total) return 0
    return Math.min(100, (Number(technician.totalRevenue || 0) / total) * 100)
  }

  selectServiceOrderAgreement(quote: ServiceOrderAgreement): void {
    this.selectedServiceOrderAgreement = quote
    this.loadServiceOrderDetail(quote.serviceOrderId)
    this.loadCurrentDiagnosis(quote.serviceOrderId)
  }

  selectServiceOrder(order: ServiceOrder): void {
    this.selectedServiceOrder = order
    this.selectedInboxThreadByOrder =
      this.inboxThreads.find((thread) => Number(thread.serviceOrderId) === Number(order.id)) ?? null
    this.loadOrderContext(order.id)
  }

  clearSelectedServiceOrderAgreement(): void {
    this.selectedServiceOrderAgreement = null
    this.selectedServiceOrder = null
    this.currentDiagnosis = null
  }

  clearSelectedServiceOrder(): void {
    this.selectedServiceOrder = null
    this.selectedServiceOrderAgreement = null
    this.selectedOrderAgreements = []
    this.currentDiagnosis = null
    this.selectedInboxThreadByOrder = null
  }

  private loadOrderContext(serviceOrderId: number): void {
    this.loadServiceOrderDetail(serviceOrderId)
    this.loadCurrentDiagnosis(serviceOrderId)
    this.loadOrderAgreements(serviceOrderId)
  }

  private loadServiceOrderDetail(serviceOrderId: number): void {
    this.serviceOrderService.findOne(serviceOrderId).subscribe({
      next: (serviceOrder) => (this.selectedServiceOrder = serviceOrder),
      error: () => {
        this.selectedServiceOrder = null
        this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el detalle del equipo.")
      },
    })
  }

  private loadOrderAgreements(serviceOrderId: number): void {
    this.agreementService.findAll({ page: 1, limit: 20, serviceOrderId }).subscribe({
      next: ({ data }) => {
        this.selectedOrderAgreements = data ?? []
        this.selectedServiceOrderAgreement =
          this.selectedOrderAgreements.find((agreement) => agreement.status === ServiceOrderAgreementStatus.DRAFT) ??
          this.selectedOrderAgreements.find((agreement) => agreement.status === ServiceOrderAgreementStatus.CONFIRMED) ??
          this.selectedOrderAgreements[0] ??
          null
      },
      error: () => {
        this.selectedOrderAgreements = []
        this.selectedServiceOrderAgreement = null
      },
    })
  }

  private loadCurrentDiagnosis(serviceOrderId: number): void {
    this.isLoadingDiagnosis = true
    this.diagnosticService
      .findAll({ page: 1, limit: 1, serviceOrderId, status: "CURRENT" })
      .pipe(finalize(() => (this.isLoadingDiagnosis = false)))
      .subscribe({
        next: ({ data }) => {
          this.currentDiagnosis = data?.[0] ?? null
        },
        error: () => {
          this.currentDiagnosis = null
        },
      })
  }

  getVisibleAgreements(): ServiceOrderAgreement[] {
    switch (this.activeTab) {
      case "open":
        return this.openServiceOrderAgreements
      case "answered":
        return this.answeredServiceOrderAgreements
      default:
        return this.allServiceOrderAgreements
    }
  }

  getEquipmentTypeLabel(type?: EquipmentType | null, equipmentTypeOther?: string | null): string {
    if (!type) return "Sin tipo"
    if (type === EquipmentType.OTHER && equipmentTypeOther?.trim()) {
      return equipmentTypeOther.trim()
    }
    return this.equipmentTypeLabels[type] ?? String(type)
  }

  getServiceTypeLabel(serviceType?: string | null): string {
    if (!serviceType) return "Sin tipo"
    return this.serviceTypeLabels[serviceType] ?? serviceType
  }

  getProductLabel(productId: number | null): string {
    if (!productId) return "Producto sin referencia"
    const product = this.products.find((item) => Number(item.id) === Number(productId))
    return product ? `${product.sku} . ${product.name}` : `Producto #${productId}`
  }

  getServiceLabel(serviceId: number | null): string {
    return serviceId ? TECHNICAL_SERVICE_LABEL : TECHNICAL_SERVICE_LABEL
  }

  getServiceOrderAgreementHeaderLabel(quote: ServiceOrderAgreement): string {
    const serviceOrderCode = quote.serviceOrder?.code
    const equipmentLabel = this.getEquipmentTypeLabel(
      quote.serviceOrder?.equipmentType,
      quote.serviceOrder?.equipmentTypeOther,
    )
    if (serviceOrderCode) {
      return `${serviceOrderCode} . ${equipmentLabel}`
    }
    return equipmentLabel
  }

  getServiceOrderAgreementStatusLabel(status: ServiceOrderAgreementStatus): string {
    const statusMap: Record<string, string> = {
      [ServiceOrderAgreementStatus.DRAFT]: "Borrador",
      [ServiceOrderAgreementStatus.CONFIRMED]: "Confirmado",
      [ServiceOrderAgreementStatus.SUPERSEDED]: "Reemplazado",
      [ServiceOrderAgreementStatus.VOIDED]: "Anulado",
    }
    return statusMap[status] || status
  }

  getServiceOrderAgreementStatusClass(status: ServiceOrderAgreementStatus): string {
    const statusClassMap: Record<string, string> = {
      [ServiceOrderAgreementStatus.DRAFT]: "status-current",
      [ServiceOrderAgreementStatus.CONFIRMED]: "status-client-approved",
      [ServiceOrderAgreementStatus.VOIDED]: "status-client-rejected",
      [ServiceOrderAgreementStatus.SUPERSEDED]: "status-archived",
    }
    return statusClassMap[status] || "status-default"
  }

  getOrderOperativeStatusOptions(): ServiceOrderOperativeStatus[] {
    return [
      ServiceOrderOperativeStatus.ABIERTA,
      ServiceOrderOperativeStatus.EN_PROCESO,
      ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ]
  }

  openInboxShortcut(order: ServiceOrder): void {
    this.selectedInboxThreadByOrder =
      this.inboxThreads.find((thread) => Number(thread.serviceOrderId) === Number(order.id)) ?? null
    this.activeSection = "inbox"
    this.currentPage = 1
    this.loadInboxThreads(this.selectedInboxThreadByOrder?.id ?? null)
  }

  hasActiveSlaBreach(order?: ServiceOrder | null): boolean {
    return Boolean(order?.sla?.breached)
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

  private hydrateSupervisorInboxAttachmentPreviews(messages: ServiceOrderInboxMessage[]): void {
    messages.forEach((message) => {
      message.attachments
        .filter((attachment) => attachment.previewable)
        .forEach((attachment) => {
          if (this.supervisorInboxAttachmentPreviewUrls[attachment.id]) {
            return
          }

          this.serviceOrderInboxService.downloadAttachmentBlob(attachment.id).subscribe({
            next: (blob) => {
              this.supervisorInboxAttachmentPreviewUrls[attachment.id] = URL.createObjectURL(blob)
            },
          })
        })
    })
  }

  private clearSupervisorInboxAttachmentPreviews(): void {
    Object.values(this.supervisorInboxAttachmentPreviewUrls).forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl)
    })
    this.supervisorInboxAttachmentPreviewUrls = {}
  }

  private clearSupervisorInboxDraftAttachments(): void {
    this.supervisorInboxDraftAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
    })
    this.supervisorInboxDraftAttachments = []
  }
}


