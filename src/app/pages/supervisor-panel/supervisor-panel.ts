import { Component, OnInit } from "@angular/core"
import { finalize } from "rxjs/operators"
import { ServiceOrderAgreement, ServiceOrderAgreementStatus } from "../../models/service-orders/service-agreement"
import {
  ServiceOrderAgreementService,
  TechnicianRevenueRanking,
} from "../../services/service-orders/service-agreement.service"
import { EquipmentType, ServiceOrder, ServiceType } from "../../models/service-orders/service-order"
import { ServiceOrderService } from "../../services/service-orders/service-order.service"
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
  equipmentLabel: string
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

  openServiceOrderAgreements: ServiceOrderAgreement[] = []
  answeredServiceOrderAgreements: ServiceOrderAgreement[] = []
  allServiceOrderAgreements: ServiceOrderAgreement[] = []

  selectedServiceOrderAgreement: ServiceOrderAgreement | null = null
  selectedServiceOrder: ServiceOrder | null = null
  currentDiagnosis: ServiceOrderDiagnosis | null = null

  products: Product[] = []
  services: Service[] = []
  inboxThreads: SupervisorInboxThread[] = []
  selectedInboxThread: SupervisorInboxThread | null = null
  technicianRankings: TechnicianRevenueRanking[] = []

  isLoadingServiceOrderAgreements = false
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
    [EquipmentType.SCANNER]: "Escaner",
    [EquipmentType.PROJECTOR]: "Proyector",
    [EquipmentType.MONITOR]: "Monitor",
    [EquipmentType.SERVER]: "Servidor",
    [EquipmentType.NETWORK_DEVICE]: "Equipo de red",
    [EquipmentType.OTHER]: "Otro",
  }

  private readonly serviceTypeLabels: Record<string, string> = {
    [ServiceType.DIAGNOSIS]: "Diagnostico",
    [ServiceType.STANDARD_SERVICE]: "Servicio estandar",
    [ServiceType.WARRANTY_SERVICE]: "Garantia",
    [ServiceType.ASSEMBLY]: "Ensamblaje",
    [ServiceType.CUSTOMER_SERVICE]: "Atencion al cliente",
  }

  constructor(
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly productsService: ProductsService,
    private readonly serviceService: ServiceService,
  ) {}

  ngOnInit(): void {
    this.loadServiceOrderAgreements()
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
        equipmentLabel: "Laptop",
        technicianAlias: "Tecnico-03",
        clientAlias: "Cliente-A042",
        riskLevel: "normal",
        unreadCount: 1,
        messages: [
          { id: 1, author: "SYSTEM", text: "Canal auditado y anonimizado.", createdAt: now },
          { id: 2, author: "CLIENT", text: "Ya tienen avance del diagnostico?", createdAt: now },
          { id: 3, author: "TECHNICIAN", text: "Estamos finalizando pruebas de energia y pantalla.", createdAt: now },
        ],
      },
      {
        id: 2,
        serviceOrderCode: "SO-240316-0891",
        equipmentLabel: "PC de escritorio",
        technicianAlias: "Tecnico-07",
        clientAlias: "Cliente-B891",
        riskLevel: "review",
        unreadCount: 3,
        messages: [
          { id: 4, author: "SYSTEM", text: "Mensaje marcado para revision semantica.", createdAt: now },
          { id: 5, author: "TECHNICIAN", text: "Tu equipo necesita cambio de placa, te confirmo el acuerdo.", createdAt: now },
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
        return "Tecnico"
      case "CLIENT":
        return this.selectedInboxThread?.clientAlias ?? "Cliente"
      default:
        return "Sistema"
    }
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
        return this.inboxThreads.length
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

  get paginatedInboxThreads(): SupervisorInboxThread[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.inboxThreads.slice(start, start + this.itemsPerPage)
  }

  get paginatedVisibleAgreements(): ServiceOrderAgreement[] {
    const visibleQuotes = this.getVisibleAgreements()
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

  selectServiceOrderAgreement(quote: ServiceOrderAgreement): void {
    this.selectedServiceOrderAgreement = quote
    this.loadServiceOrderDetail(quote.serviceOrderId)
    this.loadCurrentDiagnosis(quote.serviceOrderId)
  }

  clearSelectedServiceOrderAgreement(): void {
    this.selectedServiceOrderAgreement = null
    this.selectedServiceOrder = null
    this.currentDiagnosis = null
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
    if (!serviceId) return "Servicio sin referencia"
    const service = this.services.find((item) => Number(item.id) === Number(serviceId))
    return service ? `${service.code} . ${service.name}` : `Servicio #${serviceId}`
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


