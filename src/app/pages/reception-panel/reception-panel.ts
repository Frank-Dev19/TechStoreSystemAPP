import { Component, OnDestroy, OnInit } from "@angular/core"
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Subscription } from "rxjs"
import { catchError, finalize, map, switchMap, tap } from "rxjs/operators"
import { forkJoin, of, throwError } from "rxjs"
import { ClientsApiService } from "../../services/clients-api.service"
import { ClientResponse } from "../../models/clients-response"
import { ClientSaveRequest } from "../../models/clients-request"
import { ServiceOrderService } from "../../services/service-orders/service-order.service"
import { ServiceOrderItemService } from "../../services/service-orders/service-order-item.service"
import { RequestOrigin, ServiceOrder, ServiceOrderPriority, ServiceOrderStatus } from "../../models/service-orders/service-order"
import { ServiceOrderSaveRequest, ServiceOrderUpdateRequest } from "../../models/service-orders/service-order-request"
import { ServiceOrderItemSaveRequest } from "../../models/service-orders/service-order-item-request"
import { EquipmentType, ServiceType, ServiceOrderItem, ServiceOrderItemStatus } from "../../models/service-orders/service-order-item"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { ServiceService } from "../../services/service-catalog/service.service"
import { Service } from "../../models/service-catalog/service"
import { ServiceCategoryService } from "../../services/service-catalog/service-category.service"
import { ServiceCategory } from "../../models/service-catalog/service-category"
import { ServiceOrderQuoteService } from "../../services/service-orders/service-quote.service"
import { ServiceOrderQuoteRequest } from "../../models/service-orders/service-quote-request"
import { ServiceOrderQuote, ServiceOrderQuoteStatus } from "../../models/service-orders/service-quote"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import { ServiceOrderDiagnosis } from "../../models/service-orders/service-order-diagnosis"
import { config } from "../../../environments/environment"
import { DocumentTypesApiService } from "../../services/document-types-api.service"
import { DocumentTypeResponse } from "../../models/document-types/document-types-response"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"
import { PricingQueryApiService } from "../../services/pricing/pricing-query-api.service"

interface ServiceOrderQuoteProductComposer {
  id: number
  type: "product"
  productId: number | null
  quantity: number
  unitPrice: number
  requiresPurchase: boolean
  notes: string
}

interface ServiceOrderQuoteServiceComposer {
  id: number
  type: "service"
  serviceId: number | null
  notes: string
}

interface WarrantyCoverageLine {
  id: string
  kind: "product" | "service"
  label: string
  productId?: number | null
  serviceId?: number | null
  quantity?: number
  unitPrice?: number
  warrantyDays: number
  coverageUntil: Date | null
  selectable: boolean
  reason?: string
}

type ServiceOrderQuoteComposerItem = ServiceOrderQuoteProductComposer | ServiceOrderQuoteServiceComposer
type CreateServiceOrderStepKey = "workflow" | "client" | "items" | "initialQuote" | "review"

interface CreateServiceOrderStep {
  key: CreateServiceOrderStepKey
  label: string
  description: string
}

const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  [ServiceOrderStatus.OPEN]: "Abierto",
  [ServiceOrderStatus.IN_PROGRESS]: "En progreso",
  [ServiceOrderStatus.PARTIALLY_COMPLETED]: "Parcialmente completado",
  [ServiceOrderStatus.COMPLETED]: "Completado",
  [ServiceOrderStatus.CANCELLED]: "Cancelado",
}

const SERVICE_ORDER_PRIORITY_LABELS: Record<ServiceOrderPriority, string> = {
  [ServiceOrderPriority.LOW]: "Baja",
  [ServiceOrderPriority.MEDIUM]: "Media",
  [ServiceOrderPriority.HIGH]: "Alta",
}

const SERVICE_ORDER_ITEM_STATUS_LABELS: Record<ServiceOrderItemStatus, string> = {
  [ServiceOrderItemStatus.ASSIGNED]: "Asignado",
  [ServiceOrderItemStatus.IN_DIAGNOSIS]: "En diagnóstico",
  [ServiceOrderItemStatus.DIAGNOSED]: "Diagnosticado",
  [ServiceOrderItemStatus.QUOTED]: "Cotizado",
  [ServiceOrderItemStatus.SENT_TO_CLIENT]: "Enviado al cliente",
  [ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE]: "Esperando respuesta del cliente",
  [ServiceOrderItemStatus.CLIENT_APPROVED]: "Aprobado por cliente",
  [ServiceOrderItemStatus.QUOTE_EXPIRED]: "Cotización expirada",
  [ServiceOrderItemStatus.READY_FOR_REPAIR]: "Listo para reparación",
  [ServiceOrderItemStatus.CLIENT_REJECTED]: "Rechazado por cliente",
  [ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT]: "Cerrado por rechazo del cliente",
  [ServiceOrderItemStatus.AWAITING_PARTS]: "Esperando repuestos",
  [ServiceOrderItemStatus.IN_REPAIR]: "En reparación",
  [ServiceOrderItemStatus.REPAIRED]: "Reparado",
  [ServiceOrderItemStatus.DELIVERED]: "Entregado",
  [ServiceOrderItemStatus.CANCELLED]: "Cancelado",
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.STANDARD_SERVICE]: "Estándar",
  [ServiceType.DIAGNOSIS]: "Diagnóstico",
  [ServiceType.WARRANTY_SERVICE]: "Garantía",
  [ServiceType.ASSEMBLY]: "Ensamblaje",
  [ServiceType.CUSTOMER_SERVICE]: "Atención al cliente",
}

const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
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

@Component({
  selector: "app-reception-panel",
  standalone: false,
  templateUrl: "./reception-panel.html",
  styleUrls: ["./reception-panel.scss"],
})
export class ReceptionPanel implements OnInit, OnDestroy {
  serviceOrders: ServiceOrder[] = []
  filteredServiceOrders: ServiceOrder[] = []
  paginatedServiceOrders: ServiceOrder[] = []
  selectedServiceOrderItemId: number | null = null
  selectedServiceOrderItem: ServiceOrderItem | null = null
  currentDiagnosis: ServiceOrderDiagnosis | null = null
  isLoadingDiagnosis = false
  readonly serviceTypeEnum = ServiceType
  readonly requestOriginEnum = RequestOrigin
  expectedDocumentDigits: number | null = null
  private itemServiceOrderQuoteTotals: Record<number, number> = {}
  filterState: "all" | ServiceOrderStatus = "all"
  filterPriority: "all" | ServiceOrderPriority = "all"
  filterStartDate = ""
  filterEndDate = ""
  searchTerm = ""
  currentPage = 1
  itemsPerPage = 10
  totalPages = 1
  readonly Math = Math

  showCreateServiceOrderModal = false
  showCreateServiceOrderQuoteModal = false
  isResubmittingServiceOrderQuote = false

  createServiceOrderForm: FormGroup
  createServiceOrderQuoteForm: FormGroup

  clients: ClientResponse[] = []
  documentTypes: DocumentTypeResponse[] = []
  products: Product[] = []
  services: Service[] = []
  diagnosticFeeService: Service | null = null
  serviceCategories: ServiceCategory[] = []
  private serviceCategoryMap = new Map<number, string>()
  quoteItems: ServiceOrderQuoteComposerItem[] = []
  createOrderQuoteItemsByItemIndex: Record<number, ServiceOrderQuoteComposerItem[]> = {}
  documentSearchMessage = ""
  documentSearchError = ""
  isSearchingPartner = false
  expandedServiceOrders = new Set<number>()

  isLoadingServiceOrders = false
  isCreatingServiceOrder = false
  isCreatingServiceOrderQuote = false
  isLoadingServiceOrderQuotes = false
  isLoadingServiceOrderQuoteDetail = false

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  readonly equipmentTypeOptions = Object.values(EquipmentType)
  readonly serviceTypeOptions = Object.values(ServiceType).filter((type) => type !== ServiceType.WARRANTY_SERVICE)
  readonly requestOriginOptions = Object.values(RequestOrigin)
  private readonly companyId = Number(config.defaultCompanyId ?? 1) || 1
  showServiceOrderQuotesModal = false
  serviceOrderQuotesError = ""
  serviceOrderItemQuotes: ServiceOrderQuote[] = []
  quoteServiceOrder: ServiceOrder | null = null
  serviceOrderQuotesServiceOrder: ServiceOrder | null = null
  serviceOrderQuotesServiceOrderItem: ServiceOrderItem | null = null
  selectedServiceOrderQuoteDetail: ServiceOrderQuote | null = null
  quoteDetailError = ""
  showWarrantyActionModal = false
  isLoadingWarrantyLines = false
  isCreatingWarrantyOrder = false
  warrantyActionError = ""
  warrantySourceServiceOrder: ServiceOrder | null = null
  warrantySourceItem: ServiceOrderItem | null = null
  warrantyCoverageLines: WarrantyCoverageLine[] = []
  selectedWarrantyLineIds = new Set<string>()
  createServiceOrderStep = 0
  readonly serviceOrderItemStatusEnum = ServiceOrderItemStatus
  productPriceLoading: Record<number, boolean> = {}
  createOrderProductPriceLoadingByItemIndex: Record<number, Record<number, boolean>> = {}

  // Modales de edición
  showEditServiceOrderModal = false
  showEditItemModal = false
  showReassignTechnicianModal = false
  editingServiceOrder: ServiceOrder | null = null
  editingItem: ServiceOrderItem | null = null
  reassigningItem: ServiceOrderItem | null = null
  editServiceOrderForm: FormGroup
  editItemForm: FormGroup
  reassignTechnicianForm: FormGroup
  technicians: { id: number; name: string }[] = []
  isSaving = false

