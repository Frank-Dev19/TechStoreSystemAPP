import { Component, OnInit } from "@angular/core"
import { finalize } from "rxjs/operators"
import { ServiceOrderQuote, ServiceOrderQuoteStatus } from "../../models/service-orders/service-quote"
import {
  ServiceOrderQuoteService,
  TechnicianRevenueRanking,
} from "../../services/service-orders/service-quote.service"
import { EquipmentType, ServiceOrderItem } from "../../models/service-orders/service-order-item"
import { ServiceOrderItemService } from "../../services/service-orders/service-order-item.service"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import { ServiceOrderDiagnosis } from "../../models/service-orders/service-order-diagnosis"
import { Product } from "../../models/catalog/product"
import { Service } from "../../models/service-catalog/service"
import { ProductsService } from "../../services/inventory/products.service"
import { ServiceService } from "../../services/service-catalog/service.service"

type InboxAuthor = "TECHNICIAN" | "CLIENT" | "SYSTEM"

interface SupervisorInboxMessage {
  id: number
  author: InboxAuthor
  text: string
  createdAt: Date
}

interface SupervisorInboxThread {
  id: number
  serviceOrderCode: string
  serviceOrderItemLabel: string
  technicianAlias: string
  clientAlias: string
  riskLevel: "normal" | "review"
  unreadCount: number
  messages: SupervisorInboxMessage[]
}

@Component({
  selector: "app-supervisor-panel",
  standalone: false,
  templateUrl: "./supervisor-panel.html",
  styleUrls: ["./supervisor-panel.scss"],
})
export class SupervisorPanel implements OnInit {
  activeSection: "ranking" | "inbox" | "quotes" = "ranking"
  activeTab: "open" | "answered" | "all" = "open"
  currentPage = 1
  itemsPerPage = 6

  openServiceOrderQuotes: ServiceOrderQuote[] = []
  answeredServiceOrderQuotes: ServiceOrderQuote[] = []
  allServiceOrderQuotes: ServiceOrderQuote[] = []

  selectedServiceOrderQuote: ServiceOrderQuote | null = null
  selectedServiceOrderItem: ServiceOrderItem | null = null
  currentDiagnosis: ServiceOrderDiagnosis | null = null

  products: Product[] = []
  services: Service[] = []
  inboxThreads: SupervisorInboxThread[] = []
  selectedInboxThread: SupervisorInboxThread | null = null
  technicianRankings: TechnicianRevenueRanking[] = []

  isLoadingServiceOrderQuotes = false
  isLoadingDiagnosis = false
  isLoadingTechnicianRankings = false

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

  private readonly serviceTypeLabels = {
    DIAGNOSIS: "Diagnóstico",
    STANDARD_SERVICE: "Servicio estándar",
  } as const

  constructor(
    private readonly quoteService: ServiceOrderQuoteService,
    private readonly serviceOrderItemService: ServiceOrderItemService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly productsService: ProductsService,
    private readonly serviceService: ServiceService,
  ) {}

  ngOnInit(): void {
    this.loadServiceOrderQuotes()
    this.loadCatalogData()
    this.initializeInboxThreads()
    this.loadTechnicianRankings()
  }

  setActiveSection(section: "ranking" | "inbox" | "quotes"): void {
    this.activeSection = section
    this.currentPage = 1
  }

  setActiveTab(tab: "open" | "answered" | "all"): void {
    this.activeTab = tab
    this.currentPage = 1
  }

  private initializeInboxThreads(): void {
    const now = new Date()
    this.inboxThreads = [
      {
        id: 1,
        serviceOrderCode: "SO-240315-1042",
        serviceOrderItemLabel: "Equipo #1",
        technicianAlias: "Tecnico-03",
        clientAlias: "Cliente-A042",
        riskLevel: "normal",
        unreadCount: 1,
        messages: [
          { id: 1, author: "SYSTEM", text: "Canal auditado y anonimizado.", createdAt: now },
          { id: 2, author: "CLIENT", text: "¿Ya tienen avance del diagnóstico?", createdAt: now },
          { id: 3, author: "TECHNICIAN", text: "Estamos finalizando pruebas de energía y pantalla.", createdAt: now },
        ],
      },
      {
        id: 2,
        serviceOrderCode: "SO-240316-0891",
        serviceOrderItemLabel: "Equipo #2",
        technicianAlias: "Tecnico-07",
        clientAlias: "Cliente-B891",
        riskLevel: "review",
        unreadCount: 3,
        messages: [
          { id: 4, author: "SYSTEM", text: "Mensaje marcado para revisión semántica.", createdAt: now },
          { id: 5, author: "TECHNICIAN", text: "Tu equipo necesita cambio de placa, te confirmo la cotización.", createdAt: now },
          { id: 6, author: "CLIENT", text: "Listo, quedo atento al presupuesto.", createdAt: now },
        ],
      },
    ]
    this.selectedInboxThread = this.inboxThreads[0] ?? null
  }

