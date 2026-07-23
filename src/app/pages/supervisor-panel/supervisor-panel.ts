import { Component, OnInit } from "@angular/core"
import { Router } from "@angular/router"
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
import { Product } from "../../models/catalog/product"
import { ProductsService } from "../../services/inventory/products.service"
import { ServiceOrderInboxService } from "../../services/service-orders/service-order-inbox.service"

const TECHNICAL_SERVICE_LABEL = "Servicio técnico"


@Component({
  selector: "app-supervisor-panel",
  standalone: false,
  templateUrl: "./supervisor-panel.html",
  styleUrls: ["./supervisor-panel.scss"],
})
export class SupervisorPanel implements OnInit {
  activeSection: "ranking" | "orders" = "orders"
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

  orderSearchTerm = ""
  orderOperativeStatusFilter: ServiceOrderOperativeStatus | "ALL" = "ALL"

  products: Product[] = []
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
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadServiceOrderAgreements()
    this.loadServiceOrders()
    this.loadProducts()
    this.loadTechnicianRankings()
  }

  setActiveSection(section: "ranking" | "orders"): void {
    this.activeSection = section
    this.currentPage = 1
  }

  setActiveTab(tab: "open" | "answered" | "all"): void {
    this.activeTab = tab
    this.currentPage = 1
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

  selectServiceOrder(order: ServiceOrder): void {
    this.selectedServiceOrder = order
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
    this.openInboxWorkspace(order)
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
          })
        },
        error: () => {
          this.showMessage('danger', 'fas fa-exclamation-circle', 'No pudimos abrir la conversación del cliente.')
        },
      })
      return
    }

    void this.router.navigate(['/service-order-inbox'])
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

}