  private readonly subscriptions = new Subscription()

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly serviceOrderItemService: ServiceOrderItemService,
    private readonly clientsService: ClientsApiService,
    private readonly productsService: ProductsService,
    private readonly serviceCatalog: ServiceService,
    private readonly serviceCategoryService: ServiceCategoryService,
    private readonly quoteService: ServiceOrderQuoteService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly documentTypesService: DocumentTypesApiService,
    private readonly usersApi: UsersApiService,
    private readonly pricingQuery: PricingQueryApiService,
  ) {
    this.createServiceOrderForm = this.createServiceOrderFormGroup()
    this.createServiceOrderQuoteForm = this.createServiceOrderQuoteFormGroup()
    this.editServiceOrderForm = this.createEditServiceOrderFormGroup()
    this.editItemForm = this.createEditItemFormGroup()
    this.reassignTechnicianForm = this.createReassignTechnicianFormGroup()
    const partnerChanges = this.createServiceOrderForm
      .get("clientId")
      ?.valueChanges.subscribe((value) => this.applyClientContact(value))
    if (partnerChanges) {
      this.subscriptions.add(partnerChanges)
    }
  }

  ngOnInit(): void {
    this.loadServiceOrders()
    this.loadClients()
    this.loadCatalogData()
    this.loadDocumentTypes()
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe()
  }

  private createServiceOrderFormGroup(): FormGroup {
    return this.formBuilder.group({
      requestOrigin: [RequestOrigin.CLIENT, Validators.required],
      workflowServiceType: [ServiceType.DIAGNOSIS, Validators.required],
      clientId: [null],
      documentNumber: ["", [Validators.required, Validators.pattern(/^[0-9]*$/)]],
      documentTypeId: [null, Validators.required],
      contactName: ["", Validators.required],
      contactPhone: ["", [Validators.required, Validators.pattern(/^[0-9+\-\s]*$/)]],
      contactEmail: ["", Validators.email],
      priority: [ServiceOrderPriority.MEDIUM, Validators.required],
      notes: [""],
      serviceOrderItems: this.formBuilder.array([this.createServiceOrderItemGroup()]),
    })
  }

  private createServiceOrderQuoteFormGroup(): FormGroup {
    return this.formBuilder.group({
      currency: ["PEN", Validators.required],
      notes: ["", Validators.maxLength(500)],
    })
  }

  private createEditServiceOrderFormGroup(): FormGroup {
    return this.formBuilder.group({
      contactName: ["", Validators.required],
      contactEmail: ["", Validators.email],
      contactPhone: ["", Validators.pattern(/^[0-9+\-\s]*$/)],
      priority: [ServiceOrderPriority.MEDIUM, Validators.required],
      notes: [""],
    })
  }

  private createEditItemFormGroup(): FormGroup {
    return this.formBuilder.group({
      equipmentType: [EquipmentType.LAPTOP, Validators.required],
      serviceType: [ServiceType.DIAGNOSIS, Validators.required],
      brand: [""],
      model: [""],
      serialNumber: [""],
      initialIssue: ["", Validators.required],
      accessories: [""],
    })
  }

  private createReassignTechnicianFormGroup(): FormGroup {
    return this.formBuilder.group({
      technicianId: [null, Validators.required],
    })
  }

  private loadServiceOrders(): void {
    this.isLoadingServiceOrders = true
    const expandedSnapshot = this.snapshotExpandedItems()
    this.serviceOrderService
      .findAll({ page: 1, limit: 50, includeItems: false })
      .pipe(finalize(() => (this.isLoadingServiceOrders = false)))
      .subscribe({
        next: ({ data }) => {
          this.serviceOrders = data ?? []
          this.restoreExpandedItems(expandedSnapshot)
          this.currentPage = 1
          this.applyFilters()
          this.refreshExpandedServiceOrders()
        },
        error: () => {
          this.serviceOrders = []
          this.filteredServiceOrders = []
          this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar las órdenes de servicio.")
        },
      })
  }

  private snapshotExpandedItems(): Map<number, ServiceOrderItem[]> {
    if (!this.expandedServiceOrders.size) return new Map()
    const snapshot = new Map<number, ServiceOrderItem[]>()
    this.serviceOrders
      .filter((serviceOrder) => this.expandedServiceOrders.has(serviceOrder.id))
      .forEach((serviceOrder) => {
        if (serviceOrder.items?.length) {
          snapshot.set(serviceOrder.id, serviceOrder.items)
        }
      })
    return snapshot
  }

  private restoreExpandedItems(snapshot: Map<number, ServiceOrderItem[]>): void {
    if (!snapshot.size) return
    this.serviceOrders.forEach((serviceOrder) => {
      const cached = snapshot.get(serviceOrder.id)
      if (cached?.length) {
        serviceOrder.items = cached
      }
    })
  }

  private refreshExpandedServiceOrders(): void {
    if (!this.expandedServiceOrders.size) return
    const expandedIds = new Set(this.expandedServiceOrders)
    this.serviceOrders
      .filter((serviceOrder) => expandedIds.has(serviceOrder.id))
      .forEach((serviceOrder) => {
        this.serviceOrderService.findOne(serviceOrder.id).subscribe({
          next: (full) => {
            serviceOrder.items = full.items ?? []
            serviceOrder.items.forEach((item) => this.loadItemServiceOrderQuoteTotal(item))
          },
          error: () => {
            // silencio: se puede reintentar al volver a expandir
          },
        })
      })
  }

  private loadClients(): void {
    this.clientsService
      .findAll({ page: 1, limit: 100, companyId: this.companyId })
      .subscribe({
        next: ({ data }) => {
          this.clients = data ?? []
        },
        error: () => {
          this.showMessage("warning", "fas fa-exclamation-triangle", "No pudimos cargar los clientes.")
        },
      })
  }

  private loadCatalogData(): void {
    this.productsService.list().subscribe({
      next: (items) => (this.products = items ?? []),
      error: () => this.showMessage("warning", "fas fa-warehouse", "No pudimos cargar los productos."),
    })

    this.serviceCatalog.findAll({ page: 1, limit: 100 }).subscribe({
      next: ({ data }) => {
        this.services = data ?? []
        this.diagnosticFeeService = this.services.find((svc) => svc.code === "DIAGNOSIS_FEE") ?? null
      },
      error: () => this.showMessage("warning", "fas fa-concierge-bell", "No pudimos cargar los servicios."),
    })

    this.serviceCategoryService.findAll({ page: 1, limit: 200 }).subscribe({
      next: ({ data }) => {
        this.serviceCategories = data ?? []
        this.serviceCategoryMap = new Map(
          this.serviceCategories.map((category) => [Number(category.id), category.name]),
        )
      },
      error: () => this.showMessage("warning", "fas fa-tags", "No pudimos cargar las categorías de servicios."),
    })
  }

  private loadDocumentTypes(): void {
    const documentTypeIdControl = this.createServiceOrderForm.get("documentTypeId")

    this.documentTypesService.findAll({ page: 1, limit: 50 }).subscribe(({ data }) => {
      this.documentTypes = data ?? []

      const documentTypeId = documentTypeIdControl?.value
      const documentNumber = (this.createServiceOrderForm.get("documentNumber")?.value ?? "").toString().trim()
      const hasNumber = documentNumber.length > 0
      if (!hasNumber) {
        documentTypeIdControl?.enable({ emitEvent: false })
      }

      if (!hasNumber) {
        this.createServiceOrderForm.patchValue({ documentTypeId: documentTypeId ?? null }, { emitEvent: false })
      }
    })
  }

  onDocumentNumberInput(): void {
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    const documentNumber = (this.createServiceOrderForm.get("documentNumber")?.value ?? "").trim()
    console.debug("[docNumberInput] value", documentNumber, "expected", this.expectedDocumentDigits)
    this.createServiceOrderForm.patchValue({ clientId: null }, { emitEvent: false })

    const docTypeControl = this.createServiceOrderForm.get("documentTypeId")
    if (documentNumber) {
      docTypeControl?.disable({ emitEvent: false })
    } else {
      docTypeControl?.enable({ emitEvent: false })
    }

    if (!documentNumber) {
      console.debug("[docNumberInput] empty, docType stays", this.createServiceOrderForm.get("documentTypeId")?.value)
      return
    }

    const docTypeId = this.createServiceOrderForm.get("documentTypeId")?.value
    const docType = this.documentTypes.find((type) => Number(type.id) === Number(docTypeId))
    if (!docType) {
      this.documentSearchError = "Selecciona primero el tipo de documento."
      this.setCustomerFieldsEnabled(true)
      return
    }

    if (docType.digits && documentNumber.length > docType.digits) {
      const trimmed = documentNumber.slice(0, docType.digits)
      console.debug("[docNumberInput] trim to", trimmed)
      this.createServiceOrderForm.get("documentNumber")?.setValue(trimmed)
      return
    }

    if (docType.digits && documentNumber.length === docType.digits) {
      this.lookupClientByDocument(documentNumber)
    }

    console.debug("[docNumberInput] docType after input", this.createServiceOrderForm.get("documentTypeId")?.value)
  }

  getSelectedDocumentTypeName(): string {
    const docTypeId = this.createServiceOrderForm.get("documentTypeId")?.value
    if (docTypeId) {
      const docType = this.documentTypes.find((type) => Number(type.id) === Number(docTypeId))
      if (docType) {
        return docType.name
      }
    }
    const clientId = this.createServiceOrderForm.get("clientId")?.value
    if (clientId) {
      const client = this.clients.find((item) => item.id === Number(clientId))
      if (client?.documentType?.name) {
        return client.documentType.name
      }
    }
    return "Sin asignar"
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase()
    const startDate = this.parseDateFilter(this.filterStartDate, false)
    const endDate = this.parseDateFilter(this.filterEndDate, true)
    this.filteredServiceOrders = this.serviceOrders.filter((serviceOrder) => {
      const matchState = this.filterState === "all" || serviceOrder.status === this.filterState
      const matchPriority = this.filterPriority === "all" || serviceOrder.priority === this.filterPriority
      const matchDate = this.matchesDateRange(serviceOrder.createdAt, startDate, endDate)
      const matchSearch =
        term === "" ||
        serviceOrder.code.toLowerCase().includes(term) ||
        this.getServiceOrderContactName(serviceOrder).toLowerCase().includes(term) ||
        this.getServiceOrderContactEmail(serviceOrder).toLowerCase().includes(term) ||
        this.getServiceOrderContactPhone(serviceOrder).toLowerCase().includes(term)
      return matchState && matchPriority && matchDate && matchSearch
    })
    this.updatePagination()
  }

  onSearchChange(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  onDocumentTypeChange(): void {
    const typeId = this.createServiceOrderForm.get("documentTypeId")?.value
    console.debug("[docTypeChange] typeId", typeId)
    this.updateExpectedDocumentDigits(typeId)
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.createServiceOrderForm.get("documentNumber")?.setValue("")
  }

  onFilterChange(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  private parseDateFilter(value: string, endOfDay: boolean): Date | null {
    if (!value) return null
    const parts = value.split("-").map((part) => Number(part))
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return null
    }
    const [year, month, day] = parts
    const date = new Date(year, month - 1, day)
    if (endOfDay) {
      date.setHours(23, 59, 59, 999)
    } else {
      date.setHours(0, 0, 0, 0)
    }
    return date
  }

  private matchesDateRange(value: string | Date | null | undefined, start: Date | null, end: Date | null): boolean {
    if (!start && !end) return true
    if (!value) return false
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false
    if (start && date < start) return false
    if (end && date > end) return false
    return true
  }

  private updatePagination(): void {
    const calculatedPages = Math.ceil(this.filteredServiceOrders.length / this.itemsPerPage) || 1
    this.totalPages = Math.max(1, calculatedPages)
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }
    if (this.currentPage < 1) {
      this.currentPage = 1
    }
    const start = (this.currentPage - 1) * this.itemsPerPage
    const end = start + this.itemsPerPage
    this.paginatedServiceOrders = this.filteredServiceOrders.slice(start, end)
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--
      this.updatePagination()
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.updatePagination()
    }
  }

  toggleServiceOrderExpansion(serviceOrderId: number, event?: Event): void {
    event?.stopPropagation()
    if (this.expandedServiceOrders.has(serviceOrderId)) {
      this.expandedServiceOrders.delete(serviceOrderId)
    } else {
      this.expandedServiceOrders.add(serviceOrderId)
      const serviceOrder = this.serviceOrders.find((t) => t.id === serviceOrderId)
      if (!serviceOrder) return
      if (!serviceOrder.items?.length) {
        this.serviceOrderService.findOne(serviceOrderId).subscribe({
          next: (full) => {
            serviceOrder.items = full.items ?? []
            serviceOrder.items.forEach((item) => this.loadItemServiceOrderQuoteTotal(item))
          },
          error: () => {
            this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar los equipos de la orden.")
          },
        })
        return
      }
      serviceOrder.items.forEach((item) => this.loadItemServiceOrderQuoteTotal(item))
    }
  }

  isServiceOrderExpanded(serviceOrderId: number): boolean {
    return this.expandedServiceOrders.has(serviceOrderId)
  }

  isFinalServiceOrder(serviceOrder?: ServiceOrder | null): boolean {
    if (!serviceOrder) return false
    return [ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELLED].includes(serviceOrder.status)
  }

  hasPendingServiceOrderQuoteItems(serviceOrder: ServiceOrder): boolean {
    if (serviceOrder.items?.length) {
      return serviceOrder.items.some((item) => item.status === ServiceOrderItemStatus.DIAGNOSED)
    }
    return (serviceOrder.pendingServiceOrderQuoteItemsCount ?? 0) > 0
  }

  hasRejectedServiceOrderQuoteItems(serviceOrder: ServiceOrder): boolean {
    if (serviceOrder.items?.length) {
      return serviceOrder.items.some((item) =>
        [ServiceOrderItemStatus.CLIENT_REJECTED, ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT].includes(item.status),
      )
    }
    return (serviceOrder.rejectedServiceOrderQuoteItemsCount ?? 0) > 0
  }

  hasPendingDeliveryItems(serviceOrder: ServiceOrder): boolean {
    if (serviceOrder.items?.length) {
      return serviceOrder.items.some((item) => item.status === ServiceOrderItemStatus.REPAIRED)
    }
    return (serviceOrder.pendingDeliveryItemsCount ?? 0) > 0
  }

  canMarkClientApproved(item: ServiceOrderItem): boolean {
    if (!item) return false
    return [ServiceOrderItemStatus.QUOTED, ServiceOrderItemStatus.SENT_TO_CLIENT, ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE].includes(item.status)
  }

  canMarkClientRejected(item: ServiceOrderItem): boolean {
    if (!item) return false
    return [ServiceOrderItemStatus.QUOTED, ServiceOrderItemStatus.SENT_TO_CLIENT, ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE].includes(item.status)
  }

  canDeliverItem(item: ServiceOrderItem): boolean {
    return !!item && item.status === ServiceOrderItemStatus.REPAIRED
  }

  canReassignTechnician(item?: ServiceOrderItem | null): boolean {
    if (!item) return false
    return ![
      ServiceOrderItemStatus.REPAIRED,
      ServiceOrderItemStatus.DELIVERED,
    ].includes(item.status)
  }

  markItemClientApproved(item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!item?.id) return
    const itemId = Number(item.id)

    const sendToClient$ = this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.SENT_TO_CLIENT)
    const awaitingClient$ = this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE)
    const approve$ = this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.CLIENT_APPROVED)

    sendToClient$
      .pipe(switchMap(() => awaitingClient$), switchMap(() => approve$))
      .subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Cotización aceptada correctamente.")
        this.loadServiceOrders()
      },
      error: () => {
        this.showMessage("danger", "fas fa-times-circle", "No pudimos marcar el item como aprobado por cliente.")
      },
    })
  }

  markItemClientRejected(item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!item?.id) return
    const itemId = Number(item.id)

    const sendToClient$ = this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.SENT_TO_CLIENT)
    const awaitingClient$ = this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE)
    const reject$ = this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT)

    sendToClient$
      .pipe(switchMap(() => awaitingClient$), switchMap(() => reject$))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización rechazada correctamente.")
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos marcar el item como rechazado por cliente.")
        },
      })
  }

  deliverItem(item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!item?.id) return
    this.serviceOrderItemService.changeStatus(Number(item.id), ServiceOrderItemStatus.DELIVERED).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Entrega registrada.")
        this.loadServiceOrders()
      },
      error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar la entrega."),
    })
  }

  canOpenWarrantyAction(serviceOrder: ServiceOrder, item: ServiceOrderItem): boolean {
    if (!serviceOrder || !item) return false
    if (serviceOrder.status !== ServiceOrderStatus.COMPLETED) return false
    if (!serviceOrder.clientId) return false
    if (item.serviceType === ServiceType.WARRANTY_SERVICE) return false
    return Number(item.id) > 0
  }

  openWarrantyActionModal(serviceOrder: ServiceOrder, item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenWarrantyAction(serviceOrder, item)) {
      this.showMessage("warning", "fas fa-info-circle", "Este equipo no es elegible para registrar garantía.")
      return
    }

    this.showWarrantyActionModal = true
    this.isLoadingWarrantyLines = true
    this.warrantyActionError = ""
    this.warrantySourceServiceOrder = serviceOrder
    this.warrantySourceItem = item
    this.warrantyCoverageLines = []
    this.selectedWarrantyLineIds.clear()

    this.quoteService
      .findAll({ page: 1, limit: 50, serviceOrderItemId: Number(item.id) })
      .pipe(finalize(() => (this.isLoadingWarrantyLines = false)))
      .subscribe({
        next: ({ data }) => {
          const quotes = (data ?? []).filter(
            (quote) => quote.status === ServiceOrderQuoteStatus.CLIENT_APPROVED || Boolean(quote.clientApprovedAt),
          )
          if (!quotes.length) {
            this.warrantyActionError = "El equipo no tiene cotizaciones aprobadas para evaluar garantía."
            return
          }

          const sourceQuote = [...quotes].sort((a, b) => {
            const sequenceDiff = Number(b.sequenceNumber ?? 0) - Number(a.sequenceNumber ?? 0)
            if (sequenceDiff !== 0) return sequenceDiff
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })[0]

          const baseDate = sourceQuote.clientApprovedAt
            ? new Date(sourceQuote.clientApprovedAt)
            : new Date(sourceQuote.createdAt)

          const lines: WarrantyCoverageLine[] = []
          sourceQuote.serviceItems?.forEach((serviceLine, index) => {
            const service = this.services.find((entry) => Number(entry.id) === Number(serviceLine.serviceId))
            const warrantyDays = Math.max(0, Number(service?.warrantyDays ?? 0))
            const coverageUntil = warrantyDays > 0 ? this.addDays(baseDate, warrantyDays) : null
            const selectable = this.isCoverageActive(coverageUntil) && warrantyDays > 0
            lines.push({
              id: `service-${serviceLine.id ?? index}`,
              kind: "service",
              label: serviceLine.serviceNameSnapshot || this.getServiceLabel(serviceLine.serviceId),
              serviceId: this.toNumericId(serviceLine.serviceId),
              warrantyDays,
              coverageUntil,
              selectable,
              reason: selectable ? undefined : this.getWarrantyDisabledReason(coverageUntil, warrantyDays, "service"),
            })
          })

          sourceQuote.productItems?.forEach((productLine, index) => {
            lines.push({
              id: `product-${productLine.id ?? index}`,
              kind: "product",
              label: productLine.productNameSnapshot || this.getProductLabel(productLine.productId),
              productId: this.toNumericId(productLine.productId),
              quantity: Number(productLine.quantity ?? 1),
              unitPrice: Number(productLine.unitPrice ?? 0),
              warrantyDays: 0,
              coverageUntil: null,
              selectable: false,
              reason: "Los productos aún no tienen política de garantía configurada.",
            })
          })

          this.warrantyCoverageLines = lines
          if (!lines.length) {
            this.warrantyActionError = "No se encontraron líneas de servicio o producto para esta garantía."
          }
        },
        error: () => {
          this.warrantyActionError = "No pudimos cargar la cobertura de garantía del equipo."
        },
      })
  }

  closeWarrantyActionModal(): void {
    this.showWarrantyActionModal = false
    this.isLoadingWarrantyLines = false
    this.isCreatingWarrantyOrder = false
    this.warrantyActionError = ""
    this.warrantySourceServiceOrder = null
    this.warrantySourceItem = null
    this.warrantyCoverageLines = []
    this.selectedWarrantyLineIds.clear()
  }

  toggleWarrantyCoverageSelection(line: WarrantyCoverageLine): void {
    if (!line.selectable) return
    if (this.selectedWarrantyLineIds.has(line.id)) {
      this.selectedWarrantyLineIds.delete(line.id)
      return
    }
    this.selectedWarrantyLineIds.add(line.id)
  }

  isWarrantyCoverageSelected(lineId: string): boolean {
    return this.selectedWarrantyLineIds.has(lineId)
  }

  get warrantySelectableLinesCount(): number {
    return this.warrantyCoverageLines.filter((line) => line.selectable).length
  }

  get warrantySelectedLinesCount(): number {
    return this.selectedWarrantyLineIds.size
  }

  createWarrantyServiceOrderFromSelection(): void {
    if (!this.warrantySourceServiceOrder || !this.warrantySourceItem) {
      this.warrantyActionError = "No encontramos el equipo origen para registrar la garantía."
      return
    }
    if (!this.warrantySourceServiceOrder.clientId) {
      this.warrantyActionError = "La orden origen no tiene cliente asociado."
      return
    }
    if (!this.selectedWarrantyLineIds.size) {
      this.warrantyActionError = "Selecciona al menos una línea vigente para continuar."
      return
    }

    const selectedLines = this.warrantyCoverageLines.filter((line) => this.selectedWarrantyLineIds.has(line.id))
    const warrantyNotes = selectedLines.map((line) => `- ${line.label}`).join("\n")
    const sourceOrder = this.warrantySourceServiceOrder
    const sourceItem = this.warrantySourceItem

    const payload: ServiceOrderSaveRequest = {
      requestOrigin: RequestOrigin.CLIENT,
      clientId: Number(sourceOrder.clientId),
      priority: sourceOrder.priority,
      notes: `Garantía derivada de ${sourceOrder.code} / equipo #${sourceItem.itemNumber}\nLíneas:\n${warrantyNotes}`,
      items: [
        {
          equipmentType: sourceItem.equipmentType,
          serviceType: ServiceType.WARRANTY_SERVICE,
          brand: sourceItem.brand,
          model: sourceItem.model,
          serialNumber: sourceItem.serialNumber,
          initialIssue: `Garantía de ${sourceOrder.code} / equipo #${sourceItem.itemNumber}`,
          accessories: sourceItem.accessories,
        },
      ],
    }

    this.isCreatingWarrantyOrder = true
    this.warrantyActionError = ""

    this.serviceOrderService
      .create(payload)
      .pipe(
        switchMap((createdOrder) => {
          const createdItem = createdOrder.items?.[0]
          if (!createdItem) {
            return of({ createdOrder, quoteCreated: false })
          }

          const quoteItems: ServiceOrderQuoteComposerItem[] = selectedLines.map((line) =>
            line.kind === "service"
              ? {
                  id: Date.now() + Math.random(),
                  type: "service",
                  serviceId: line.serviceId ?? null,
                  notes: "Línea generada por flujo de garantía",
                }
              : {
                  id: Date.now() + Math.random(),
                  type: "product",
                  productId: line.productId ?? null,
                  quantity: Math.max(1, Number(line.quantity ?? 1)),
                  unitPrice: Number(line.unitPrice ?? 0),
                  requiresPurchase: false,
                  notes: "Línea generada por flujo de garantía",
                },
          )

          return this.quoteService
            .create(
              this.buildServiceOrderQuotePayload(
                Number(createdItem.id),
                quoteItems,
                `Cotización inicial generada desde garantía de ${sourceOrder.code}`,
              ),
            )
            .pipe(
              map(() => ({ createdOrder, quoteCreated: true })),
              catchError(() => of({ createdOrder, quoteCreated: false })),
            )
        }),
        finalize(() => (this.isCreatingWarrantyOrder = false)),
      )
      .subscribe({
        next: ({ quoteCreated }) => {
          if (quoteCreated) {
            this.showMessage("success", "fas fa-check-circle", "Orden de garantía y cotización inicial creadas.")
          } else {
            this.showMessage(
              "success",
              "fas fa-check-circle",
              "Orden de garantía creada. La cotización inicial deberá registrarse manualmente.",
            )
          }
          this.closeWarrantyActionModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.warrantyActionError = "No pudimos crear la orden de garantía."
        },
      })
  }

  openCreateServiceOrderModal(): void {
    this.showCreateServiceOrderModal = true
    this.createServiceOrderStep = 0
    this.createServiceOrderForm.reset({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: null,
      documentNumber: "",
      documentTypeId: null,
      priority: ServiceOrderPriority.MEDIUM,
      notes: "",
    })
    while (this.serviceOrderItems.length > 0) {
      this.serviceOrderItems.removeAt(0)
    }
    this.serviceOrderItems.push(this.createServiceOrderItemGroup())
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.isSearchingPartner = false
    this.createOrderQuoteItemsByItemIndex = {}
    this.createOrderProductPriceLoadingByItemIndex = {}
    this.setCustomerFieldsEnabled(true)
  }

  closeCreateServiceOrderModal(): void {
    this.showCreateServiceOrderModal = false
    this.createServiceOrderStep = 0
    this.createServiceOrderForm.reset()
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.isSearchingPartner = false
    this.createOrderQuoteItemsByItemIndex = {}
    this.createOrderProductPriceLoadingByItemIndex = {}
    this.setCustomerFieldsEnabled(true)
  }

  private applyClientContact(partnerId: number | null): void {
    if (this.isInternalRequestOrigin()) {
      this.createServiceOrderForm.patchValue(
        { clientId: null, contactName: "", contactEmail: "", contactPhone: "" },
        { emitEvent: false },
      )
      return
    }
    if (!partnerId) {
      this.createServiceOrderForm.patchValue(
        { contactName: "", contactEmail: "", contactPhone: "" },
        { emitEvent: false },
      )
      this.setCustomerFieldsEnabled(true)
      return
    }
    const partner = this.clients.find((bp) => bp.id === Number(partnerId))
    if (!partner) return
    this.applyPartnerData(partner)
  }

  submitCreateServiceOrder(): void {
    if (this.createServiceOrderForm.invalid) {
      this.markFormGroupAsTouched(this.createServiceOrderForm)
      return
    }

    const formValue = this.createServiceOrderForm.getRawValue()
    const itemsPayload = this.serviceOrderItems.controls.map((control) => this.buildServiceOrderItemPayload(control as FormGroup))
    if (!itemsPayload.length) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Agrega al menos un equipo.")
      return
    }

    if (this.serviceOrderItems.controls.some((group) => group.invalid)) {
      this.serviceOrderItems.controls.forEach((group) => this.markFormGroupAsTouched(group as FormGroup))
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa la información de cada equipo.")
      return
    }

    if (!this.validateCreateServiceOrderInitialQuote()) {
      return
    }

    this.isCreatingServiceOrder = true
    this.resolveClientId(formValue)
      .pipe(
        switchMap((clientId) => {
          const payload: ServiceOrderSaveRequest = {
            requestOrigin: formValue.requestOrigin,
            clientId,
            priority: formValue.priority,
            notes: formValue.notes ?? null,
            items: itemsPayload,
          }
          return this.serviceOrderService.create(payload)
        }),
        switchMap((serviceOrder) => this.createInitialQuotesForStandardService(serviceOrder)),
        finalize(() => (this.isCreatingServiceOrder = false)),
      )
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Orden de servicio creada correctamente.")
          this.closeCreateServiceOrderModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos crear la orden.")
        },
      })
  }

  private resolveClientId(formValue: Record<string, any>) {
    if (formValue["requestOrigin"] === RequestOrigin.INTERNAL) {
      return of(null)
    }

    const workflowServiceType = this.getSelectedWorkflowServiceType()
    const existingPartnerId = Number(this.createServiceOrderForm.get("clientId")?.value)
    if (existingPartnerId) {
      return of(existingPartnerId)
    }

    const documentNumber = String(this.createServiceOrderForm.get("documentNumber")?.value ?? "").trim()
    const documentTypeId = Number(this.createServiceOrderForm.get("documentTypeId")?.value)
    const contactName = String(this.createServiceOrderForm.get("contactName")?.value ?? "").trim()
    const contactPhone = String(this.createServiceOrderForm.get("contactPhone")?.value ?? "").trim()

    if (!documentNumber || !documentTypeId || !contactName || !contactPhone) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "Completa el documento, nombre y teléfono para registrar al cliente.",
      )
      return throwError(() => new Error("Datos de cliente incompletos"))
    }

    if (!(documentNumber.length === 8 || documentNumber.length === 11)) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "El documento debe tener 8 (DNI) o 11 (RUC) dígitos.",
      )
      return throwError(() => new Error("Longitud inválida"))
    }

    const payload: ClientSaveRequest = {
      companyId: this.companyId,
      name: contactName,
      tradeName: contactName,
      documentTypeId,
      documentNumber,
      email: this.createServiceOrderForm.get("contactEmail")?.value ?? null,
      phone: this.createServiceOrderForm.get("contactPhone")?.value ?? null,
      address: null,
      city: null,
      country: null,
    }

    return this.clientsService.create(payload).pipe(
      map((partner) => ({
        ...partner,
        id: Number(partner.id),
        companyId: Number(partner.companyId),
        documentTypeId: Number(partner.documentTypeId),
      })),
      tap((partner) => {
        this.clients = [partner, ...this.clients]
        this.createServiceOrderForm.patchValue({ clientId: Number(partner.id) })
        this.documentSearchMessage = "Cliente creado correctamente."
        this.documentSearchError = ""
      }),
  map((partner) => Number(partner.id)),
    )
  }

  private lookupClientByDocument(documentNumber: string): void {
    const normalizedDoc = documentNumber.trim()
    const docTypeId = this.createServiceOrderForm.get("documentTypeId")?.value

    const localMatch = this.clients.find(
      (partner) => partner.documentNumber?.trim() === normalizedDoc && Number(partner.documentTypeId) === Number(docTypeId),
    )
    if (localMatch) {
      this.applyPartnerData(localMatch)
      return
    }

    this.isSearchingPartner = true
    this.clientsService
      .findAll({ page: 1, limit: 1, documentNumber: normalizedDoc, documentTypeId: docTypeId, companyId: this.companyId })
      .pipe(finalize(() => (this.isSearchingPartner = false)))
      .subscribe({
        next: ({ data }) => {
          const partner = data?.find((entry) => entry.documentNumber?.trim() === normalizedDoc)
          if (partner) {
            this.applyPartnerData(partner)
          } else {
            this.handlePartnerNotFound()
          }
        },
        error: () => this.handlePartnerNotFound(),
      })
  }

  private applyPartnerData(partner: ClientResponse): void {
    const documentTypeId = partner.documentTypeId ?? partner.documentType?.id ?? null

    this.createServiceOrderForm.patchValue(
      {
        clientId: Number(partner.id),
        documentNumber: partner.documentNumber ?? "",
        documentTypeId: documentTypeId,
        contactName: partner.name ?? partner.tradeName ?? partner.documentNumber ?? "",
        contactEmail: partner.email ?? "",
        contactPhone: partner.phone ?? "",
      },
      { emitEvent: false },
    )

    this.updateExpectedDocumentDigits(documentTypeId)
    this.documentSearchMessage = "Cliente encontrado. Datos completados automáticamente."
    this.documentSearchError = ""
    this.setCustomerFieldsEnabled(false)

    if (!partner.phone) {
      const phoneControl = this.createServiceOrderForm.get("contactPhone")
      phoneControl?.enable({ emitEvent: false })
    }
  }

  private updateExpectedDocumentDigits(documentTypeId: number | null): void {
    const docType = this.documentTypes.find((type) => Number(type.id) === Number(documentTypeId))
    console.debug("[updateDigits] docTypeId", documentTypeId, "digits", docType?.digits)
    this.expectedDocumentDigits = docType?.digits ?? null

    const control = this.createServiceOrderForm.get("documentNumber")
    if (docType?.digits) {
      const trimmed = (control?.value ?? "").toString().slice(0, docType.digits)
      control?.setValue(trimmed, { emitEvent: false })
      control?.setValidators([
        Validators.required,
        Validators.minLength(docType.digits),
        Validators.maxLength(docType.digits),
        Validators.pattern(`^\\d{${docType.digits}}$`),
      ])
    } else {
      control?.clearValidators()
      control?.setValidators([Validators.required])
    }
    control?.updateValueAndValidity({ emitEvent: false })
  }

  private handlePartnerNotFound(): void {
    this.documentSearchMessage = ""
    this.documentSearchError =
      "No encontramos un cliente con ese documento y tipo. Completa los datos para registrarlo al crear la orden."
    this.createServiceOrderForm.patchValue(
      {
      clientId: null,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      },
      { emitEvent: false },
    )
    this.setCustomerFieldsEnabled(true)
  }

  private buildServiceOrderItemPayload(group: FormGroup): ServiceOrderItemSaveRequest {
    const workflowServiceType = this.createServiceOrderForm.get("workflowServiceType")?.value ?? ServiceType.DIAGNOSIS
    return {
      equipmentType: group.get("equipmentType")?.value,
      serviceType: workflowServiceType,
      brand: group.get("brand")?.value ?? null,
      model: group.get("model")?.value ?? null,
      serialNumber: group.get("serialNumber")?.value ?? null,
      initialIssue: group.get("initialIssue")?.value,
      accessories: group.get("accessories")?.value ?? null,
    }
  }

  openCreateServiceOrderQuoteModal(serviceOrder: ServiceOrder, item?: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!serviceOrder.items?.length) {
      this.showMessage("warning", "fas fa-info-circle", "La orden no tiene equipos para cotizar.")
      return
    }
    this.quoteServiceOrder = serviceOrder
    const targetItem = item ?? serviceOrder.items[0]
    if (!targetItem) {
      this.showMessage("warning", "fas fa-info-circle", "Selecciona un equipo válido para cotizar.")
      return
    }
    this.selectedServiceOrderItem = targetItem
    this.selectedServiceOrderItemId = Number(targetItem.id)
    this.loadCurrentDiagnosis(this.selectedServiceOrderItemId)
    this.quoteItems = []
    this.isResubmittingServiceOrderQuote = false
    this.selectedServiceOrderQuoteDetail = null
    this.showCreateServiceOrderQuoteModal = true
    this.createServiceOrderQuoteForm.reset({ currency: "PEN", notes: "" })
  }

  closeCreateServiceOrderQuoteModal(): void {
    this.showCreateServiceOrderQuoteModal = false
    this.createServiceOrderQuoteForm.reset()
    this.quoteItems = []
    this.selectedServiceOrderItemId = null
    this.selectedServiceOrderItem = null
    this.quoteServiceOrder = null
    this.isResubmittingServiceOrderQuote = false
    this.selectedServiceOrderQuoteDetail = null
    this.currentDiagnosis = null
  }

  addProductToServiceOrderQuote(): void {
    this.quoteItems.push(this.createProductComposer())
  }

  addServiceToServiceOrderQuote(): void {
    this.quoteItems.push(this.createServiceComposer())
  }

  onProductSelected(item: ServiceOrderQuoteProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (item.productId) {
      this.fetchProductPrice(item)
    } else {
      item.unitPrice = 0
    }
  }

  onProductQuantityChange(item: ServiceOrderQuoteProductComposer, value: any): void {
    const qty = Number(value) || 1
    item.quantity = qty
    if (item.productId) {
      this.fetchProductPrice(item)
    }
  }

  fetchProductPrice(item: ServiceOrderQuoteProductComposer): void {
    if (!item.productId) {
      return
    }
    const qty = Math.max(1, Number(item.quantity) || 1)
    this.productPriceLoading[item.id] = true
    this.pricingQuery
      .getProductPrice(item.productId, qty)
      .pipe(finalize(() => (this.productPriceLoading[item.id] = false)))
      .subscribe({
        next: (res) => {
          const unitPrice = res.finalUnitPrice ?? res.baseUnitPrice ?? 0
          item.unitPrice = unitPrice
        },
        error: () => {
          this.showMessage("warning", "fas fa-dollar-sign", "No pudimos obtener el precio del producto.")
          item.unitPrice = item.unitPrice || 0
        },
      })
  }

  isProductPriceLoading(itemId: number): boolean {
    return Boolean(this.productPriceLoading[itemId])
  }

  removeServiceOrderQuoteItem(index: number, collection: ServiceOrderQuoteComposerItem[] = this.quoteItems): void {
    collection.splice(index, 1)
  }

  calculateItemSubtotal(item: ServiceOrderQuoteComposerItem): number {
    if (this.isWarrantyServiceOrderQuoteContext()) {
      return 0
    }
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    if (this.isNonBillableServiceContext()) {
      return 0
    }
    const service = this.services.find((svc) => Number(svc.id) === Number(item.serviceId))
    const servicePrice = service?.price ?? 0
    return Number(servicePrice)
  }

  calculateServiceOrderQuoteTotal(): number {
    if (this.isWarrantyServiceOrderQuoteContext()) {
      return 0
    }
    return this.quoteItems.reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
  }

  isWarrantyServiceOrderQuoteContext(): boolean {
    return this.selectedServiceOrderItem?.serviceType === ServiceType.WARRANTY_SERVICE
  }

  isNonBillableServiceContext(): boolean {
    return [ServiceType.CUSTOMER_SERVICE, ServiceType.WARRANTY_SERVICE].includes(
      this.selectedServiceOrderItem?.serviceType as ServiceType,
    )
  }

  submitCreateServiceOrderQuote(): void {
    if (this.isResubmittingServiceOrderQuote) {
      this.submitResubmitServiceOrderQuote()
      return
    }

    if (this.createServiceOrderQuoteForm.invalid || this.quoteItems.length === 0 || !this.selectedServiceOrderItemId) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Selecciona el item y agrega productos o servicios.")
      return
    }

    const payload = this.buildServiceOrderQuotePayload(
      Number(this.selectedServiceOrderItemId),
      this.quoteItems,
      this.createServiceOrderQuoteForm.get("notes")?.value,
    )

    if ((payload.products?.length ?? 0) === 0 && (payload.services?.length ?? 0) === 0) {
      this.showMessage("warning", "fas fa-info-circle", "Agrega por lo menos un producto o servicio válido.")
      return
    }

    this.isCreatingServiceOrderQuote = true
    this.quoteService
      .create(payload)
      .pipe(finalize(() => (this.isCreatingServiceOrderQuote = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización registrada correctamente.")
          this.closeCreateServiceOrderQuoteModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos crear la cotización.")
        },
      })
  }

  viewItemServiceOrderQuotes(serviceOrder: ServiceOrder, item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    this.serviceOrderQuotesServiceOrder = serviceOrder
    this.serviceOrderQuotesServiceOrderItem = item
    this.serviceOrderItemQuotes = []
    this.serviceOrderQuotesError = ""
    this.quoteDetailError = ""
    this.selectedServiceOrderQuoteDetail = null
    this.showServiceOrderQuotesModal = true
    this.isLoadingServiceOrderQuotes = true

    this.quoteService
      .findAll({ page: 1, limit: 20, serviceOrderItemId: Number(item.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderQuotes = false)))
      .subscribe({
        next: ({ data }) => {
          this.serviceOrderItemQuotes = data ?? []
        },
        error: () => {
          this.serviceOrderQuotesError = "No pudimos cargar las cotizaciones de este item."
        },
      })
  }

  refreshServiceOrderQuotesForCurrentItem(): void {
    if (!this.serviceOrderQuotesServiceOrderItem) return
    this.isLoadingServiceOrderQuotes = true
    this.quoteService
      .findAll({ page: 1, limit: 20, serviceOrderItemId: Number(this.serviceOrderQuotesServiceOrderItem.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderQuotes = false)))
      .subscribe({
        next: ({ data }) => {
          this.serviceOrderItemQuotes = data ?? []
          if (this.selectedServiceOrderQuoteDetail) {
            const updated = this.serviceOrderItemQuotes.find((q) => q.id === this.selectedServiceOrderQuoteDetail?.id)
            if (updated) this.selectedServiceOrderQuoteDetail = updated
          }
        },
        error: () => {
          this.serviceOrderQuotesError = "No pudimos actualizar las cotizaciones de este item."
        },
      })
  }

  refreshServiceOrderQuoteDetail(quoteId: number): void {
    this.isLoadingServiceOrderQuoteDetail = true
    this.quoteService
      .findOne(quoteId)
      .pipe(finalize(() => (this.isLoadingServiceOrderQuoteDetail = false)))
      .subscribe({
        next: (updatedServiceOrderQuote) => {
          const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === updatedServiceOrderQuote.id)
          if (index >= 0) {
            this.serviceOrderItemQuotes[index] = updatedServiceOrderQuote
          }
          if (this.selectedServiceOrderQuoteDetail?.id === updatedServiceOrderQuote.id) {
            this.selectedServiceOrderQuoteDetail = updatedServiceOrderQuote
          }
        },
        error: () => {
          this.quoteDetailError = "No pudimos refrescar el detalle de la cotización."
        },
      })
  }

  applyServiceOrderQuoteStatusFromError(quoteId: number, error: any): boolean {
    const rawMessage = error?.error?.message ?? error?.message ?? ""
    const message =
      Array.isArray(rawMessage)
        ? rawMessage.join(" ").toLowerCase()
        : JSON.stringify(error?.error ?? rawMessage ?? "").toLowerCase()
    let nextStatus: ServiceOrderQuoteStatus | null = null
    if (message.includes("already rejected by client")) {
      nextStatus = ServiceOrderQuoteStatus.CLIENT_REJECTED
    } else if (message.includes("already approved by client")) {
      nextStatus = ServiceOrderQuoteStatus.CLIENT_APPROVED
    }
    if (!nextStatus) return false
    const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === quoteId)
    if (index >= 0) {
      this.serviceOrderItemQuotes[index] = { ...this.serviceOrderItemQuotes[index], status: nextStatus }
    }
    if (this.selectedServiceOrderQuoteDetail?.id === quoteId) {
      this.selectedServiceOrderQuoteDetail = { ...this.selectedServiceOrderQuoteDetail, status: nextStatus }
    }
    return true
  }

  closeServiceOrderQuotesModal(): void {
    this.showServiceOrderQuotesModal = false
    this.serviceOrderItemQuotes = []
    this.serviceOrderQuotesError = ""
    this.serviceOrderQuotesServiceOrder = null
    this.serviceOrderQuotesServiceOrderItem = null
    this.selectedServiceOrderQuoteDetail = null
    this.quoteDetailError = ""
  }

  getPriorityBadgeClass(priority: ServiceOrderPriority): string {
    switch (priority) {
      case ServiceOrderPriority.HIGH:
        return "badge-danger"
      case ServiceOrderPriority.MEDIUM:
        return "badge-warning"
      case ServiceOrderPriority.LOW:
        return "badge-info"
      default:
        return "badge-secondary"
    }
  }

  getDaysUntilDeadline(deadline: string | Date | null | undefined): number {
    if (!deadline) return 0
    const deadlineDate = new Date(deadline)
    if (Number.isNaN(deadlineDate.getTime())) return 0
    const diffTime = deadlineDate.getTime() - Date.now()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  getServiceOrderItemLabel(item: ServiceOrderItem): string {
    const parts = [
      `Equipo #${item.itemNumber}`,
      this.getEquipmentTypeLabel(item.equipmentType),
      item.brand || null,
      item.model || null,
      item.serialNumber ? `SN ${item.serialNumber}` : null,
    ].filter(Boolean)
    return parts.join(" · ")
  }

  getServiceOrderStatusLabel(status: ServiceOrderStatus): string {
    return SERVICE_ORDER_STATUS_LABELS[status] ?? status
  }

  getServiceOrderContactName(serviceOrder: ServiceOrder): string {
    return (
      serviceOrder.clientSnapshotName ??
      serviceOrder.client?.name ??
      serviceOrder.contactName ??
      ""
    )
  }

  getServiceOrderContactEmail(serviceOrder: ServiceOrder): string {
    return (
      serviceOrder.clientSnapshotEmail ??
      serviceOrder.client?.email ??
      serviceOrder.contactEmail ??
      ""
    )
  }

  getServiceOrderContactPhone(serviceOrder: ServiceOrder): string {
    return (
      serviceOrder.clientSnapshotPhone ??
      serviceOrder.client?.phone ??
      serviceOrder.contactPhone ??
      ""
    )
  }

  getPriorityLabel(priority: ServiceOrderPriority): string {
    return SERVICE_ORDER_PRIORITY_LABELS[priority] ?? priority
  }

  private loadItemServiceOrderQuoteTotal(item: ServiceOrderItem): void {
    const itemId = Number(item.id)
    if (!itemId || this.itemServiceOrderQuoteTotals[itemId]) {
      return
    }

    this.quoteService
      .findAll({ page: 1, limit: 5, serviceOrderItemId: itemId })
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          const approved = list.find((q: ServiceOrderQuote) => q.status === ServiceOrderQuoteStatus.CLIENT_APPROVED)
          const candidate = approved ?? list[0]
          if (candidate?.totalAmount !== undefined) {
            this.itemServiceOrderQuoteTotals[itemId] = Number(candidate.totalAmount) || 0
          }
        },
        error: () => {
          // silencio: si falla, se seguirá mostrando el fallback
        },
      })
  }

  getServiceOrderItemServiceOrderQuoteTotal(item: ServiceOrderItem): number {
    const cached = this.itemServiceOrderQuoteTotals[item.id]
    if (cached !== undefined) return cached
    const amount = (item as any).totalAmount ?? item.finalAmount ?? 0
    return Number(amount) || 0
  }

  isServiceOrderQuoteApproved(item: ServiceOrderItem): boolean {
    return [
      ServiceOrderItemStatus.CLIENT_APPROVED,
      ServiceOrderItemStatus.READY_FOR_REPAIR,
      ServiceOrderItemStatus.IN_REPAIR,
      ServiceOrderItemStatus.REPAIRED,
      ServiceOrderItemStatus.DELIVERED,
    ].includes(item.status)
  }

  getServiceOrderItemServiceOrderQuoteStatusText(item: ServiceOrderItem): string {
    switch (item.status) {
      case ServiceOrderItemStatus.CLIENT_REJECTED:
      case ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT:
        return "Rechazada por cliente"
      case ServiceOrderItemStatus.SENT_TO_CLIENT:
      case ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE:
        return "Enviada al cliente"
      case ServiceOrderItemStatus.QUOTED:
        return "Lista para enviar"
      case ServiceOrderItemStatus.DIAGNOSED:
        return "Pendiente de cotización"
      case ServiceOrderItemStatus.QUOTE_EXPIRED:
        return "Cotización expirada"
      default:
        return "Sin cotización"
    }
  }

  getServiceOrderQuotedTotal(serviceOrder: ServiceOrder): number {
    if (serviceOrder.items?.length) {
      const sum = serviceOrder.items.reduce((acc, item) => acc + this.getServiceOrderItemServiceOrderQuoteTotal(item), 0)
      if (sum > 0) return sum
    }
    return serviceOrder.totalServiceOrderQuotedAmount ?? 0
  }

  getServiceOrderItemStatusLabel(status: ServiceOrderItemStatus): string {
    return SERVICE_ORDER_ITEM_STATUS_LABELS[status] ?? status
  }

  canServiceOrderQuoteItem(item: ServiceOrderItem): boolean {
    if (!item) return false
    if ([ServiceType.DIAGNOSIS, ServiceType.CUSTOMER_SERVICE].includes(item.serviceType)) {
      return item.status === ServiceOrderItemStatus.DIAGNOSED
    }
    if (item.serviceType === ServiceType.STANDARD_SERVICE) {
      return [ServiceOrderItemStatus.ASSIGNED, ServiceOrderItemStatus.QUOTED, ServiceOrderItemStatus.QUOTE_EXPIRED].includes(
        item.status,
      )
    }
    return false
  }

  getEquipmentTypeLabel(type: EquipmentType): string {
    return EQUIPMENT_TYPE_LABELS[type] ?? type
  }

  getServiceTypeLabel(type: ServiceType): string {
    return SERVICE_TYPE_LABELS[type] ?? type
  }

  productSearchFn = (term: string, item: Product): boolean => {
    if (!term) {
      return true
    }
    const normalized = term.toLowerCase()
    return (
      (item.name ?? "").toLowerCase().includes(normalized) ||
      (item.sku ?? "").toLowerCase().includes(normalized) ||
      (item.description ?? "").toLowerCase().includes(normalized)
    )
  }

  serviceSearchFn = (term: string, item: Service): boolean => {
    if (!term) {
      return true
    }
    const normalized = term.toLowerCase()
    return (
      (item.name ?? "").toLowerCase().includes(normalized) ||
      (item.code ?? "").toLowerCase().includes(normalized) ||
      (item.description ?? "").toLowerCase().includes(normalized)
    )
  }

  get runningServiceOrdersCount(): number {
    return this.serviceOrders.filter((serviceOrder) =>
      [ServiceOrderStatus.OPEN, ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.PARTIALLY_COMPLETED].includes(serviceOrder.status),
    ).length
  }

  get highPriorityServiceOrdersCount(): number {
    return this.serviceOrders.filter((serviceOrder) => serviceOrder.priority === ServiceOrderPriority.HIGH).length
  }

  get diagnosticPendingServiceOrderQuotesCount(): number {
    return this.serviceOrders.reduce((total, serviceOrder) => {
      const items = serviceOrder.items ?? []
      const pending = items.filter(
        (item) => item.status === ServiceOrderItemStatus.DIAGNOSED && !item.quotedAt && !item.quoteApprovedAt,
      ).length
      return total + pending
    }, 0)
  }

  get sentServiceOrderQuotesCount(): number {
    return this.serviceOrderItemQuotes.filter((q) => Boolean(q.sentToClientAt)).length
  }

  get approvedServiceOrderQuotesCount(): number {
    return this.serviceOrderItemQuotes.filter((q) => Boolean(q.clientApprovedAt)).length
  }

  private toNumericId(value: unknown): number | null {
    if (value === null || value === undefined) return null
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    if (typeof value === "object") {
      const candidate = (value as any).id ?? (value as any).serviceId ?? (value as any).productId
      return this.toNumericId(candidate)
    }
    return null
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

  private markFormGroupAsTouched(control: FormGroup | FormArray): void {
    if (control instanceof FormArray) {
      control.controls.forEach((child) => this.markFormGroupAsTouched(child as FormGroup | FormArray))
      return
    }

    Object.keys(control.controls).forEach((key) => {
      const child = control.get(key)
      if (child instanceof FormGroup || child instanceof FormArray) {
        this.markFormGroupAsTouched(child)
      } else {
        child?.markAsTouched()
      }
    })
  }

  private createServiceOrderItemGroup(): FormGroup {
    return this.formBuilder.group({
      equipmentType: [EquipmentType.LAPTOP, Validators.required],
      brand: [""],
      model: [""],
      serialNumber: [""],
      initialIssue: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      accessories: [""],
    })
  }

  private createProductComposer(): ServiceOrderQuoteProductComposer {
    return {
      id: Date.now(),
      type: "product",
      productId: null,
      quantity: 1,
      unitPrice: 0,
      requiresPurchase: false,
      notes: "",
    }
  }

  private createServiceComposer(): ServiceOrderQuoteServiceComposer {
    return {
      id: Date.now(),
      type: "service",
      serviceId: null,
      notes: "",
    }
  }

  get serviceOrderItems(): FormArray {
    return this.createServiceOrderForm.get("serviceOrderItems") as FormArray
  }

  addServiceOrderItem(): void {
    this.serviceOrderItems.push(this.createServiceOrderItemGroup())
  }

  removeServiceOrderItem(index: number): void {
    if (this.serviceOrderItems.length === 1) {
      return
    }
    this.serviceOrderItems.removeAt(index)
    this.reindexCreateOrderQuoteState(index)
  }

  onCreateWorkflowServiceTypeChange(): void {
    const serviceType = this.createServiceOrderForm.get("workflowServiceType")?.value as ServiceType | null
    if (serviceType === ServiceType.ASSEMBLY) {
      this.createServiceOrderForm.patchValue({ requestOrigin: RequestOrigin.INTERNAL }, { emitEvent: false })
      this.clearCreateClientData()
      this.setCustomerFieldsEnabled(false)
      return
    }
    if (this.isInternalRequestOrigin()) {
      this.createServiceOrderForm.patchValue({ requestOrigin: RequestOrigin.CLIENT }, { emitEvent: false })
    }
    this.setCustomerFieldsEnabled(true)
  }

  onCreateRequestOriginChange(): void {
    if (this.isInternalRequestOrigin()) {
      this.clearCreateClientData()
      this.setCustomerFieldsEnabled(false)
      return
    }
    this.setCustomerFieldsEnabled(true)
  }

  isInternalRequestOrigin(): boolean {
    return this.createServiceOrderForm.get("requestOrigin")?.value === RequestOrigin.INTERNAL
  }

  getCreateServiceOrderSteps(): CreateServiceOrderStep[] {
    const steps: CreateServiceOrderStep[] = [
      {
        key: "workflow",
        label: "Tipo de atención",
        description: "Define el flujo general y el origen de la orden.",
      },
      {
        key: "client",
        label: this.isInternalRequestOrigin() ? "Responsable interno" : "Cliente",
        description: this.isInternalRequestOrigin()
          ? "Confirma que la orden será interna."
          : "Identifica al cliente o regístralo si aún no existe.",
      },
      {
        key: "items",
        label: this.getSelectedWorkflowServiceType() === ServiceType.ASSEMBLY ? "Ensamblaje" : "Equipos",
        description:
          this.getSelectedWorkflowServiceType() === ServiceType.ASSEMBLY
            ? "Registra los equipos o el detalle del ensamblaje."
            : "Registra los equipos y el detalle del servicio.",
      },
    ]

    if (this.requiresCreateServiceOrderInitialQuoteStep()) {
      steps.push({
        key: "initialQuote",
        label: "Cotización inicial",
        description: "Arma la cotización inicial de cada equipo.",
      })
    }

    steps.push({
      key: "review",
      label: "Confirmación",
      description: "Revisa el resumen final antes de registrar la orden.",
    })

    return steps
  }

  getCurrentCreateServiceOrderStep(): CreateServiceOrderStep {
    const steps = this.getCreateServiceOrderSteps()
    return steps[Math.min(this.createServiceOrderStep, steps.length - 1)]
  }

  isCreateServiceOrderStepActive(index: number): boolean {
    return this.createServiceOrderStep === index
  }

  nextCreateServiceOrderStep(): void {
    const steps = this.getCreateServiceOrderSteps()
    if (!this.validateCurrentCreateServiceOrderStep()) {
      return
    }
    this.createServiceOrderStep = Math.min(this.createServiceOrderStep + 1, steps.length - 1)
  }

  previousCreateServiceOrderStep(): void {
    this.createServiceOrderStep = Math.max(this.createServiceOrderStep - 1, 0)
  }

  isLastCreateServiceOrderStep(): boolean {
    return this.createServiceOrderStep >= this.getCreateServiceOrderSteps().length - 1
  }

  requiresCreateServiceOrderInitialQuoteStep(): boolean {
    return this.getSelectedWorkflowServiceType() === ServiceType.STANDARD_SERVICE
  }

  getSelectedWorkflowServiceType(): ServiceType {
    return (this.createServiceOrderForm.get("workflowServiceType")?.value as ServiceType | null) ?? ServiceType.DIAGNOSIS
  }

  getCreateOrderClientTitle(): string {
    if (this.isInternalRequestOrigin()) {
      return "Responsable interno"
    }
    if (this.getSelectedWorkflowServiceType() === ServiceType.CUSTOMER_SERVICE) {
      return "Socio o contacto"
    }
    return "Datos del cliente"
  }

  getCreateOrderClientDescription(): string {
    if (this.isInternalRequestOrigin()) {
      return "Esta orden se registrará sin cliente asociado porque el origen es interno."
    }
    if (this.getSelectedWorkflowServiceType() === ServiceType.CUSTOMER_SERVICE) {
      return "Identifica al socio o contacto responsable. Luego la cotización cobrará sólo repuestos."
    }
    return "Identifica al cliente y completa los datos de contacto."
  }

  getCreateOrderItemsTitle(): string {
    if (this.getSelectedWorkflowServiceType() === ServiceType.ASSEMBLY) {
      return "Equipos o detalle de ensamblaje"
    }
    if (this.getSelectedWorkflowServiceType() === ServiceType.CUSTOMER_SERVICE) {
      return "Equipos del socio"
    }
    return "Equipos de la orden"
  }

  getCreateOrderItemsDescription(): string {
    switch (this.getSelectedWorkflowServiceType()) {
      case ServiceType.ASSEMBLY:
        return "Registra el detalle del armado o de los equipos involucrados."
      case ServiceType.CUSTOMER_SERVICE:
        return "Registra el equipo del socio y el contexto del servicio. Más adelante se cotizarán sólo los repuestos."
      default:
        return "Registra los equipos y el detalle principal del servicio."
    }
  }

  getCreateOrderWorkflowAccent(): string {
    switch (this.getSelectedWorkflowServiceType()) {
      case ServiceType.STANDARD_SERVICE:
        return "Servicio directo"
      case ServiceType.DIAGNOSIS:
        return "Diagnóstico técnico"
      case ServiceType.ASSEMBLY:
        return "Trabajo de ensamblaje"
      case ServiceType.CUSTOMER_SERVICE:
        return "Atención a socio"
      default:
        return "Orden de servicio"
    }
  }

  getCreateOrderQuoteItems(index: number): ServiceOrderQuoteComposerItem[] {
    return this.createOrderQuoteItemsByItemIndex[index] ?? []
  }

  addProductToCreateOrderItemQuote(index: number): void {
    const current = this.getCreateOrderQuoteItems(index)
    this.createOrderQuoteItemsByItemIndex[index] = [...current, this.createProductComposer()]
  }

  addServiceToCreateOrderItemQuote(index: number): void {
    const current = this.getCreateOrderQuoteItems(index)
    this.createOrderQuoteItemsByItemIndex[index] = [...current, this.createServiceComposer()]
  }

  removeCreateOrderItemQuote(index: number, quoteIndex: number): void {
    const current = [...this.getCreateOrderQuoteItems(index)]
    current.splice(quoteIndex, 1)
    this.createOrderQuoteItemsByItemIndex[index] = current
  }

  onCreateOrderProductSelected(index: number, item: ServiceOrderQuoteProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (item.productId) {
      this.fetchCreateOrderProductPrice(index, item)
      return
    }
    item.unitPrice = 0
  }

  onCreateOrderProductQuantityChange(index: number, item: ServiceOrderQuoteProductComposer, value: any): void {
    item.quantity = Math.max(1, Number(value) || 1)
    if (item.productId) {
      this.fetchCreateOrderProductPrice(index, item)
    }
  }

  fetchCreateOrderProductPrice(index: number, item: ServiceOrderQuoteProductComposer): void {
    if (!item.productId) {
      return
    }
    const qty = Math.max(1, Number(item.quantity) || 1)
    this.getCreateOrderItemPriceLoadingMap(index)[item.id] = true
    this.pricingQuery
      .getProductPrice(item.productId, qty)
      .pipe(finalize(() => (this.getCreateOrderItemPriceLoadingMap(index)[item.id] = false)))
      .subscribe({
        next: (res) => {
          const unitPrice = res.finalUnitPrice ?? res.baseUnitPrice ?? 0
          item.unitPrice = unitPrice
        },
        error: () => {
          this.showMessage("warning", "fas fa-dollar-sign", "No pudimos obtener el precio del producto.")
          item.unitPrice = item.unitPrice || 0
        },
      })
  }

  isCreateOrderProductPriceLoading(index: number, itemId: number): boolean {
    return Boolean(this.getCreateOrderItemPriceLoadingMap(index)[itemId])
  }

  calculateCreateOrderItemQuoteTotal(index: number): number {
    return this.getCreateOrderQuoteItems(index).reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
  }

  calculateCreateOrderGrandTotal(): number {
    return this.serviceOrderItems.controls.reduce(
      (total, _, index) => total + this.calculateCreateOrderItemQuoteTotal(index),
      0,
    )
  }

  getCreateOrderSummaryItems(): Array<{
    index: number
    equipmentTypeLabel: string
    serviceTypeLabel: string
    description: string
    quoteItemsCount: number
    quoteTotal: number
  }> {
    return this.serviceOrderItems.controls.map((control, index) => {
      const group = control as FormGroup
      const quoteItems = this.getCreateOrderQuoteItems(index)
      return {
        index,
        equipmentTypeLabel: this.getEquipmentTypeLabel(group.get("equipmentType")?.value),
        serviceTypeLabel: this.getServiceTypeLabel(this.getSelectedWorkflowServiceType()),
        description: String(group.get("initialIssue")?.value ?? "").trim(),
        quoteItemsCount: quoteItems.length,
        quoteTotal: this.calculateCreateOrderItemQuoteTotal(index),
      }
    })
  }

  private clearCreateClientData(): void {
    this.createServiceOrderForm.patchValue(
      {
        clientId: null,
        documentNumber: "",
        documentTypeId: null,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      },
      { emitEvent: false },
    )
    this.documentSearchMessage = ""
    this.documentSearchError = ""
  }

  getServiceOrderItemControl(index: number, controlName: string) {
    return this.serviceOrderItems.at(index)?.get(controlName) ?? null
  }

  get isExistingPartner(): boolean {
    return Boolean(this.createServiceOrderForm.get("clientId")?.value)
  }

  private setCustomerFieldsEnabled(enabled: boolean): void {
    const controls = [
      "documentNumber",
      "documentTypeId",
      "contactName",
      "contactEmail",
      "contactPhone",
    ]
    controls.forEach((controlName) => {
      const control = this.createServiceOrderForm.get(controlName)
      if (!control) return
      if (enabled) {
        control.enable({ emitEvent: false })
      } else {
        control.disable({ emitEvent: false })
      }
    })
  }

  private validateCurrentCreateServiceOrderStep(): boolean {
    const step = this.getCurrentCreateServiceOrderStep().key
    if (step === "workflow") {
      this.markControlsAsTouched(["workflowServiceType", "requestOrigin", "priority"])
      return this.areControlsValid(["workflowServiceType", "requestOrigin", "priority"])
    }

    if (step === "client") {
      if (this.isInternalRequestOrigin()) {
        return true
      }
      this.markControlsAsTouched(["documentNumber", "documentTypeId", "contactName", "contactPhone", "contactEmail"])
      return this.areControlsValid(["documentNumber", "documentTypeId", "contactName", "contactPhone", "contactEmail"])
    }

    if (step === "items") {
      this.serviceOrderItems.controls.forEach((group) => this.markFormGroupAsTouched(group as FormGroup))
      return !this.serviceOrderItems.controls.some((group) => group.invalid)
    }

    if (step === "initialQuote") {
      return this.validateCreateServiceOrderInitialQuote()
    }

    return true
  }

  private validateCreateServiceOrderInitialQuote(): boolean {
    if (!this.requiresCreateServiceOrderInitialQuoteStep()) {
      return true
    }

    const invalidIndex = this.serviceOrderItems.controls.findIndex((_, index) => {
      const quoteItems = this.getCreateOrderQuoteItems(index)
      if (!quoteItems.length) return true
      return quoteItems.some((entry) => {
        if (entry.type === "product") {
          return !this.toNumericId(entry.productId) || Number(entry.quantity) <= 0
        }
        return !this.toNumericId(entry.serviceId)
      })
    })

    if (invalidIndex !== -1) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        `Completa la cotización inicial del equipo #${invalidIndex + 1}.`,
      )
      return false
    }

    return true
  }

  private createInitialQuotesForStandardService(serviceOrder: ServiceOrder) {
    if (!this.requiresCreateServiceOrderInitialQuoteStep()) {
      return of(serviceOrder)
    }

    const createdItems = [...(serviceOrder.items ?? [])].sort(
      (a, b) => Number(a.itemNumber ?? 0) - Number(b.itemNumber ?? 0),
    )
    if (!createdItems.length) {
      return of(serviceOrder)
    }

    const quoteRequests = createdItems
      .map((item, index) => {
        const quoteItems = this.getCreateOrderQuoteItems(index)
        if (!quoteItems.length) {
          return null
        }
        return this.quoteService.create(
          this.buildServiceOrderQuotePayload(Number(item.id), quoteItems, this.createServiceOrderForm.get("notes")?.value),
        )
      })
      .filter((request): request is ReturnType<ServiceOrderQuoteService["create"]> => request !== null)

    if (!quoteRequests.length) {
      return of(serviceOrder)
    }

    return forkJoin(quoteRequests).pipe(map(() => serviceOrder))
  }

  private buildServiceOrderQuotePayload(
    serviceOrderItemId: number,
    items: ServiceOrderQuoteComposerItem[],
    notes?: string | null,
  ): ServiceOrderQuoteRequest {
    const products = items.reduce<{ productId: number; quantity: number; unitPrice?: number; requiresPurchase: boolean; notes?: string }[]>((acc, entry) => {
      if (entry.type !== "product") return acc
      const productId = this.toNumericId(entry.productId)
      if (!productId) return acc
      const quantity = Math.max(1, Number(entry.quantity) || 1)
      const unitPriceRaw = entry.unitPrice !== undefined && entry.unitPrice !== null ? Number(entry.unitPrice) : undefined
      const unitPrice = unitPriceRaw !== undefined && Number.isFinite(unitPriceRaw) ? unitPriceRaw : undefined
      acc.push({
        productId,
        quantity,
        unitPrice,
        requiresPurchase: entry.requiresPurchase,
        notes: entry.notes || undefined,
      })
      return acc
    }, [])

    const services = items.reduce<{ serviceId: number; notes?: string }[]>((acc, entry) => {
      if (entry.type !== "service") return acc
      const serviceId = this.toNumericId(entry.serviceId)
      if (!serviceId) return acc
      acc.push({
        serviceId,
        notes: entry.notes || undefined,
      })
      return acc
    }, [])

    return {
      serviceOrderItemId,
      notes: notes ?? null,
      products,
      services,
    }
  }

  private reindexCreateOrderQuoteState(removedIndex: number): void {
    const nextQuoteItems: Record<number, ServiceOrderQuoteComposerItem[]> = {}
    const nextLoadingMap: Record<number, Record<number, boolean>> = {}

    Object.entries(this.createOrderQuoteItemsByItemIndex).forEach(([rawIndex, items]) => {
      const index = Number(rawIndex)
      if (index === removedIndex) return
      nextQuoteItems[index > removedIndex ? index - 1 : index] = items
    })

    Object.entries(this.createOrderProductPriceLoadingByItemIndex).forEach(([rawIndex, loadingMap]) => {
      const index = Number(rawIndex)
      if (index === removedIndex) return
      nextLoadingMap[index > removedIndex ? index - 1 : index] = loadingMap
    })

    this.createOrderQuoteItemsByItemIndex = nextQuoteItems
    this.createOrderProductPriceLoadingByItemIndex = nextLoadingMap
  }

  private getCreateOrderItemPriceLoadingMap(index: number): Record<number, boolean> {
    if (!this.createOrderProductPriceLoadingByItemIndex[index]) {
      this.createOrderProductPriceLoadingByItemIndex[index] = {}
    }
    return this.createOrderProductPriceLoadingByItemIndex[index]
  }

  private markControlsAsTouched(controlNames: string[]): void {
    controlNames.forEach((controlName) => this.createServiceOrderForm.get(controlName)?.markAsTouched())
  }

  private areControlsValid(controlNames: string[]): boolean {
    return controlNames.every((controlName) => {
      const control = this.createServiceOrderForm.get(controlName)
      return !control || control.disabled || control.valid
    })
  }

  viewServiceOrderQuoteDetail(quote: ServiceOrderQuote): void {
    this.isLoadingServiceOrderQuoteDetail = true
    this.quoteDetailError = ""
    this.selectedServiceOrderQuoteDetail = null
    this.quoteService
      .findOne(quote.id, true)
      .pipe(finalize(() => (this.isLoadingServiceOrderQuoteDetail = false)))
      .subscribe({
        next: (detail) => (this.selectedServiceOrderQuoteDetail = detail),
        error: () => {
          this.quoteDetailError = "No pudimos cargar el detalle de la cotización."
        },
      })
  }

  getProductLabel(productId: number | null): string {
    if (!productId) {
      return "Producto sin referencia"
    }
    const product = this.products.find((p) => Number(p.id) === Number(productId))
    return product ? `${product.sku} · ${product.name}` : `Producto #${productId}`
  }

  getServiceLabel(serviceId: number | null): string {
    if (!serviceId) {
      return "Servicio sin referencia"
    }
    const service = this.services.find((s) => Number(s.id) === Number(serviceId))
    return service ? `${service.code} · ${service.name}` : `Servicio #${serviceId}`
  }

  getServiceCategoryName(categoryId?: number | null): string {
    if (!categoryId) {
      return "Sin categoría"
    }
    return this.serviceCategoryMap.get(Number(categoryId)) ?? `Categoría #${categoryId}`
  }

  formatCoverageUntil(value: Date | null): string {
    if (!value) return "Sin cobertura"
    return value.toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" })
  }

  private addDays(baseDate: Date, days: number): Date {
    const result = new Date(baseDate)
    result.setDate(result.getDate() + days)
    return result
  }

  private isCoverageActive(until: Date | null): boolean {
    if (!until) return false
    const end = new Date(until)
    end.setHours(23, 59, 59, 999)
    return end.getTime() >= Date.now()
  }

  private getWarrantyDisabledReason(until: Date | null, warrantyDays: number, kind: "product" | "service"): string {
    if (kind === "product") {
      return "Los productos aún no tienen política de garantía configurada."
    }
    if (warrantyDays <= 0) {
      return "El servicio no tiene días de garantía configurados."
    }
    if (!until) {
      return "No se pudo calcular la vigencia de garantía."
    }
    return "La garantía está vencida."
  }

  private loadCurrentDiagnosis(serviceOrderItemId: number | null): void {
    if (!serviceOrderItemId) {
      this.currentDiagnosis = null
      return
    }
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

  getServiceOrderQuoteStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      sent_to_client: "Enviada al cliente",
      awaiting_client_response: "Esperando respuesta del cliente",
      client_approved: "Aprobada por cliente",
      client_rejected: "Rechazada por cliente",
      current: "Vigente",
      archived: "Archivada",
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
      expired: "Expirada",
      draft: "Borrador",
    }
    return statusMap[status.toLowerCase()] || status
  }

  isLatestServiceOrderQuote(quote: ServiceOrderQuote | null): boolean {
    if (!quote || !this.serviceOrderItemQuotes.length) return false
    const maxSequence = Math.max(
      ...this.serviceOrderItemQuotes.map((item) => Number(item.sequenceNumber ?? 0)),
    )
    if (Number(quote.sequenceNumber ?? 0) === maxSequence) return true
    const latest = this.serviceOrderItemQuotes.reduce((current, item) => {
      const currentTime = new Date(current.createdAt).getTime()
      const itemTime = new Date(item.createdAt).getTime()
      return itemTime > currentTime ? item : current
    }, this.serviceOrderItemQuotes[0])
    return quote.id === latest.id
  }

  isClientResponded(quote: ServiceOrderQuote | null): boolean {
    if (!quote) return false
    if (quote.clientApprovedAt || quote.clientRejectedAt) return true
    return quote.status === "CLIENT_APPROVED" || quote.status === "CLIENT_REJECTED"
  }

  canRespondToServiceOrderQuote(quote: ServiceOrderQuote | null): boolean {
    if (!quote) return false
    if (!this.isLatestServiceOrderQuote(quote)) return false
    if (this.isClientResponded(quote)) return false
    return quote.status === "CURRENT" || quote.status === "SENT_TO_CLIENT" || quote.status === "AWAITING_CLIENT_RESPONSE"
  }

  getServiceOrderQuoteStatusClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      sent_to_client: "status-sent-client",
      awaiting_client_response: "status-awaiting-client",
      client_approved: "status-client-approved",
      client_rejected: "status-client-rejected",
      current: "status-current",
      archived: "status-archived",
      pending: "status-pending",
      approved: "status-approved",
      rejected: "status-rejected",
      expired: "status-expired",
      draft: "status-draft",
    }
    return statusClassMap[status.toLowerCase()] || "status-default"
  }

  formatEstimatedDuration(value: number | string | null | undefined): string {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "Tiempo estimado: -"
    }
    const totalMinutes = Math.round(numeric * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0 && minutes > 0) {
      const hourLabel = hours === 1 ? "hora" : "horas"
      const minuteLabel = minutes === 1 ? "minuto" : "minutos"
      return `Tiempo estimado: ${hours} ${hourLabel} ${minutes} ${minuteLabel}`
    }
    if (hours > 0) {
      const hourLabel = hours === 1 ? "hora" : "horas"
      return `Tiempo estimado: ${hours} ${hourLabel}`
    }
    const minuteLabel = minutes === 1 ? "minuto" : "minutos"
    return `Tiempo estimado: ${minutes} ${minuteLabel}`
  }

  sendServiceOrderQuoteToClient(quote: ServiceOrderQuote): void {
    if (!quote?.id) return
    if (!this.canRespondToServiceOrderQuote(quote)) {
      this.showMessage("warning", "fas fa-info-circle", "Esta cotización ya tiene respuesta del cliente.")
      this.refreshServiceOrderQuotesForCurrentItem()
      this.refreshServiceOrderQuoteDetail(quote.id)
      return
    }
    this.isLoadingServiceOrderQuoteDetail = true
    this.quoteService
      .sendToClient(quote.id)
      .pipe(switchMap(() => this.quoteService.approveByClient(quote.id)))
      .pipe(finalize(() => (this.isLoadingServiceOrderQuoteDetail = false)))
      .subscribe({
        next: (updatedServiceOrderQuote) => {
          this.showMessage("success", "fas fa-check-circle", "Cotización aceptada correctamente.")
          const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === quote.id)
          if (index >= 0) {
            this.serviceOrderItemQuotes[index] = updatedServiceOrderQuote
          }
          if (this.selectedServiceOrderQuoteDetail?.id === quote.id) {
            this.selectedServiceOrderQuoteDetail = updatedServiceOrderQuote
          }
          this.loadServiceOrders()
        },
        error: (error) => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos aceptar la cotización.")
          const applied = this.applyServiceOrderQuoteStatusFromError(quote.id, error)
          if (!applied) {
            this.refreshServiceOrderQuotesForCurrentItem()
            this.refreshServiceOrderQuoteDetail(quote.id)
          }
        },
      })
  }

  rejectServiceOrderQuoteByClient(quote: ServiceOrderQuote): void {
    if (!quote?.id) return
    if (!this.canRespondToServiceOrderQuote(quote)) {
      this.showMessage("warning", "fas fa-info-circle", "Esta cotización ya tiene respuesta del cliente.")
      this.refreshServiceOrderQuotesForCurrentItem()
      this.refreshServiceOrderQuoteDetail(quote.id)
      return
    }
    this.isLoadingServiceOrderQuoteDetail = true
    this.quoteService
      .sendToClient(quote.id)
      .pipe(switchMap(() => this.quoteService.rejectByClient(quote.id)))
      .pipe(finalize(() => (this.isLoadingServiceOrderQuoteDetail = false)))
      .subscribe({
        next: (updatedServiceOrderQuote) => {
          this.showMessage("success", "fas fa-check-circle", "Cotización rechazada correctamente.")
          const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === quote.id)
          if (index >= 0) {
            this.serviceOrderItemQuotes[index] = updatedServiceOrderQuote
          }
          if (this.selectedServiceOrderQuoteDetail?.id === quote.id) {
            this.selectedServiceOrderQuoteDetail = updatedServiceOrderQuote
          }
          this.loadServiceOrders()
        },
        error: (error) => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos rechazar la cotización.")
          const applied = this.applyServiceOrderQuoteStatusFromError(quote.id, error)
          if (!applied) {
            this.refreshServiceOrderQuotesForCurrentItem()
            this.refreshServiceOrderQuoteDetail(quote.id)
          }
        },
      })
  }

  resubmitServiceOrderQuote(quote: ServiceOrderQuote): void {
    if (!quote?.id) return
    const serviceOrder = this.serviceOrderQuotesServiceOrder
    const item = this.serviceOrderQuotesServiceOrderItem
    if (!serviceOrder || !item) {
      this.showMessage("warning", "fas fa-info-circle", "No se pudo preparar la cotización para reenviar.")
      return
    }
    this.showServiceOrderQuotesModal = false
    this.openResubmitServiceOrderQuoteModal(quote, serviceOrder, item)
  }

  openResubmitServiceOrderQuoteModal(quote: ServiceOrderQuote, serviceOrder?: ServiceOrder, item?: ServiceOrderItem): void {
    const targetServiceOrder = serviceOrder ?? this.serviceOrderQuotesServiceOrder
    const targetItem = item ?? this.serviceOrderQuotesServiceOrderItem
    if (!targetServiceOrder || !targetItem) return
    this.quoteServiceOrder = targetServiceOrder
    this.selectedServiceOrderItem = targetItem
    this.selectedServiceOrderItemId = Number(targetItem.id)
    this.loadCurrentDiagnosis(this.selectedServiceOrderItemId)
    this.selectedServiceOrderQuoteDetail = quote
    this.isResubmittingServiceOrderQuote = true
    this.quoteItems = []

    quote.productItems?.forEach((product) => {
      this.quoteItems.push({
        id: Date.now() + Math.random(),
        type: "product",
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        requiresPurchase: product.requiresPurchase,
        notes: product.notes || "",
      })
    })

    quote.serviceItems?.forEach((service) => {
      if (this.diagnosticFeeService?.id && Number(service.serviceId) === Number(this.diagnosticFeeService.id)) {
        return
      }
      this.quoteItems.push({
        id: Date.now() + Math.random(),
        type: "service",
        serviceId: service.serviceId,
        notes: service.notes || "",
      })
    })

    this.createServiceOrderQuoteForm.patchValue({
      notes: quote.notes || "",
    })

    this.showCreateServiceOrderQuoteModal = true
  }

  submitResubmitServiceOrderQuote(): void {
    if (!this.selectedServiceOrderQuoteDetail?.id || this.createServiceOrderQuoteForm.invalid || this.quoteItems.length === 0) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa los datos y agrega productos o servicios.")
      return
    }

    const productsPayload = this.quoteItems.reduce<{ productId: number; quantity: number; unitPrice?: number; requiresPurchase: boolean; notes?: string }[]>((acc, entry) => {
      if (entry.type !== "product") return acc
      const productId = this.toNumericId(entry.productId)
      if (!productId) return acc
      const quantity = Math.max(1, Number(entry.quantity) || 1)
      const unitPriceRaw = entry.unitPrice !== undefined && entry.unitPrice !== null ? Number(entry.unitPrice) : undefined
      const unitPrice = unitPriceRaw !== undefined && Number.isFinite(unitPriceRaw) ? unitPriceRaw : undefined
      acc.push({
        productId,
        quantity,
        unitPrice,
        requiresPurchase: entry.requiresPurchase,
        notes: entry.notes || undefined,
      })
      return acc
    }, [])

    const servicesPayload = this.quoteItems.reduce<{ serviceId: number; notes?: string }[]>((acc, entry) => {
      if (entry.type !== "service") return acc
      const serviceId = this.toNumericId(entry.serviceId)
      if (!serviceId) return acc
      acc.push({
        serviceId,
        notes: entry.notes || undefined,
      })
      return acc
    }, [])

    const payload = {
      products: productsPayload,
      services: servicesPayload,
      notes: this.createServiceOrderQuoteForm.get("notes")?.value || undefined,
    }

    this.isCreatingServiceOrderQuote = true

    const status = (this.selectedServiceOrderQuoteDetail.status || "").toUpperCase()
    const resubmitMethod = status === "CLIENT_REJECTED"
      ? this.quoteService.resubmitAfterClientRejection(this.selectedServiceOrderQuoteDetail.id, payload)
      : this.quoteService.resubmitServiceOrderQuote(this.selectedServiceOrderQuoteDetail.id, payload)

    resubmitMethod
      .pipe(finalize(() => (this.isCreatingServiceOrderQuote = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización reenviada correctamente.")
          this.closeCreateServiceOrderQuoteModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos reenviar la cotización.")
        },
      })
  }

  // ===== EDICIÓN DE TICKET =====
  openEditServiceOrderModal(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (this.isFinalServiceOrder(serviceOrder)) {
      return
    }
    this.editingServiceOrder = serviceOrder
    this.editServiceOrderForm.patchValue({
      contactName: this.getServiceOrderContactName(serviceOrder),
      contactEmail: this.getServiceOrderContactEmail(serviceOrder),
      contactPhone: this.getServiceOrderContactPhone(serviceOrder),
      priority: serviceOrder.priority,
      notes: serviceOrder.notes,
    })
    this.showEditServiceOrderModal = true
  }

  closeEditServiceOrderModal(): void {
    this.showEditServiceOrderModal = false
    this.editingServiceOrder = null
    this.editServiceOrderForm.reset()
  }

  submitEditServiceOrder(): void {
    if (this.editServiceOrderForm.invalid || !this.editingServiceOrder) {
      return
    }

    this.isSaving = true
    const formValue = this.editServiceOrderForm.getRawValue()
    const payload: ServiceOrderUpdateRequest = {
      contactName: String(formValue.contactName ?? "").trim(),
      contactPhone: String(formValue.contactPhone ?? "").trim() || null,
      contactEmail: String(formValue.contactEmail ?? "").trim() || null,
      priority: formValue.priority,
      notes: formValue.notes ?? null,
    }

    this.serviceOrderService
      .update(this.editingServiceOrder.id, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "ServiceOrder actualizado correctamente.")
          this.closeEditServiceOrderModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar la orden.")
        },
      })
  }

  // ===== EDICIÓN DE ITEM =====
  openEditItemModal(item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    this.editingItem = item
    this.editItemForm.patchValue({
      equipmentType: item.equipmentType,
      serviceType: item.serviceType,
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      initialIssue: item.initialIssue,
      accessories: item.accessories,
    })
    this.showEditItemModal = true
  }

  closeEditItemModal(): void {
    this.showEditItemModal = false
    this.editingItem = null
    this.editItemForm.reset()
  }

  submitEditItem(): void {
    if (this.editItemForm.invalid || !this.editingItem) {
      return
    }

    this.isSaving = true
    const payload = this.editItemForm.value

    this.serviceOrderService
      .updateItem(this.editingItem.id, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Equipo actualizado correctamente.")
          this.closeEditItemModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el equipo.")
        },
      })
  }

  // ===== REASIGNACIÓN DE TÉCNICO =====
  openReassignTechnicianModal(item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!this.canReassignTechnician(item)) {
      return
    }
    this.reassigningItem = item
    this.reassignTechnicianForm.patchValue({
      technicianId: item.assignedToTechnicianId,
    })
    this.loadTechnicians()
    this.showReassignTechnicianModal = true
  }

  closeReassignTechnicianModal(): void {
    this.showReassignTechnicianModal = false
    this.reassigningItem = null
    this.reassignTechnicianForm.reset()
  }

  submitReassignTechnician(): void {
    if (this.reassignTechnicianForm.invalid || !this.reassigningItem) {
      return
    }

    this.isSaving = true
    const technicianId = this.reassignTechnicianForm.value.technicianId

    this.serviceOrderService
      .reassignTechnician(this.reassigningItem.id, technicianId)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Técnico reasignado correctamente.")
          this.closeReassignTechnicianModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos reasignar el técnico.")
        },
      })
  }

  private loadTechnicians(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.technicians = users
          .filter(user => hasAnyRole(user.roles, TECHNICIAN_ROLE_NAMES))
          .map(user => ({ id: Number(user.id), name: user.name }))
      },
      error: () => {
        this.technicians = []
      }
    })
  }
}