  selectInboxThread(thread: SupervisorInboxThread): void {
    thread.unreadCount = 0
    this.selectedInboxThread = thread
  }

  getInboxAuthorLabel(author: InboxAuthor): string {
    switch (author) {
      case "TECHNICIAN":
        return "Técnico"
      case "CLIENT":
        return this.selectedInboxThread?.clientAlias ?? "Cliente"
      default:
        return "Sistema"
    }
  }

  private loadServiceOrderQuotes(): void {
    this.isLoadingServiceOrderQuotes = true
    this.quoteService
      .findAll({ page: 1, limit: 100 })
      .pipe(finalize(() => (this.isLoadingServiceOrderQuotes = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar las cotizaciones."),
      })
  }

  private hydrateLists(serviceOrderQuotes: ServiceOrderQuote[]): void {
    this.allServiceOrderQuotes = [...serviceOrderQuotes]

    this.openServiceOrderQuotes = serviceOrderQuotes.filter((quote) =>
      [
        ServiceOrderQuoteStatus.CURRENT,
        ServiceOrderQuoteStatus.SENT_TO_CLIENT,
        ServiceOrderQuoteStatus.AWAITING_CLIENT_RESPONSE,
      ].includes(quote.status),
    )

    this.answeredServiceOrderQuotes = serviceOrderQuotes.filter((quote) =>
      [ServiceOrderQuoteStatus.CLIENT_APPROVED, ServiceOrderQuoteStatus.CLIENT_REJECTED].includes(quote.status),
    )

    if (this.selectedServiceOrderQuote) {
      const updated = serviceOrderQuotes.find((quote) => quote.id === this.selectedServiceOrderQuote?.id)
      this.selectedServiceOrderQuote = updated ?? null
      if (this.selectedServiceOrderQuote) {
        this.loadServiceOrderItemDetail(this.selectedServiceOrderQuote.serviceOrderItemId)
        this.loadCurrentDiagnosis(this.selectedServiceOrderQuote.serviceOrderItemId)
      }
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }
  }

  private loadCatalogData(): void {
    this.productsService.list().subscribe({
      next: (items) => (this.products = items ?? []),
      error: () => (this.products = []),
    })

    this.serviceService.findAll({ page: 1, limit: 100 }).subscribe({
      next: ({ data }) => (this.services = data ?? []),
      error: () => (this.services = []),
    })
  }

  private loadTechnicianRankings(): void {
    this.isLoadingTechnicianRankings = true
    this.quoteService
      .getTechnicianRevenueRankings()
      .pipe(finalize(() => (this.isLoadingTechnicianRankings = false)))
      .subscribe({
        next: (response) => {
          this.technicianRankings = response.technicians ?? []
        },
        error: () => {
          this.technicianRankings = []
          this.showMessage("warning", "fas fa-chart-line", "No pudimos cargar el ranking de técnicos.")
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

  get remainingTechnicians(): TechnicianRevenueRanking[] {
    return this.technicianRankings.slice(3)
  }

  get totalItems(): number {
    switch (this.activeSection) {
      case "ranking":
        return this.technicianRankings.length
      case "inbox":
        return this.inboxThreads.length
      default:
        return this.getVisibleQuotes().length
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage))
  }

  get paginatedTechnicianRankings(): TechnicianRevenueRanking[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.technicianRankings.slice(start, start + this.itemsPerPage)
  }

  get paginatedInboxThreads(): SupervisorInboxThread[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.inboxThreads.slice(start, start + this.itemsPerPage)
  }

  get paginatedVisibleQuotes(): ServiceOrderQuote[] {
    const visibleQuotes = this.getVisibleQuotes()
    const start = (this.currentPage - 1) * this.itemsPerPage
    return visibleQuotes.slice(start, start + this.itemsPerPage)
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

  formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value || 0).toFixed(2)}`
  }

  getRevenueShare(technician: TechnicianRevenueRanking): number {
    const total = this.technicianRankings.reduce((acc, item) => acc + Number(item.totalRevenue || 0), 0)
    if (!total) return 0
    return Math.min(100, (Number(technician.totalRevenue || 0) / total) * 100)
  }

  selectServiceOrderQuote(quote: ServiceOrderQuote): void {
    this.selectedServiceOrderQuote = quote
    this.loadServiceOrderItemDetail(quote.serviceOrderItemId)
    this.loadCurrentDiagnosis(quote.serviceOrderItemId)
  }

  clearSelectedServiceOrderQuote(): void {
    this.selectedServiceOrderQuote = null
    this.selectedServiceOrderItem = null
    this.currentDiagnosis = null
  }

  private loadServiceOrderItemDetail(serviceOrderItemId: number): void {
    this.serviceOrderItemService.findOne(serviceOrderItemId).subscribe({
      next: (item) => (this.selectedServiceOrderItem = item),
      error: () => {
        this.selectedServiceOrderItem = null
        this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el detalle del equipo.")
      },
    })
  }

  private loadCurrentDiagnosis(serviceOrderItemId: number): void {
    this.isLoadingDiagnosis = true
    this.diagnosticService
      .findAll({ page: 1, limit: 1, serviceOrderItemId, status: "CURRENT" })
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

  getVisibleQuotes(): ServiceOrderQuote[] {
    switch (this.activeTab) {
      case "open":
        return this.openServiceOrderQuotes
      case "answered":
        return this.answeredServiceOrderQuotes
      default:
        return this.allServiceOrderQuotes
    }
  }

  getEquipmentTypeLabel(type?: EquipmentType | null): string {
    if (!type) return "Sin tipo"
    return this.equipmentTypeLabels[type] ?? String(type)
  }

  getServiceTypeLabel(serviceType?: string | null): string {
    if (!serviceType) return "Sin tipo"
    return this.serviceTypeLabels[serviceType as keyof typeof this.serviceTypeLabels] ?? serviceType
  }

  getProductLabel(productId: number | null): string {
    if (!productId) return "Producto sin referencia"
    const product = this.products.find((item) => Number(item.id) === Number(productId))
    return product ? `${product.sku} · ${product.name}` : `Producto #${productId}`
  }

  getServiceLabel(serviceId: number | null): string {
    if (!serviceId) return "Servicio sin referencia"
    const service = this.services.find((item) => Number(item.id) === Number(serviceId))
    return service ? `${service.code} · ${service.name}` : `Servicio #${serviceId}`
  }

  getServiceOrderQuoteHeaderLabel(quote: ServiceOrderQuote): string {
    const serviceOrderCode = quote.serviceOrderItem?.serviceOrder?.code
    const equipmentLabel = this.getEquipmentTypeLabel(quote.serviceOrderItem?.equipmentType)
    if (serviceOrderCode) {
      return `${serviceOrderCode} · ${equipmentLabel}`
    }
    return equipmentLabel
  }

  getServiceOrderQuoteStatusLabel(status: ServiceOrderQuoteStatus): string {
    const statusMap: Record<ServiceOrderQuoteStatus, string> = {
      [ServiceOrderQuoteStatus.SENT_TO_CLIENT]: "Enviada al cliente",
      [ServiceOrderQuoteStatus.AWAITING_CLIENT_RESPONSE]: "Esperando respuesta del cliente",
      [ServiceOrderQuoteStatus.CLIENT_APPROVED]: "Aprobada por cliente",
      [ServiceOrderQuoteStatus.CLIENT_REJECTED]: "Rechazada por cliente",
      [ServiceOrderQuoteStatus.CURRENT]: "Vigente",
      [ServiceOrderQuoteStatus.ARCHIVED]: "Archivada",
    }
    return statusMap[status] || status
  }

  getServiceOrderQuoteStatusClass(status: ServiceOrderQuoteStatus): string {
    const statusClassMap: Record<ServiceOrderQuoteStatus, string> = {
      [ServiceOrderQuoteStatus.SENT_TO_CLIENT]: "status-sent-client",
      [ServiceOrderQuoteStatus.AWAITING_CLIENT_RESPONSE]: "status-awaiting-client",
      [ServiceOrderQuoteStatus.CLIENT_APPROVED]: "status-client-approved",
      [ServiceOrderQuoteStatus.CLIENT_REJECTED]: "status-client-rejected",
      [ServiceOrderQuoteStatus.CURRENT]: "status-current",
      [ServiceOrderQuoteStatus.ARCHIVED]: "status-archived",
    }
    return statusClassMap[status] || "status-default"
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
}
