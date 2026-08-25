import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from "@angular/core"
import { Router } from "@angular/router"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Observable, Subscription } from "rxjs"
import { catchError, debounceTime, finalize, map, switchMap, tap } from "rxjs/operators"
import { of, throwError } from "rxjs"
import { ClientsApiService } from "../../services/clients-api.service"
import { ClientContactResponse, ClientResponse } from "../../models/clients-response"
import { ClientContactRequest, ClientKind, ClientSaveRequest } from "../../models/clients-request"
import {
  ServiceOrderService,
  TechnicianAssignmentSuggestion,
  TechnicianAssignmentSuggestionRow,
} from "../../services/service-orders/service-order.service"
import {
  EquipmentType,
  RequestOrigin,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderCancellationResult,
  ServiceOrderCommercialStatus,
  ServiceOrderEconomicStatus,
  ServiceOrderOperativeStatus,
  ServiceOrderPriority,
  ServiceOrderTechnicalStatus,
  ServiceType,
} from "../../models/service-orders/service-order"
import {
  ServiceOrderInitialCommercialRequest,
  ServiceOrderSaveRequest,
  ServiceOrderUpdateRequest,
} from "../../models/service-orders/service-order-request"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { ServiceOrderAgreementService } from "../../services/service-orders/service-agreement.service"
import { ServiceOrderAgreementRequest } from "../../models/service-orders/service-agreement-request"
import {
  ServiceOrderAgreementSource,
  ServiceOrderAgreement,
  ServiceOrderAgreementItemLink,
  ServiceOrderAgreementStatus,
  ServiceOrderClientDecisionResult,
} from "../../models/service-orders/service-agreement"
import { ServiceOrderClientDecisionTarget } from "../../components/service-order-client-decision-modal/service-order-client-decision-modal"
import { ServiceOrderLineDiscountTarget } from "../../components/service-order-line-discount-modal/service-order-line-discount-modal"
import { ServiceOrderItemCancellationTarget } from "../../components/service-order-item-cancellation-modal/service-order-item-cancellation-modal"
import { ServiceOrderItemDeliveryTarget } from "../../components/service-order-item-delivery-modal/service-order-item-delivery-modal"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import { ServiceOrderDiagnosis } from "../../models/service-orders/service-order-diagnosis"
import { config } from "../../../environments/environment"
import { DocumentTypesApiService } from "../../services/document-types-api.service"
import { DocumentTypeResponse } from "../../models/document-types/document-types-response"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"
import { PricingQueryApiService } from "../../services/pricing/pricing-query-api.service"
import { ServiceOrderDocumentsService } from "../../services/service-orders/service-order-documents.service"
import { ServiceOrderBillingLinkService } from "../../services/service-orders/service-order-billing-link.service"
import { ServiceOrderBillingLink } from "../../models/service-orders/service-order-billing-link"
import { Sale } from "../../models/sales/sale.model"
import { ElectronicBillingApiService } from "../../services/electronic-billing/electronic-billing-api.service"
import { ElectronicDocument } from "../../models/electronic-billing/electronic-document.model"
import { ServiceOrderInboxService } from "../../services/service-orders/service-order-inbox.service"
import { CurrentUserService } from "../../services/current-user.service"
import {
  buildPhoneFormValue,
  DEFAULT_PHONE_COUNTRY,
  e164PhoneValidator,
  invalidPhoneSentinel,
  normalizePhoneToE164,
  parseStoredPhoneToFormValue,
  PhoneCountry,
} from "../../utils/phone.util"

interface ServiceOrderAgreementProductComposer {
  id: number
  type: "product"
  productId: number | null
  quantity: number
  unitPrice: number
  recommendedPrice?: number
  minAllowedPrice?: number
  requiresPurchase: boolean
  notes: string
}

interface ServiceOrderAgreementServiceComposer {
  id: number
  type: "service"
  serviceId: number | null
  unitPrice: number
  notes: string
}

interface FixedTechnicalServiceOption {
  id: number
  code: string
  name: string
  description?: string
  price: number
  warrantyDays: number
}

const TECHNICAL_SERVICE_OPTION: FixedTechnicalServiceOption = {
  id: 1,
  code: "TECHNICAL_SERVICE",
  name: "Servicio técnico",
  description: "Servicio técnico",
  price: 20,
  warrantyDays: 0,
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

type ServiceOrderAgreementComposerItem = ServiceOrderAgreementProductComposer | ServiceOrderAgreementServiceComposer
type CreateServiceOrderStepKey = "workflow" | "assignment" | "client" | "items" | "initialQuote" | "review"

interface CreateServiceOrderStep {
  key: CreateServiceOrderStepKey
  label: string
  description: string
}

interface SaleLinkSearchResult {
  sale: Sale
  totalServices: number
  totalProducts: number
}


interface CreateServiceOrderCandidateDraft {
  equipmentType: EquipmentType
  equipmentTypeOther: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  accessories: string | null
  initialIssue: string
  priority: ServiceOrderPriority
  notes: string | null
  quoteItems: ServiceOrderAgreementComposerItem[]
}

const CREATE_SERVICE_ORDER_DRAFT_KEY_PREFIX = "techstore:reception:create-service-order-draft:v2"
const CREATE_SERVICE_ORDER_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

interface CreateServiceOrderDraft {
  version: 2
  updatedAt: number
  step: number
  formValue: Record<string, any>
  candidates: CreateServiceOrderCandidateDraft[]
  editingCandidateIndex: number | null
  agreementItemsByItemIndex: Record<number, ServiceOrderAgreementComposerItem[]>
}

interface EquipmentDraftSnapshot {
  priority: ServiceOrderPriority
  equipmentType: EquipmentType
  equipmentTypeOther: string
  brand: string
  model: string
  serialNumber: string
  accessories: string
  initialIssue: string
  notes: string
}

const SERVICE_ORDER_OPERATIVE_STATUS_LABELS: Record<ServiceOrderOperativeStatus, string> = {
  [ServiceOrderOperativeStatus.ABIERTA]: "Abierto",
  [ServiceOrderOperativeStatus.EN_PROCESO]: "En progreso",
  [ServiceOrderOperativeStatus.CANCELACION_SOLICITADA]: "Cancelación solicitada",
  [ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA]: "Listo para entrega",
  [ServiceOrderOperativeStatus.ENTREGA_PARCIAL]: "Entrega parcial",
  [ServiceOrderOperativeStatus.ENTREGADA]: "Entregado",
  [ServiceOrderOperativeStatus.CANCELADA]: "Cancelado",
  [ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION]: "Sin solución",
}

const SERVICE_ORDER_PRIORITY_LABELS: Record<ServiceOrderPriority, string> = {
  [ServiceOrderPriority.LOW]: "Baja",
  [ServiceOrderPriority.MEDIUM]: "Media",
  [ServiceOrderPriority.HIGH]: "Alta",
}

const SERVICE_ORDER_TECHNICAL_STATUS_LABELS: Partial<Record<ServiceOrderTechnicalStatus, string>> = {
  [ServiceOrderTechnicalStatus.PENDIENTE_ASIGNACION]: "Pendiente de asignación",
  [ServiceOrderTechnicalStatus.ASIGNADA]: "Asignado",
  [ServiceOrderTechnicalStatus.EN_DIAGNOSTICO]: "En revisión",
  [ServiceOrderTechnicalStatus.DIAGNOSTICADA]: "Diagnosticado",
  [ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL]: "En coordinación",
  [ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION]: "Aprobado para trabajar",
  [ServiceOrderTechnicalStatus.EN_EJECUCION]: "En servicio",
  [ServiceOrderTechnicalStatus.BLOQUEADA]: "Bloqueada",
  [ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO]: "Esperando repuestos",
  [ServiceOrderTechnicalStatus.RESUELTA]: "Servicio finalizado",
  [ServiceOrderTechnicalStatus.SIN_SOLUCION]: "Sin solución",
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
  selectedServiceOrderId: number | null = null
  selectedServiceOrder: ServiceOrder | null = null
  currentDiagnosis: ServiceOrderDiagnosis | null = null
  isLoadingDiagnosis = false
  readonly serviceTypeEnum = ServiceType
  readonly serviceOrderOperativeStatusEnum = ServiceOrderOperativeStatus
  readonly requestOriginEnum = RequestOrigin
  readonly serviceOrderAgreementStatusEnum = ServiceOrderAgreementStatus
  readonly clientKindEnum = ClientKind
  expectedDocumentDigits: number | null = null
  private itemServiceOrderAgreementTotals: Record<number, number> = {}
  filterState: "all" | ServiceOrderOperativeStatus = "all"
  filterStartDate = ""
  filterEndDate = ""
  searchTerm = ""
  currentPage = 1
  itemsPerPage = 10
  totalPages = 1
  readonly Math = Math

  showCreateServiceOrderModal = false
  showCreateServiceOrderAgreementModal = false
  isResubmittingServiceOrderAgreement = false
  isEditingDraftServiceOrderAgreement = false

  createServiceOrderForm: FormGroup
  createServiceOrderAgreementForm: FormGroup

  clients: ClientResponse[] = []
  documentTypes: DocumentTypeResponse[] = []
  products: Product[] = []
  technicalServiceOption = TECHNICAL_SERVICE_OPTION
  services: FixedTechnicalServiceOption[] = [TECHNICAL_SERVICE_OPTION]
  quoteItems: ServiceOrderAgreementComposerItem[] = []
  createOrderAgreementItemsByItemIndex: Record<number, ServiceOrderAgreementComposerItem[]> = {}
  assignmentSuggestion: TechnicianAssignmentSuggestion | null = null
  isLoadingAssignmentSuggestion = false
  assignmentSuggestionError = ""
  documentSearchMessage = ""
  documentSearchError = ""
  isSearchingPartner = false
  isLoadingServiceOrders = false
  isCreatingServiceOrder = false
  isCreatingServiceOrderAgreement = false
  isLoadingServiceOrderAgreements = false
  isLoadingServiceOrderAgreementDetail = false

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  readonly equipmentTypeOptions = Object.values(EquipmentType)
  readonly serviceTypeOptions = Object.values(ServiceType)
  readonly requestOriginOptions = Object.values(RequestOrigin)
  private readonly companyId = Number(config.defaultCompanyId ?? 1) || 1
  showServiceOrderAgreementsModal = false
  serviceOrderAgreementsError = ""
  serviceOrderItemQuotes: ServiceOrderAgreement[] = []
  agreementServiceOrder: ServiceOrder | null = null
  serviceOrderAgreementsServiceOrder: ServiceOrder | null = null
  selectedServiceOrderAgreementDetail: ServiceOrderAgreement | null = null
  clientDecisionTarget: ServiceOrderClientDecisionTarget | null = null
  lineDiscountTarget: ServiceOrderLineDiscountTarget | null = null
  itemCancellationTarget: ServiceOrderItemCancellationTarget | null = null
  itemDeliveryTarget: ServiceOrderItemDeliveryTarget | null = null
  equipmentDetailOrder: ServiceOrder | null = null
  selectedEquipmentCancellationIds: number[] = []
  isLoadingEquipmentDetail = false
  quoteDetailError = ""
  showWarrantyActionModal = false
  isLoadingWarrantyLines = false
  isCreatingWarrantyOrder = false
  warrantyActionError = ""
  warrantySourceServiceOrder: ServiceOrder | null = null
  warrantyCoverageLines: WarrantyCoverageLine[] = []
  selectedWarrantyLineIds = new Set<string>()
  createServiceOrderStep = 0
  createServiceOrderCandidates: CreateServiceOrderCandidateDraft[] = []
  editingCreateServiceOrderCandidateIndex: number | null = null
  productPriceLoading: Record<number, boolean> = {}
  createOrderProductPriceLoadingByItemIndex: Record<number, Record<number, boolean>> = {}

  // Modales de edición
  showEditServiceOrderModal = false
  showReassignTechnicianModal = false
  editingServiceOrder: ServiceOrder | null = null
  editServiceOrderForm: FormGroup
  reassignTechnicianForm: FormGroup
  technicians: { id: number; name: string }[] = []
  isSaving = false
  selectedMockBoletaOrderIds = new Set<number>()
  showMockBoletaModal = false
  mockBoletaError = ""
  saleLinksByOrderId: Record<number, ServiceOrderBillingLink[]> = {}
  saleSearchResults: SaleLinkSearchResult[] = []
  selectedSaleSearchResult: SaleLinkSearchResult | null = null
  saleSearchTerm = ""
  saleSearchDocumentType: "all" | "BOLETA" | "FACTURA" = "all"
  isSearchingSales = false
  isLinkingSale = false
  isViewingLinkedSaleDocument = false
  activeActionMenuOrderId: number | null = null
  actionMenuStyle: Record<string, string> | null = null

  private readonly subscriptions = new Subscription()
  private isRestoringCreateServiceOrderDraft = false

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly clientsService: ClientsApiService,
    private readonly productsService: ProductsService,
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly diagnosisService: ServiceOrderDiagnosisService,
    private readonly documentTypesService: DocumentTypesApiService,
    private readonly usersApi: UsersApiService,
    private readonly pricingQuery: PricingQueryApiService,
    private readonly serviceOrderDocuments: ServiceOrderDocumentsService,
    private readonly serviceOrderBillingLinks: ServiceOrderBillingLinkService,
    private readonly electronicBillingApi: ElectronicBillingApiService,
    private readonly serviceOrderInboxService: ServiceOrderInboxService,
    private readonly currentUserService: CurrentUserService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.createServiceOrderForm = this.createServiceOrderFormGroup()
    this.createServiceOrderAgreementForm = this.createServiceOrderAgreementFormGroup()
    this.editServiceOrderForm = this.createEditServiceOrderFormGroup()
    this.reassignTechnicianForm = this.createReassignTechnicianFormGroup()
    const partnerChanges = this.createServiceOrderForm
      .get("clientId")
      ?.valueChanges.subscribe((value) => this.applyClientContact(value))
    if (partnerChanges) {
      this.subscriptions.add(partnerChanges)
    }
    this.subscriptions.add(
      this.createServiceOrderForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
        if (this.showCreateServiceOrderModal && !this.isRestoringCreateServiceOrderDraft) {
          this.saveCreateServiceOrderDraft()
        }
      }),
    )
  }

  @HostListener("document:click")
  handleDocumentClick(): void {
    this.closeActionMenu()
  }

  @HostListener("window:scroll")
  @HostListener("window:resize")
  handleViewportChange(): void {
    this.closeActionMenu()
  }

  ngOnInit(): void {
    this.loadServiceOrders()
    this.loadClients()
    this.loadCatalogData()
    this.loadDocumentTypes()
    if (this.hasValidCreateServiceOrderDraft()) {
      this.openCreateServiceOrderModal()
    }
  }

  ngOnDestroy(): void {
    this.saveCreateServiceOrderDraft()
    this.subscriptions.unsubscribe()
  }

  @HostListener("window:beforeunload")
  persistCreateServiceOrderDraftBeforeUnload(): void {
    this.saveCreateServiceOrderDraft()
  }

  private createServiceOrderFormGroup(): FormGroup {
    const group = this.formBuilder.group({
      requestOrigin: [RequestOrigin.CLIENT, Validators.required],
      workflowServiceType: [ServiceType.DIAGNOSIS, Validators.required],
      clientId: [null],
      clientKind: [ClientKind.PERSON, Validators.required],
      clientContactId: [null],
      documentNumber: ["", [Validators.required, Validators.pattern(/^[0-9]*$/)]],
      documentTypeId: [null, Validators.required],
      companyName: [""],
      companyTradeName: [""],
      contactName: ["", Validators.required],
      contactPhone: ["", [e164PhoneValidator({ required: true })]],
      contactPhoneCountry: [DEFAULT_PHONE_COUNTRY],
      contactPhoneNationalNumber: [""],
      contactEmail: ["", Validators.email],
      priority: [ServiceOrderPriority.LOW, Validators.required],
      assignedToTechnicianId: [null, Validators.required],
      notes: [""],
      equipmentType: [EquipmentType.LAPTOP, Validators.required],
      equipmentTypeOther: [""],
      brand: [""],
      model: [""],
      serialNumber: [""],
      initialIssue: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      accessories: [""],
    })
    this.configureEquipmentTypeOtherValidation(group)
    return group
  }

  private createServiceOrderAgreementFormGroup(): FormGroup {
    return this.formBuilder.group({
      currency: ["PEN", Validators.required],
      notes: ["", Validators.maxLength(500)],
    })
  }

  private createEditServiceOrderFormGroup(): FormGroup {
    const group = this.formBuilder.group({
      contactName: ["", Validators.required],
      contactEmail: ["", Validators.email],
      contactPhone: ["", e164PhoneValidator()],
      contactPhoneCountry: [DEFAULT_PHONE_COUNTRY],
      contactPhoneNationalNumber: [""],
      notes: [""],
      equipmentType: [EquipmentType.LAPTOP, Validators.required],
      equipmentTypeOther: [""],
      serviceType: [ServiceType.DIAGNOSIS, Validators.required],
      brand: [""],
      model: [""],
      serialNumber: [""],
      initialIssue: ["", Validators.required],
      accessories: [""],
    })
    this.configureEquipmentTypeOtherValidation(group)
    return group
  }

  private createReassignTechnicianFormGroup(): FormGroup {
    return this.formBuilder.group({
      technicianId: [null, Validators.required],
    })
  }

  private loadServiceOrders(): void {
    this.isLoadingServiceOrders = true
    this.serviceOrderService
      .findAll({ page: 1, limit: 50 })
      .pipe(finalize(() => (this.isLoadingServiceOrders = false)))
      .subscribe({
        next: ({ data }) => {
          this.serviceOrders = data ?? []
          this.loadBillingLinksForVisibleOrders()
          this.currentPage = 1
          this.applyFilters()
          this.pruneSelectedMockBoletaOrders()
        },
        error: () => {
          this.serviceOrders = []
          this.filteredServiceOrders = []
          this.saleLinksByOrderId = {}
          this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar las órdenes de servicio.")
        },
      })
  }

  private loadBillingLinksForVisibleOrders(): void {
    const ids = this.serviceOrders.map((order) => Number(order.id)).filter((id) => id > 0)
    if (!ids.length) {
      this.saleLinksByOrderId = {}
      return
    }

    this.serviceOrderBillingLinks.getLinksByOrders(ids).subscribe({
      next: (links) => {
        const grouped: Record<number, ServiceOrderBillingLink[]> = {}
        ;(links ?? []).forEach((link) => {
          const orderId = Number(link.serviceOrderId)
          if (!grouped[orderId]) {
            grouped[orderId] = []
          }
          grouped[orderId].push(link)
        })
        this.saleLinksByOrderId = grouped
      },
      error: () => {
        this.saleLinksByOrderId = {}
      },
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

  isSelectableForMockBoleta(serviceOrder: ServiceOrder): boolean {
    return !this.hasLinkedSaleDocument(serviceOrder) && this.canCreateBoletaFromOrder(serviceOrder) && this.isSameClientSelection(serviceOrder)
  }

  canViewServiceOrderBoleta(serviceOrder: ServiceOrder): boolean {
    return this.hasLinkedSaleDocument(serviceOrder)
  }

  getActiveSaleLink(serviceOrder: ServiceOrder): ServiceOrderBillingLink | null {
    const links = this.saleLinksByOrderId[Number(serviceOrder.id)] ?? []
    return links[0] ?? null
  }

  hasLinkedSaleDocument(serviceOrder: ServiceOrder): boolean {
    return Boolean(this.getActiveSaleLink(serviceOrder))
  }

  isSelectedForMockBoleta(serviceOrderId: number): boolean {
    return this.selectedMockBoletaOrderIds.has(Number(serviceOrderId))
  }

  toggleMockBoletaSelection(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.isSelectableForMockBoleta(serviceOrder)) {
      if (serviceOrder.economicStatus === ServiceOrderEconomicStatus.TOTAL) {
        this.showMessage("warning", "fas fa-info-circle", "La orden ya está conciliada por comprobantes vinculados.")
      } else if (!this.isSameClientSelection(serviceOrder)) {
        this.showMessage("warning", "fas fa-users", "Solo puedes seleccionar órdenes del mismo cliente.")
      }
      return
    }

    const id = Number(serviceOrder.id)
    if (this.selectedMockBoletaOrderIds.has(id)) {
      this.selectedMockBoletaOrderIds.delete(id)
      return
    }
    this.selectedMockBoletaOrderIds.add(id)
  }

  get selectedMockBoletaOrdersCount(): number {
    return this.selectedMockBoletaOrderIds.size
  }

  get selectedMockBoletaClientKey(): string | null {
    const firstSelectedId = Array.from(this.selectedMockBoletaOrderIds)[0]
    if (!firstSelectedId) {
      return null
    }
    const serviceOrder = this.serviceOrders.find((order) => Number(order.id) === Number(firstSelectedId))
    return serviceOrder ? this.getServiceOrderBoletaClientKey(serviceOrder) : null
  }

  openMockBoletaModal(): void {
    if (!this.selectedMockBoletaOrderIds.size) {
      this.showMessage("warning", "fas fa-info-circle", "Selecciona al menos una orden válida para ligar un documento.")
      return
    }

    this.showMockBoletaModal = true
    this.isViewingLinkedSaleDocument = false
    this.mockBoletaError = ""
    this.saleSearchResults = []
    this.selectedSaleSearchResult = null
    this.saleSearchTerm = ""
    this.saleSearchDocumentType = "all"
  }

  downloadLinkedSaleDocument(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()

    if (!this.canViewServiceOrderBoleta(serviceOrder)) {
      this.showMessage("warning", "fas fa-file-invoice", "La orden aún no tiene un documento ligado.")
      return
    }

    const activeLink = this.getActiveSaleLink(serviceOrder)
    if (!activeLink?.sale) {
      this.showMessage("warning", "fas fa-file-invoice", "La orden aún no tiene un documento ligado.")
      return
    }

    const saleId = Number(activeLink.sale.id)
    this.electronicBillingApi.getDocumentBySale(saleId).pipe(
      catchError((error) => {
        const status = Number(error?.status ?? error?.error?.statusCode ?? 0)
        return status === 404
          ? this.electronicBillingApi.sendInvoice(saleId).pipe(map((response) => response.document))
          : throwError(() => error)
      }),
      switchMap((document) => {
        if (document.status !== "ACCEPTED") {
          return throwError(() => new Error(this.getElectronicDocumentUnavailableMessage(document)))
        }
        return this.electronicBillingApi.downloadPdf(saleId).pipe(
          map((blob) => ({ blob, document })),
        )
      }),
    ).subscribe({
      next: ({ blob, document }) => {
        const fileName = `${document.series}-${document.number}.pdf`
        this.downloadBlob(blob, fileName)
        this.showMessage("success", "fas fa-check-circle", `Comprobante electrónico descargado: ${fileName}`)
      },
      error: (error) => {
        const message = error instanceof Error && error.message
          ? error.message
          : "No pudimos emitir o descargar el comprobante electrónico."
        this.showMessage("danger", "fas fa-times-circle", message)
      },
    })
  }

  private getElectronicDocumentUnavailableMessage(document: ElectronicDocument): string {
    if (document.status === "REJECTED" || document.status === "ERROR") {
      return document.errorMessage || document.sunatDescription || "El comprobante electrónico fue rechazado."
    }
    return "La emisión electrónica está en proceso. El PDF estará disponible cuando el comprobante sea aceptado."
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    window.URL.revokeObjectURL(url)
  }

  toggleActionMenu(serviceOrderId: number, event?: Event): void {
    event?.stopPropagation()
    if (this.activeActionMenuOrderId === serviceOrderId) {
      this.closeActionMenu()
      return
    }

    const trigger = event?.currentTarget as HTMLElement | null
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      const menuWidth = 220
      const viewportWidth = window.innerWidth
      const left = Math.min(
        Math.max(12, rect.right - menuWidth),
        Math.max(12, viewportWidth - menuWidth - 12),
      )

      const viewportHeight = window.innerHeight
      const margin = 12
      const offset = 8
      const estimatedMenuHeight = 320
      const availableBelow = viewportHeight - rect.bottom - margin
      const availableAbove = rect.top - margin
      const shouldOpenUpwards = availableBelow < 220 && availableAbove > availableBelow
      const maxHeight = Math.max(160, shouldOpenUpwards ? availableAbove - offset : availableBelow - offset)

      this.actionMenuStyle = shouldOpenUpwards
        ? {
            left: `${left}px`,
            bottom: `${Math.max(margin, viewportHeight - rect.top + offset)}px`,
            maxHeight: `${Math.min(estimatedMenuHeight, maxHeight)}px`,
          }
        : {
            top: `${rect.bottom + offset}px`,
            left: `${left}px`,
            maxHeight: `${Math.min(estimatedMenuHeight, maxHeight)}px`,
          }
    } else {
      this.actionMenuStyle = null
    }

    this.activeActionMenuOrderId = serviceOrderId
  }

  isActionMenuOpen(serviceOrderId: number): boolean {
    return this.activeActionMenuOrderId === serviceOrderId
  }

  closeActionMenu(): void {
    this.activeActionMenuOrderId = null
    this.actionMenuStyle = null
  }

  closeMockBoletaModal(): void {
    this.showMockBoletaModal = false
    this.mockBoletaError = ""
    this.saleSearchResults = []
    this.selectedSaleSearchResult = null
    this.saleSearchTerm = ""
    this.isViewingLinkedSaleDocument = false
  }

  searchSalesToLink(): void {
    if (this.isViewingLinkedSaleDocument) {
      return
    }

    const orderIds = Array.from(this.selectedMockBoletaOrderIds)
    if (!orderIds.length) {
      this.mockBoletaError = "Selecciona al menos una orden."
      return
    }

    const firstOrder = this.serviceOrders.find((order) => Number(order.id) === Number(orderIds[0]))
    if (!firstOrder?.clientId) {
      this.mockBoletaError = "Las órdenes seleccionadas deben tener cliente asociado."
      return
    }

    this.isSearchingSales = true
    this.mockBoletaError = ""
    const searchParams: Record<string, string | number> = {
      companyId: this.companyId,
      customerId: Number(firstOrder.clientId),
      page: 1,
      limit: 20,
    }

    const normalizedSearch = this.saleSearchTerm.trim()
    if (normalizedSearch) {
      searchParams["search"] = normalizedSearch
    }
    if (this.saleSearchDocumentType !== "all") {
      searchParams["documentType"] = this.saleSearchDocumentType
    }

    this.serviceOrderBillingLinks
      .searchSales(searchParams)
      .pipe(finalize(() => (this.isSearchingSales = false)))
      .subscribe({
        next: ({ data }) => {
          this.saleSearchResults = (data ?? []).map((sale) => ({
            sale,
            totalProducts: (sale.items ?? []).filter((item) => item.itemType !== 'SERVICE').length,
            totalServices: (sale.items ?? []).filter((item) => item.itemType === 'SERVICE').length,
          }))
          this.selectedSaleSearchResult = null
        },
        error: () => {
          this.saleSearchResults = []
          this.mockBoletaError = "No pudimos buscar documentos emitidos."
        },
      })
  }

  selectSaleSearchResult(result: SaleLinkSearchResult): void {
    this.selectedSaleSearchResult = result
  }

  get selectedMockBoletaOrders(): ServiceOrder[] {
    const ids = this.selectedMockBoletaOrderIds
    return this.serviceOrders.filter((order) => ids.has(Number(order.id)))
  }

  getSelectedMockBoletaOrderCodesLabel(): string {
    return this.selectedMockBoletaOrders.map((order) => order.code).join(", ") || "Sin selección"
  }

  getSelectedMockBoletaClientDocument(): string {
    const firstOrder = this.selectedMockBoletaOrders[0]
    if (!firstOrder) {
      return "-"
    }

    return [firstOrder.clientSnapshotDocumentTypeName, firstOrder.clientSnapshotDocumentNumber]
      .filter((value) => Boolean(value))
      .join(": ")
  }

  openLinkSaleModalForOrder(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.selectedMockBoletaOrderIds = new Set([Number(serviceOrder.id)])
    this.openMockBoletaModal()
    this.closeActionMenu()
  }

  confirmLinkSaleToOrders(): void {
    if (!this.selectedSaleSearchResult) {
      this.mockBoletaError = "Selecciona un documento para ligar."
      return
    }

    const orderIds = Array.from(this.selectedMockBoletaOrderIds)
    if (!orderIds.length) {
      this.mockBoletaError = "Selecciona al menos una orden."
      return
    }

    this.isLinkingSale = true
    this.serviceOrderBillingLinks
      .linkSaleToOrders(Number(this.selectedSaleSearchResult.sale.id), orderIds)
      .pipe(finalize(() => (this.isLinkingSale = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Documento ligado correctamente.")
          this.selectedMockBoletaOrderIds.clear()
          this.closeMockBoletaModal()
          this.loadServiceOrders()
        },
        error: (error) => {
          this.mockBoletaError = error?.error?.message || "No pudimos ligar el documento."
        },
      })
  }

  markServiceOrderAsPaid(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.showMessage(
      "warning",
      "fas fa-info-circle",
      "El marcado manual de pago fue eliminado. Vincula un comprobante para reflejar el estado económico de la orden.",
    )
  }

  private loadCatalogData(): void {
    this.productsService.list().subscribe({
      next: (items) => (this.products = items ?? []),
      error: () => this.showMessage("warning", "fas fa-warehouse", "No pudimos cargar los productos."),
    })
    this.services = [TECHNICAL_SERVICE_OPTION]
  }

  private loadDocumentTypes(): void {
    const documentTypeIdControl = this.createServiceOrderForm.get("documentTypeId")
    const documentNumberControl = this.createServiceOrderForm.get("documentNumber")

    this.documentTypesService.findAll({ page: 1, limit: 50 }).subscribe(({ data }) => {
      this.documentTypes = data ?? []

      const documentTypeId = documentTypeIdControl?.value
      const documentNumber = (this.createServiceOrderForm.get("documentNumber")?.value ?? "").toString().trim()
      if (!documentNumber.length) {
        const defaultDni = this.documentTypes.find((type) => type.name?.trim().toUpperCase() === "DNI")
        this.createServiceOrderForm.patchValue(
          { documentTypeId: documentTypeId ?? defaultDni?.id ?? null },
          { emitEvent: false },
        )
      }
      this.syncDocumentNumberAvailability()
      if ((this.createServiceOrderForm.get("documentTypeId")?.value ?? null) && documentNumberControl?.disabled) {
        documentNumberControl.enable({ emitEvent: false })
      }
    })
  }

  onDocumentNumberInput(): void {
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    const documentNumber = (this.createServiceOrderForm.get("documentNumber")?.value ?? "").trim()
    this.createServiceOrderForm.patchValue({ clientId: null }, { emitEvent: false })
    this.setCustomerFieldsEnabled(true)

    if (!documentNumber) {
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
      this.createServiceOrderForm.get("documentNumber")?.setValue(trimmed)
      return
    }

    if (docType.digits && documentNumber.length === docType.digits) {
      this.lookupClientByDocument(documentNumber)
    }
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
      const matchState = this.filterState === "all" || serviceOrder.operativeStatus === this.filterState
      const matchDate = this.matchesDateRange(serviceOrder.createdAt, startDate, endDate)
      const matchSearch =
        term === "" ||
        serviceOrder.code.toLowerCase().includes(term) ||
        this.getServiceOrderContactName(serviceOrder).toLowerCase().includes(term) ||
        this.getServiceOrderContactEmail(serviceOrder).toLowerCase().includes(term) ||
        this.getServiceOrderContactPhone(serviceOrder).toLowerCase().includes(term)
      return matchState && matchDate && matchSearch
    })
    this.updatePagination()
    this.pruneSelectedMockBoletaOrders()
  }

  onSearchChange(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  onDocumentTypeChange(): void {
    const typeId = this.createServiceOrderForm.get("documentTypeId")?.value
    this.updateExpectedDocumentDigits(typeId)
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    // Clear contact/company fields when document type changes (keep document number)
    this.createServiceOrderForm.patchValue({
      companyName: "",
      companyTradeName: "",
      contactName: "",
      contactPhone: "",
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: "",
      contactEmail: "",
      clientContactId: null,
    }, { emitEvent: false })
    this.syncDocumentNumberAvailability()

    // Infer clientKind from document type
    const docType = this.documentTypes.find((t) => Number(t.id) === Number(typeId))
    const inferredKind = docType?.['kind'] ?? (this.expectedDocumentDigits && this.expectedDocumentDigits >= 11 ? ClientKind.COMPANY : ClientKind.PERSON)
    this.createServiceOrderForm.patchValue({ clientKind: inferredKind }, { emitEvent: false })

    // Re-trigger search if document number has valid length for the new type
    const currentDocNumber = this.createServiceOrderForm.get("documentNumber")?.value
    if (currentDocNumber && currentDocNumber.toString().length === this.expectedDocumentDigits) {
      this.onDocumentNumberInput()
    }
  }

  private syncDocumentNumberAvailability(): void {
    const documentNumberControl = this.createServiceOrderForm.get("documentNumber")
    const hasDocumentType = Boolean(this.createServiceOrderForm.get("documentTypeId")?.value)
    if (!documentNumberControl) {
      return
    }
    if (hasDocumentType) {
      documentNumberControl.enable({ emitEvent: false })
    } else {
      documentNumberControl.disable({ emitEvent: false })
    }
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

  private pruneSelectedMockBoletaOrders(): void {
    const validIds = new Set(this.serviceOrders.map((serviceOrder) => Number(serviceOrder.id)))
    Array.from(this.selectedMockBoletaOrderIds).forEach((id) => {
      if (!validIds.has(id)) {
        this.selectedMockBoletaOrderIds.delete(id)
      }
    })
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

  isFinalServiceOrder(serviceOrder?: ServiceOrder | null): boolean {
    if (!serviceOrder) return false
    return [
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ].includes(
      serviceOrder.operativeStatus,
    )
  }

  hasPendingServiceOrderAgreementItems(serviceOrder: ServiceOrder): boolean {
    return [ServiceType.DIAGNOSIS, ServiceType.CUSTOMER_SERVICE].includes(serviceOrder.serviceType)
      && serviceOrder.technicalStatus === ServiceOrderTechnicalStatus.DIAGNOSTICADA
  }

  hasRejectedServiceOrderAgreementItems(serviceOrder: ServiceOrder): boolean {
    return serviceOrder.operativeStatus === ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION
  }

  hasPendingDeliveryItems(serviceOrder: ServiceOrder): boolean {
    return [
      ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      ServiceOrderOperativeStatus.ENTREGA_PARCIAL,
    ].includes(serviceOrder.operativeStatus)
  }

  canMarkClientApproved(serviceOrder: ServiceOrder): boolean {
    return serviceOrder.technicalStatus === ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL
      && serviceOrder.commercialStatus === ServiceOrderCommercialStatus.PENDIENTE_RESPUESTA_CLIENTE
  }

  canMarkClientRejected(serviceOrder: ServiceOrder): boolean {
    return serviceOrder.technicalStatus === ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL
      && serviceOrder.commercialStatus === ServiceOrderCommercialStatus.PENDIENTE_RESPUESTA_CLIENTE
  }

  canDeliverItem(serviceOrder: ServiceOrder): boolean {
    return (serviceOrder.items ?? []).some(
      (item) => !item.deliveredAt && [
        ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
        ServiceOrderOperativeStatus.CANCELADA,
      ].includes(item.operativeStatus),
    )
  }

  canReassignTechnician(serviceOrder?: ServiceOrder | null): boolean {
    if (!serviceOrder) return false
    return ![ServiceOrderOperativeStatus.ENTREGADA, ServiceOrderOperativeStatus.CANCELADA].includes(serviceOrder.operativeStatus)
  }

  markItemClientApproved(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!serviceOrder?.id) return
    this.serviceOrderService
      .changeTechnicalStatus(Number(serviceOrder.id), ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION)
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

  markItemClientRejected(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.showMessage(
      "warning",
      "fas fa-info-circle",
      "El rechazo comercial debe resolverse desde el flujo de cotizaciones, no desde una transición técnica directa.",
    )
  }

  deliverItem(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    const firstReadyItem = (serviceOrder.items ?? []).find(
      (item) => !item.deliveredAt && [
        ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
        ServiceOrderOperativeStatus.CANCELADA,
      ].includes(item.operativeStatus),
    )
    if (!firstReadyItem) {
      this.showMessage("warning", "fas fa-info-circle", "Esta orden no tiene equipos listos para entregar.")
      return
    }
    this.itemDeliveryTarget = { order: serviceOrder, selectedItemId: firstReadyItem.id }
  }

  handleItemDeliverySaved(order: ServiceOrder): void {
    this.itemDeliveryTarget = null
    this.replaceServiceOrderInState(order)
    this.showMessage(
      "success",
      "fas fa-check-circle",
      order.operativeStatus === ServiceOrderOperativeStatus.ENTREGADA
        ? "Todos los equipos activos fueron entregados."
        : "Entrega registrada. La orden todavía tiene equipos pendientes de devolución.",
    )
  }

  canOpenWarrantyAction(serviceOrder: ServiceOrder): boolean {
    if (!serviceOrder) return false
    if (serviceOrder.operativeStatus !== ServiceOrderOperativeStatus.ENTREGADA) return false
    if (!serviceOrder.clientId) return false
    return serviceOrder.serviceType !== ServiceType.WARRANTY_SERVICE
  }

  openWarrantyActionModal(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenWarrantyAction(serviceOrder)) {
      this.showMessage("warning", "fas fa-info-circle", "Este equipo no es elegible para registrar garantía.")
      return
    }

    this.showWarrantyActionModal = true
    this.isLoadingWarrantyLines = true
    this.warrantyActionError = ""
    this.warrantySourceServiceOrder = serviceOrder
    this.warrantyCoverageLines = []
    this.selectedWarrantyLineIds.clear()

    this.agreementService
      .findAll({ page: 1, limit: 50, serviceOrderId: Number(serviceOrder.id) })
      .pipe(finalize(() => (this.isLoadingWarrantyLines = false)))
      .subscribe({
        next: ({ data }) => {
          const quotes = (data ?? []).filter(
            (quote) => quote.status === ServiceOrderAgreementStatus.CONFIRMED || Boolean(quote.agreedAt),
          )
          if (!quotes.length) {
            this.warrantyActionError = "El equipo no tiene cotizaciones confirmadas para evaluar garantía."
            return
          }

          const sourceQuote = [...quotes].sort((a, b) => {
            const sequenceDiff = Number(b.sequenceNumber ?? 0) - Number(a.sequenceNumber ?? 0)
            if (sequenceDiff !== 0) return sequenceDiff
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })[0]

          const baseDate = sourceQuote.agreedAt
            ? new Date(sourceQuote.agreedAt)
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
    if (!this.warrantySourceServiceOrder) {
      this.warrantyActionError = "No encontramos la orden origen para registrar la garantía."
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
    const assignedToTechnicianId = this.toNumericId(this.warrantySourceServiceOrder.assignedToTechnicianId)
    if (!assignedToTechnicianId) {
      this.warrantyActionError = "La orden origen no tiene un técnico asignado. Asígnalo antes de registrar la garantía."
      return
    }

    const selectedLines = this.warrantyCoverageLines.filter((line) => this.selectedWarrantyLineIds.has(line.id))
    const warrantyNotes = selectedLines.map((line) => `- ${line.label}`).join("\n")
    const sourceOrder = this.warrantySourceServiceOrder
    const sourceItem = sourceOrder.items?.[0]
    if (!sourceItem) {
      this.warrantyActionError = "La orden origen no tiene un equipo disponible para registrar la garantía."
      return
    }

    const payload: ServiceOrderSaveRequest = {
      requestOrigin: RequestOrigin.CLIENT,
      clientId: Number(sourceOrder.clientId),
      assignedToTechnicianId,
      serviceType: ServiceType.WARRANTY_SERVICE,
      notes: `Garantía derivada de ${sourceOrder.code}\nLíneas:\n${warrantyNotes}`,
      items: [{
        priority: sourceItem.priority,
        equipmentType: sourceItem.equipmentType,
        equipmentTypeOther: sourceItem.equipmentTypeOther ?? null,
        brand: sourceItem.brand,
        model: sourceItem.model,
        serialNumber: sourceItem.serialNumber,
        initialIssue: `Garantía de ${sourceOrder.code}`,
        accessories: sourceItem.accessories,
      }],
    }

    this.isCreatingWarrantyOrder = true
    this.warrantyActionError = ""

    this.serviceOrderService
      .create(payload)
      .pipe(finalize(() => (this.isCreatingWarrantyOrder = false)))
      .subscribe({
        next: () => {
          this.showMessage(
            "success",
            "fas fa-check-circle",
            "Orden de garantía creada. El técnico deberá revisar y aceptar o rechazar la garantía.",
          )
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
    this.createServiceOrderCandidates = []
    this.editingCreateServiceOrderCandidateIndex = null
    this.createServiceOrderForm.reset({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: null,
      clientKind: ClientKind.PERSON,
      clientContactId: null,
      documentNumber: "",
      documentTypeId: null,
      companyName: "",
      companyTradeName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: "",
      priority: ServiceOrderPriority.LOW,
      assignedToTechnicianId: null,
      notes: "",
      equipmentType: EquipmentType.LAPTOP,
      equipmentTypeOther: "",
      brand: "",
      model: "",
      serialNumber: "",
      initialIssue: "",
      accessories: "",
    })
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.isSearchingPartner = false
    this.assignmentSuggestion = null
    this.assignmentSuggestionError = ""
    this.createOrderAgreementItemsByItemIndex = {}
    this.createOrderProductPriceLoadingByItemIndex = {}
    this.setCustomerFieldsEnabled(true)
    this.syncDocumentNumberAvailability()
    const restoredDraft = this.restoreCreateServiceOrderDraft()
    this.loadTechnicianAssignmentSuggestion(restoredDraft)
    if (restoredDraft) {
      this.showMessage("info", "fas fa-history", "Recuperamos el borrador de la orden que estabas registrando.")
    }
  }

  closeCreateServiceOrderModal(preserveDraft = true): void {
    if (preserveDraft) {
      this.saveCreateServiceOrderDraft()
    } else {
      this.clearCreateServiceOrderDraft()
    }
    this.showCreateServiceOrderModal = false
    this.createServiceOrderStep = 0
    this.createServiceOrderCandidates = []
    this.editingCreateServiceOrderCandidateIndex = null
    this.createServiceOrderForm.reset({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: null,
      clientKind: ClientKind.PERSON,
      clientContactId: null,
      documentNumber: "",
      documentTypeId: null,
      companyName: "",
      companyTradeName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: "",
      priority: ServiceOrderPriority.LOW,
      assignedToTechnicianId: null,
      notes: "",
      equipmentType: EquipmentType.LAPTOP,
      equipmentTypeOther: "",
      brand: "",
      model: "",
      serialNumber: "",
      initialIssue: "",
      accessories: "",
    })
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.isSearchingPartner = false
    this.assignmentSuggestion = null
    this.assignmentSuggestionError = ""
    this.createOrderAgreementItemsByItemIndex = {}
    this.createOrderProductPriceLoadingByItemIndex = {}
    this.setCustomerFieldsEnabled(true)
    this.syncDocumentNumberAvailability()
  }

  discardCreateServiceOrderDraft(): void {
    this.closeCreateServiceOrderModal(false)
  }

  private applyClientContact(partnerId: number | null): void {
    if (this.isInternalRequestOrigin()) {
      this.createServiceOrderForm.patchValue(
        { clientId: null, contactName: "", contactEmail: "", contactPhone: "", contactPhoneCountry: DEFAULT_PHONE_COUNTRY, contactPhoneNationalNumber: "" },
        { emitEvent: false },
      )
      return
    }
    if (!partnerId) {
      this.createServiceOrderForm.patchValue(
        { contactName: "", contactEmail: "", contactPhone: "", contactPhoneCountry: DEFAULT_PHONE_COUNTRY, contactPhoneNationalNumber: "" },
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
    this.syncPhoneControls(this.createServiceOrderForm)
    // Validate shared context fields only (equipment is already captured in candidates)
    const sharedContextFields = [
      "requestOrigin", "workflowServiceType", "assignedToTechnicianId",
      "contactName", "contactPhone", "contactEmail", "documentTypeId",
    ]
    if (!this.areControlsValid(sharedContextFields)) {
      this.markControlsAsTouched(sharedContextFields)
      return
    }

    const formValue = this.createServiceOrderForm.getRawValue()
    if (!this.validateCreateServiceOrderInitialAgreement()) {
      return
    }

    // Capture the current equipment if it has not been added to the order yet.
    if (this.editingCreateServiceOrderCandidateIndex === null || this.createServiceOrderCandidates.length === 0) {
      if (this.areCurrentCreateOrderItemControlsValid() && this.validateCreateServiceOrderInitialAgreement()) {
        this.addCurrentEquipmentToCreateOrder()
      }
    }

    if (!this.createServiceOrderCandidates.length) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Agrega al menos un equipo antes de confirmar.")
      return
    }

    this.isCreatingServiceOrder = true
    this.resolveClientId(formValue)
      .pipe(
        switchMap(({ clientId, clientContactId }) => {
          this.syncCandidateCommercialDrafts()
          const payload: ServiceOrderSaveRequest = {
            requestOrigin: formValue.requestOrigin,
            clientId: clientId || null,
            clientContactId: clientContactId ?? null,
            assignedToTechnicianId: this.toNumericId(formValue.assignedToTechnicianId)!,
            serviceType: formValue.workflowServiceType,
            contactName: String(formValue.contactName ?? '').trim(),
            contactPhone: normalizeOptionalPhone(formValue.contactPhone),
            contactEmail: String(formValue.contactEmail ?? '').trim() || null,
            items: this.createServiceOrderCandidates.map((candidate) => ({
              equipmentType: candidate.equipmentType,
              equipmentTypeOther: candidate.equipmentTypeOther,
              brand: candidate.brand,
              model: candidate.model,
              serialNumber: candidate.serialNumber,
              accessories: candidate.accessories,
              initialIssue: candidate.initialIssue,
              priority: candidate.priority,
              notes: candidate.notes,
              initialCommercial: this.buildInitialCommercialRequest(candidate),
            })),
          }
          return this.serviceOrderService.create(payload)
        }),
        finalize(() => (this.isCreatingServiceOrder = false)),
      )
      .subscribe({
        next: (response) => {
          const itemsCount = response.items?.length ?? response.itemsCount ?? this.createServiceOrderCandidates.length
          this.showMessage(
            "success",
            "fas fa-check-circle",
            `Orden ${response.code} creada correctamente con ${itemsCount} ${itemsCount === 1 ? "equipo" : "equipos"}.`,
          )
          this.closeCreateServiceOrderModal(false)
          this.loadServiceOrders()
        },
        error: () => {
          this.saveCreateServiceOrderDraft()
          this.showMessage("danger", "fas fa-times-circle", "No pudimos crear la orden. Conservamos tu borrador para reintentar.")
        },
      })
  }

  private resolveClientId(formValue: Record<string, any>): Observable<{ clientId: number | null; clientContactId: number | null }> {
    if (formValue["requestOrigin"] === RequestOrigin.INTERNAL) {
      return of({ clientId: null, clientContactId: null })
    }

    const workflowServiceType = this.getSelectedWorkflowServiceType()
    const existingPartnerId = Number(this.createServiceOrderForm.get("clientId")?.value)
    if (existingPartnerId) {
      const existingPartner = this.clients.find((client) => Number(client.id) === existingPartnerId) ?? null
      const existingContactId = this.toNumericId(this.createServiceOrderForm.get("clientContactId")?.value)
      if ((existingPartner?.kind ?? formValue["clientKind"]) === ClientKind.COMPANY && !existingContactId) {
        if (!existingPartner) {
          this.showMessage(
            "warning",
            "fas fa-exclamation-circle",
            "No pudimos resolver la empresa seleccionada. Vuelve a buscarla antes de continuar.",
          )
          return throwError(() => new Error("Empresa no resuelta"))
        }
        return this.persistInlineContactForExistingCompany(existingPartner)
      }
      return of({ clientId: existingPartnerId, clientContactId: existingContactId })
    }

    const documentNumber = String(this.createServiceOrderForm.get("documentNumber")?.value ?? "").trim()
    const documentTypeId = Number(this.createServiceOrderForm.get("documentTypeId")?.value)
    const contactName = String(this.createServiceOrderForm.get("contactName")?.value ?? "").trim()
    const contactPhone = normalizeOptionalPhone(this.createServiceOrderForm.get("contactPhone")?.value)

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
      name: formValue['clientKind'] === ClientKind.COMPANY
        ? (String(formValue['companyName'] ?? "").trim() || contactName)
        : contactName,
      tradeName: formValue['clientKind'] === ClientKind.COMPANY
        ? (String(formValue['companyTradeName'] ?? "").trim() || null)
        : contactName,
      kind: formValue['clientKind'] ?? ClientKind.PERSON,
      documentTypeId,
      documentNumber,
      email: String(this.createServiceOrderForm.get("contactEmail")?.value ?? "").trim() || null,
      phone: normalizeOptionalPhone(this.createServiceOrderForm.get("contactPhone")?.value),
      address: null,
      city: null,
      country: null,
      contacts: [{
        name: contactName,
        email: String(this.createServiceOrderForm.get("contactEmail")?.value ?? "").trim() || null,
        phone: normalizeOptionalPhone(this.createServiceOrderForm.get("contactPhone")?.value),
        isPrimary: true,
      }],
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
        const primaryContact = partner.contacts?.find((c) => c.isPrimary) ?? partner.contacts?.[0]
        this.createServiceOrderForm.patchValue({
          clientId: Number(partner.id),
          clientContactId: primaryContact ? Number(primaryContact.id) : null,
        })
        this.documentSearchMessage = "Cliente creado correctamente."
        this.documentSearchError = ""
      }),
      map((partner) => {
        const primaryContact = partner.contacts?.find((c) => c.isPrimary) ?? partner.contacts?.[0]
        return {
          clientId: Number(partner.id),
          clientContactId: primaryContact ? Number(primaryContact.id) : null,
        }
      }),
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
    this.syncClientInCache(partner)
    const documentTypeId = partner.documentTypeId ?? partner.documentType?.id ?? null
    const kind = partner.kind ?? ClientKind.PERSON
    const contacts = partner.contacts ?? []
    const primaryContact = contacts.find((c) => c.isPrimary && c.isActive !== false) ?? contacts[0] ?? null

    // Primero: aplica todo excepto clientContactId
    this.createServiceOrderForm.patchValue(
      {
        clientId: Number(partner.id),
        clientKind: kind,
        clientContactId: null,           // ← null primero
        documentNumber: partner.documentNumber ?? "",
        documentTypeId: documentTypeId,
        companyName: kind === ClientKind.COMPANY ? (partner.name ?? "") : "",
        companyTradeName: kind === ClientKind.COMPANY ? (partner.tradeName ?? "") : "",
        contactName: kind === ClientKind.COMPANY && !primaryContact
          ? ""
          : primaryContact
          ? primaryContact.name
          : (partner.name ?? partner.tradeName ?? partner.documentNumber ?? ""),
        contactEmail: kind === ClientKind.COMPANY && !primaryContact ? "" : (primaryContact?.email ?? partner.email ?? ""),
        contactPhone: "",
        contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
        contactPhoneNationalNumber: "",
      },
      { emitEvent: false },
    )
    this.patchPhoneControls(this.createServiceOrderForm, primaryContact?.phone ?? partner.phone ?? "", { emitEvent: false })

    this.updateExpectedDocumentDigits(documentTypeId)
    this.documentSearchMessage = "Cliente encontrado. Datos completados automáticamente."
    this.documentSearchError = ""
    this.setCustomerFieldsEnabled(false)

    if (kind === ClientKind.COMPANY && !primaryContact) {
      this.enableCompanyInlineContactFields()
    } else if (!partner.phone && !primaryContact?.phone) {
      this.createServiceOrderForm.get("contactPhone")?.enable({ emitEvent: false })
      this.createServiceOrderForm.get("contactPhoneCountry")?.enable({ emitEvent: false })
      this.createServiceOrderForm.get("contactPhoneNationalNumber")?.enable({ emitEvent: false })
    }

    // Segundo: forzar render del *ngIf ANTES de asignar el contacto seleccionado
    this.cdr.detectChanges()

    // Tercero: asignar el contactId DESPUÉS de que las <option> ya existen en el DOM
    if (primaryContact) {
      setTimeout(() => {
        this.createServiceOrderForm.patchValue(
          { clientContactId: String(primaryContact.id) },
          { emitEvent: false }
        )
        this.cdr.detectChanges()
      }, 0)
    }
  }

  private updateExpectedDocumentDigits(documentTypeId: number | null): void {
    const docType = this.documentTypes.find((type) => Number(type.id) === Number(documentTypeId))
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
        clientContactId: null,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
        contactPhoneNationalNumber: "",
      },
      { emitEvent: false },
    )
    this.setCustomerFieldsEnabled(true)
  }

  getClientContactOptions(): ClientContactResponse[] {
    const clientId = Number(this.createServiceOrderForm.get("clientId")?.value)
    if (!clientId) return []
    const client = this.clients.find((c) => Number(c.id) === clientId)
    return client?.contacts?.filter((c) => c.isActive !== false) ?? []
  }

  isExistingCompanyClient(): boolean {
    const clientId = Number(this.createServiceOrderForm.get("clientId")?.value)
    if (!clientId) return false
    const client = this.clients.find((item) => Number(item.id) === clientId)
    return (client?.kind ?? this.createServiceOrderForm.get("clientKind")?.value) === ClientKind.COMPANY
  }

  shouldShowCompanyContactSelector(): boolean {
    return this.isExistingCompanyClient() && this.getClientContactOptions().length > 0
  }

  shouldShowCompanyContactEmptyState(): boolean {
    return this.isExistingCompanyClient() && this.getClientContactOptions().length === 0
  }

  onClientContactSelectionChange(): void {
    const contactId = Number(this.createServiceOrderForm.get("clientContactId")?.value)
    if (!contactId) {
      this.createServiceOrderForm.patchValue({
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
        contactPhoneNationalNumber: "",
      }, { emitEvent: false })
      const controls = ["contactName", "contactEmail", "contactPhone", "contactPhoneCountry", "contactPhoneNationalNumber"]
      controls.forEach((name) => {
        const ctrl = this.createServiceOrderForm.get(name)
        if (ctrl && ctrl.disabled) ctrl.enable({ emitEvent: false })
      })
      return
    }
    const contact = this.getClientContactOptions().find((c) => Number(c.id) === contactId)
    if (contact) {
      this.setCustomerFieldsEnabled(false)
      this.createServiceOrderForm.patchValue({
        contactName: contact.name,
        contactEmail: contact.email ?? "",
        contactPhone: "",
        contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
        contactPhoneNationalNumber: "",
      }, { emitEvent: false })
      this.patchPhoneControls(this.createServiceOrderForm, contact.phone ?? "", { emitEvent: false })
    }
  }

  downloadServiceOrderSummaryPdf(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.serviceOrderDocuments.downloadOrderSummaryPdf(Number(serviceOrder.id)).subscribe({
      error: () => {
        this.showMessage("danger", "fas fa-times-circle", "No pudimos generar el resumen PDF de la orden.")
      },
    })
  }

  printServiceOrderSticker(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.loadServiceOrderDocumentContext(serviceOrder).subscribe({
      next: ({ fullOrder, quote }) => {
        this.serviceOrderDocuments.openEquipmentStickerPdf({
          serviceOrder: fullOrder,
          agreement: quote,
        })
      },
      error: () => {
        this.showMessage("danger", "fas fa-times-circle", "No pudimos generar el sticker de la orden.")
      },
    })
  }

  openCreateServiceOrderAgreementModal(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.agreementServiceOrder = serviceOrder
    this.selectedServiceOrder = serviceOrder
    this.selectedServiceOrderId = Number(serviceOrder.id)
    this.loadCurrentDiagnosis(this.selectedServiceOrderId)
    this.quoteItems = this.buildDefaultAgreementItems(serviceOrder)
    this.isResubmittingServiceOrderAgreement = false
    this.isEditingDraftServiceOrderAgreement = false
    this.selectedServiceOrderAgreementDetail = null
    this.showCreateServiceOrderAgreementModal = true
    this.createServiceOrderAgreementForm.reset({ currency: "PEN", notes: "" })
  }

  closeCreateServiceOrderAgreementModal(): void {
    this.showCreateServiceOrderAgreementModal = false
    this.createServiceOrderAgreementForm.reset()
    this.quoteItems = []
    this.selectedServiceOrderId = null
    this.selectedServiceOrder = null
    this.agreementServiceOrder = null
    this.isResubmittingServiceOrderAgreement = false
    this.isEditingDraftServiceOrderAgreement = false
    this.selectedServiceOrderAgreementDetail = null
    this.currentDiagnosis = null
  }

  addProductToServiceOrderAgreement(): void {
    this.quoteItems.push(this.createProductComposer())
  }

  addServiceToServiceOrderAgreement(): void {
    this.ensureTechnicalServiceLine(this.quoteItems)
  }

  updateTechnicalServiceAmount(item: ServiceOrderAgreementServiceComposer, value: any): void {
    const numericValue = Number(value)
    item.unitPrice = Number.isFinite(numericValue) ? numericValue : TECHNICAL_SERVICE_OPTION.price
  }

  onProductSelected(item: ServiceOrderAgreementProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (item.productId) {
      this.fetchProductPrice(item)
    } else {
      item.unitPrice = 0
    }
  }

  onProductQuantityChange(item: ServiceOrderAgreementProductComposer, value: any): void {
    const qty = Number(value) || 1
    item.quantity = qty
    if (item.productId) {
      this.fetchProductPrice(item)
    }
  }

  fetchProductPrice(item: ServiceOrderAgreementProductComposer): void {
    if (!item.productId) {
      return
    }
    this.productPriceLoading[item.id] = true
    this.pricingQuery
      .calculatePrice(item.productId)
      .pipe(finalize(() => (this.productPriceLoading[item.id] = false)))
      .subscribe({
        next: (res) => {
          item.recommendedPrice = Number(res?.recommendedPrice ?? res?.salePriceWithIgv ?? 0)
          item.minAllowedPrice = Number(res?.minAllowedPrice ?? 0)
          item.unitPrice = item.recommendedPrice
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

  removeServiceOrderAgreementItem(index: number, collection: ServiceOrderAgreementComposerItem[] = this.quoteItems): void {
    collection.splice(index, 1)
  }

  calculateItemSubtotal(item: ServiceOrderAgreementComposerItem): number {
    if (this.isWarrantyServiceOrderAgreementContext()) {
      return 0
    }
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    if (this.isNonBillableServiceContext()) {
      return 0
    }
    return Number(item.unitPrice ?? TECHNICAL_SERVICE_OPTION.price)
  }

  calculateServiceOrderAgreementTotal(): number {
    if (this.isWarrantyServiceOrderAgreementContext()) {
      return 0
    }
    return this.quoteItems.reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
  }

  isWarrantyServiceOrderAgreementContext(): boolean {
    return this.selectedServiceOrder?.serviceType === ServiceType.WARRANTY_SERVICE
  }

  isNonBillableServiceContext(): boolean {
    return [ServiceType.CUSTOMER_SERVICE, ServiceType.WARRANTY_SERVICE].includes(
      this.selectedServiceOrder?.serviceType as ServiceType,
    )
  }

  submitCreateServiceOrderAgreement(): void {
    if (this.isEditingDraftServiceOrderAgreement) {
      this.submitUpdateDraftServiceOrderAgreement()
      return
    }

    if (this.isResubmittingServiceOrderAgreement) {
      this.submitResubmitServiceOrderAgreement()
      return
    }

    if (this.createServiceOrderAgreementForm.invalid || this.quoteItems.length === 0 || !this.selectedServiceOrderId) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Selecciona la orden y completa los datos de la cotización.")
      return
    }

    const payload = this.buildServiceOrderAgreementPayload(
      Number(this.selectedServiceOrderId),
      this.selectedServiceOrder?.serviceType ?? ServiceType.DIAGNOSIS,
      this.quoteItems,
      this.createServiceOrderAgreementForm.get("notes")?.value,
    )

    if ((payload.products?.length ?? 0) === 0 && Number(payload.technicalServiceAmount ?? 0) <= 0) {
      this.showMessage("warning", "fas fa-info-circle", "Agrega por lo menos un producto o servicio válido.")
      return
    }

    this.isCreatingServiceOrderAgreement = true
    this.agreementService
      .create(payload)
      .pipe(finalize(() => (this.isCreatingServiceOrderAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización registrada correctamente.")
          this.closeCreateServiceOrderAgreementModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos crear la cotización.")
        },
      })
  }

  viewServiceOrderAgreements(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.serviceOrderAgreementsServiceOrder = serviceOrder
    this.serviceOrderItemQuotes = []
    this.serviceOrderAgreementsError = ""
    this.quoteDetailError = ""
    this.selectedServiceOrderAgreementDetail = null
    this.showServiceOrderAgreementsModal = true
    this.isLoadingServiceOrderAgreements = true

    this.agreementService
      .findAll({ page: 1, limit: 20, serviceOrderId: Number(serviceOrder.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreements = false)))
      .subscribe({
        next: ({ data }) => {
          this.serviceOrderItemQuotes = data ?? []
        },
        error: () => {
          this.serviceOrderAgreementsError = "No pudimos cargar las cotizaciones de esta orden."
        },
      })
  }

  refreshServiceOrderAgreementsForCurrentItem(): void {
    if (!this.serviceOrderAgreementsServiceOrder) return
    this.isLoadingServiceOrderAgreements = true
    this.agreementService
      .findAll({ page: 1, limit: 20, serviceOrderId: Number(this.serviceOrderAgreementsServiceOrder.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreements = false)))
      .subscribe({
        next: ({ data }) => {
          this.serviceOrderItemQuotes = data ?? []
          if (this.selectedServiceOrderAgreementDetail) {
            const updated = this.serviceOrderItemQuotes.find((q) => q.id === this.selectedServiceOrderAgreementDetail?.id)
            if (updated) this.selectedServiceOrderAgreementDetail = updated
          }
        },
        error: () => {
          this.serviceOrderAgreementsError = "No pudimos actualizar las cotizaciones de esta orden."
        },
      })
  }

  refreshServiceOrderAgreementDetail(quoteId: number): void {
    this.isLoadingServiceOrderAgreementDetail = true
    this.agreementService
      .findOne(quoteId)
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreementDetail = false)))
      .subscribe({
        next: (updatedServiceOrderAgreement) => {
          const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === updatedServiceOrderAgreement.id)
          if (index >= 0) {
            this.serviceOrderItemQuotes[index] = updatedServiceOrderAgreement
          }
          if (this.selectedServiceOrderAgreementDetail?.id === updatedServiceOrderAgreement.id) {
            this.selectedServiceOrderAgreementDetail = updatedServiceOrderAgreement
          }
        },
        error: () => {
          this.quoteDetailError = "No pudimos refrescar el detalle de la cotización."
        },
      })
  }

  canRecordClientDecision(link: ServiceOrderAgreementItemLink): boolean {
    return link.commercialVersion?.status === "DRAFT" || link.commercialVersion?.status === "ISSUED"
  }

  canEditCommercialDiscounts(link: ServiceOrderAgreementItemLink): boolean {
    return this.canRecordClientDecision(link) && Boolean(link.commercialVersion?.lines?.length)
  }

  getCommercialItemLabel(link: ServiceOrderAgreementItemLink): string {
    const item = link.serviceOrderItem
    const equipment = [item?.brand, item?.model].filter(Boolean).join(" ")
    return [item?.code || `Equipo #${link.serviceOrderItemId}`, equipment].filter(Boolean).join(" · ")
  }

  getCommercialVersionStatusLabel(link: ServiceOrderAgreementItemLink): string {
    const latestDecision = [...(link.commercialVersion?.decisions ?? [])].sort(
      (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
    )[0]
    if (latestDecision?.decision === "CHANGES_REQUESTED") return "Cambios solicitados"
    if (latestDecision?.decision === "ACCEPTED" || link.commercialVersion?.status === "ACCEPTED") return "Aceptado"
    return "Pendiente de respuesta"
  }

  getCommercialDecisionAuditLabel(link: ServiceOrderAgreementItemLink): string | null {
    const latestDecision = [...(link.commercialVersion?.decisions ?? [])].sort(
      (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
    )[0]
    if (!latestDecision) return null
    const channels: Record<string, string> = {
      WHATSAPP: "WhatsApp",
      PHONE: "Llamada telefónica",
      IN_PERSON: "Presencial",
      EMAIL: "Correo electrónico",
      OTHER: "Otro canal",
    }
    const recorder = latestDecision.recordedByUser?.name || `usuario #${latestDecision.recordedByUserId}`
    return `${channels[latestDecision.channel] ?? latestDecision.channel} · registrado por ${recorder}`
  }

  openClientDecisionModal(link: ServiceOrderAgreementItemLink): void {
    if (!this.canRecordClientDecision(link) || !link.commercialVersion) {
      this.showMessage("warning", "fas fa-info-circle", "Esta versión ya no admite nuevas decisiones.")
      return
    }
    this.clientDecisionTarget = {
      commercialVersionId: Number(link.commercialVersionId),
      itemLabel: this.getCommercialItemLabel(link),
      versionNumber: Number(link.commercialVersion.versionNumber),
      totalAmount: Number(link.commercialVersion.totalAmount),
    }
  }

  openLineDiscountModal(link: ServiceOrderAgreementItemLink): void {
    const version = link.commercialVersion
    const serviceOrderId = this.selectedServiceOrderAgreementDetail?.serviceOrderId
    if (!this.canEditCommercialDiscounts(link) || !version || !serviceOrderId) {
      this.showMessage("warning", "fas fa-info-circle", "Esta versión no admite cambios de descuento.")
      return
    }
    this.lineDiscountTarget = {
      serviceOrderId: Number(serviceOrderId),
      serviceOrderItemId: Number(link.serviceOrderItemId),
      itemLabel: this.getCommercialItemLabel(link),
      baseVersionId: Number(link.commercialVersionId),
      versionNumber: Number(version.versionNumber),
      notes: version.notes ?? null,
      lines: version.lines,
    }
  }

  handleLineDiscountRevisionCreated(agreement: ServiceOrderAgreement): void {
    this.lineDiscountTarget = null
    this.refreshServiceOrderAgreementsForCurrentItem()
    this.refreshServiceOrderAgreementDetail(agreement.id)
    this.loadServiceOrders()
    this.showMessage("success", "fas fa-check-circle", "Se creó una nueva versión con los descuentos actualizados.")
  }

  handleClientDecisionRecorded(result: ServiceOrderClientDecisionResult): void {
    const message = result.decision.decision === "CHANGES_REQUESTED"
      ? "Se registró que el cliente solicita cambios para este equipo."
      : result.allAccepted
        ? "Se registró la aceptación y la cotización consolidada quedó confirmada."
        : "Se registró la aceptación de este equipo. Los demás equipos siguen pendientes."
    this.clientDecisionTarget = null
    this.lineDiscountTarget = null
    const agreementId = this.selectedServiceOrderAgreementDetail?.id
    if (agreementId) this.refreshServiceOrderAgreementDetail(agreementId)
    this.loadServiceOrders()
    this.showMessage("success", "fas fa-check-circle", message)
  }

  applyServiceOrderAgreementStatusFromError(quoteId: number, error: any): boolean {
    const rawMessage = error?.error?.message ?? error?.message ?? ""
    const message =
      Array.isArray(rawMessage)
        ? rawMessage.join(" ").toLowerCase()
        : JSON.stringify(error?.error ?? rawMessage ?? "").toLowerCase()
    let nextStatus: ServiceOrderAgreementStatus | null = null
    if (message.includes("already rejected by client") || message.includes("already voided")) {
      nextStatus = ServiceOrderAgreementStatus.VOIDED
    } else if (message.includes("already approved by client") || message.includes("already confirmed")) {
      nextStatus = ServiceOrderAgreementStatus.CONFIRMED
    }
    if (!nextStatus) return false
    const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === quoteId)
    if (index >= 0) {
      this.serviceOrderItemQuotes[index] = { ...this.serviceOrderItemQuotes[index], status: nextStatus }
    }
    if (this.selectedServiceOrderAgreementDetail?.id === quoteId) {
      this.selectedServiceOrderAgreementDetail = { ...this.selectedServiceOrderAgreementDetail, status: nextStatus }
    }
    return true
  }

  closeServiceOrderAgreementsModal(): void {
    this.showServiceOrderAgreementsModal = false
    this.serviceOrderItemQuotes = []
    this.serviceOrderAgreementsError = ""
    this.serviceOrderAgreementsServiceOrder = null
    this.selectedServiceOrderAgreementDetail = null
    this.quoteDetailError = ""
    this.clientDecisionTarget = null
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

  getServiceOrderLabel(serviceOrder: ServiceOrder): string {
    const parts = [
      this.getEquipmentTypeLabel(serviceOrder.equipmentType, serviceOrder.equipmentTypeOther),
      serviceOrder.brand || null,
      serviceOrder.model || null,
      serviceOrder.serialNumber ? `SN ${serviceOrder.serialNumber}` : null,
    ].filter(Boolean)
    return parts.join(" · ")
  }

  getOperativeStatusLabel(status: ServiceOrderOperativeStatus): string {
    return SERVICE_ORDER_OPERATIVE_STATUS_LABELS[status] ?? status
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

  private loadServiceOrderAgreementTotal(serviceOrder: ServiceOrder): void {
    const serviceOrderId = Number(serviceOrder.id)
    if (!serviceOrderId || this.itemServiceOrderAgreementTotals[serviceOrderId] !== undefined) {
      return
    }

    this.agreementService
      .findAll({ page: 1, limit: 5, serviceOrderId })
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          const approved = list.find((q: ServiceOrderAgreement) => q.status === ServiceOrderAgreementStatus.CONFIRMED)
          const candidate = approved ?? list[0]
          if (candidate?.totalAmount !== undefined) {
            this.itemServiceOrderAgreementTotals[serviceOrderId] = Number(candidate.totalAmount) || 0
          }
        },
        error: () => {
          // silencio: si falla, se seguirá mostrando el fallback
        },
      })
  }

  getServiceOrderAgreementTotal(serviceOrder: ServiceOrder): number {
    const cached = this.itemServiceOrderAgreementTotals[serviceOrder.id]
    if (cached !== undefined) return cached
    return Number(serviceOrder.totalServiceOrderAgreedAmount ?? 0)
  }

  getServiceOrderAgreementdTotal(serviceOrder: ServiceOrder): number {
    return this.getServiceOrderAgreementTotal(serviceOrder)
  }

  getServiceOrderTechnicalStatusLabel(status: ServiceOrderTechnicalStatus): string {
    return SERVICE_ORDER_TECHNICAL_STATUS_LABELS[status] ?? status
  }

  canServiceOrderAgreement(serviceOrder: ServiceOrder): boolean {
    if (!serviceOrder) return false
    if ([ServiceType.DIAGNOSIS, ServiceType.CUSTOMER_SERVICE].includes(serviceOrder.serviceType)) {
      return serviceOrder.technicalStatus === ServiceOrderTechnicalStatus.DIAGNOSTICADA
    }
    if (serviceOrder.serviceType === ServiceType.STANDARD_SERVICE) {
      return serviceOrder.technicalStatus === ServiceOrderTechnicalStatus.ASIGNADA
    }
    return false
  }

  getEquipmentTypeLabel(type: EquipmentType, equipmentTypeOther?: string | null): string {
    if (type === EquipmentType.OTHER) {
      return this.normalizeOptionalText(equipmentTypeOther) ?? EQUIPMENT_TYPE_LABELS[type] ?? type
    }
    return EQUIPMENT_TYPE_LABELS[type] ?? type
  }

  isOtherEquipmentType(type: EquipmentType | null | undefined): boolean {
    return type === EquipmentType.OTHER
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

  serviceSearchFn = (term: string, item: FixedTechnicalServiceOption): boolean => {
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
      [
        ServiceOrderOperativeStatus.ABIERTA,
        ServiceOrderOperativeStatus.EN_PROCESO,
        ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      ].includes(serviceOrder.operativeStatus),
    ).length
  }

  get registeredEquipmentCount(): number {
    return this.serviceOrders.reduce((total, serviceOrder) => total + (serviceOrder.items?.length ?? 0), 0)
  }

  getCommercialStatusLabel(status: ServiceOrderCommercialStatus): string {
    const labels: Record<ServiceOrderCommercialStatus, string> = {
      [ServiceOrderCommercialStatus.NO_REQUIERE]: "No requiere",
      [ServiceOrderCommercialStatus.PENDIENTE_PROPUESTA]: "Pendiente de propuesta",
      [ServiceOrderCommercialStatus.PROPUESTA_EMITIDA]: "Propuesta emitida",
      [ServiceOrderCommercialStatus.PENDIENTE_RESPUESTA_CLIENTE]: "Pendiente de respuesta",
      [ServiceOrderCommercialStatus.AUTORIZADA]: "Autorizada",
      [ServiceOrderCommercialStatus.RECHAZADA]: "Rechazada",
      [ServiceOrderCommercialStatus.EXPIRADA]: "Expirada",
      [ServiceOrderCommercialStatus.REEMPLAZADA]: "Reemplazada",
    }
    return labels[status] ?? status
  }

  getItemSlaLabel(item: ServiceOrderItem): string {
    if (!item.sla?.targetMinutes) return "Sin plazo configurado"
    if (item.sla.breached) return `Plazo excedido por ${Math.max(item.sla.elapsedMinutes - item.sla.targetMinutes, 0)} min`
    return `${item.sla.remainingMinutes ?? 0} min restantes`
  }

  openEquipmentDetails(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.selectedEquipmentCancellationIds = []
    this.equipmentDetailOrder = order
    this.isLoadingEquipmentDetail = true
    this.serviceOrderService.findOne(Number(order.id)).subscribe({
      next: (detail) => {
        this.equipmentDetailOrder = detail
        this.isLoadingEquipmentDetail = false
      },
      error: () => {
        this.isLoadingEquipmentDetail = false
        this.showMessage("warning", "fas fa-info-circle", "Mostramos la información disponible. No pudimos actualizar el detalle de los equipos.")
      },
    })
  }

  closeEquipmentDetails(): void {
    this.equipmentDetailOrder = null
    this.selectedEquipmentCancellationIds = []
    this.isLoadingEquipmentDetail = false
  }

  get cancellableEquipmentDetailItems(): ServiceOrderItem[] {
    return (this.equipmentDetailOrder?.items ?? []).filter((item) => this.canRequestItemCancellation(item))
  }

  isEquipmentSelectedForCancellation(item: ServiceOrderItem): boolean {
    return this.selectedEquipmentCancellationIds.includes(Number(item.id))
  }

  toggleEquipmentCancellationSelection(item: ServiceOrderItem): void {
    if (!this.canRequestItemCancellation(item)) return
    const itemId = Number(item.id)
    this.selectedEquipmentCancellationIds = this.isEquipmentSelectedForCancellation(item)
      ? this.selectedEquipmentCancellationIds.filter((id) => id !== itemId)
      : [...this.selectedEquipmentCancellationIds, itemId]
  }

  selectAllCancellableEquipment(): void {
    this.selectedEquipmentCancellationIds = this.cancellableEquipmentDetailItems.map((item) => Number(item.id))
  }

  deselectAllCancellableEquipment(): void {
    this.selectedEquipmentCancellationIds = []
  }

  get allCancellableEquipmentSelected(): boolean {
    const items = this.cancellableEquipmentDetailItems
    return items.length > 0 && items.every((item) => this.isEquipmentSelectedForCancellation(item))
  }

  get someCancellableEquipmentSelected(): boolean {
    return this.selectedEquipmentCancellationIds.length > 0 && !this.allCancellableEquipmentSelected
  }

  openSelectedEquipmentCancellation(event?: Event): void {
    event?.stopPropagation()
    const order = this.equipmentDetailOrder
    if (!order || !this.selectedEquipmentCancellationIds.length) return
    const items = (order.items ?? []).filter((item) => this.canRequestItemCancellation(item))
    this.itemCancellationTarget = {
      mode: "REQUEST",
      serviceOrderId: Number(order.id),
      orderCode: order.code,
      items,
      selectedItemIds: [...this.selectedEquipmentCancellationIds],
      selectionLocked: true,
    }
  }

  openEquipmentItemDelivery(order: ServiceOrder, item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    this.itemDeliveryTarget = { order, selectedItemId: item.id }
  }

  get diagnosticPendingServiceOrderAgreementsCount(): number {
    return this.serviceOrders.filter(
      (serviceOrder) =>
        [ServiceType.DIAGNOSIS, ServiceType.CUSTOMER_SERVICE].includes(serviceOrder.serviceType) &&
        serviceOrder.technicalStatus === ServiceOrderTechnicalStatus.DIAGNOSTICADA,
    ).length
  }

  get sentServiceOrderAgreementsCount(): number {
    return this.serviceOrderItemQuotes.filter((q) => Boolean(q.sentToClientAt)).length
  }

  get approvedServiceOrderAgreementsCount(): number {
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

  private markFormGroupAsTouched(control: FormGroup): void {
    Object.keys(control.controls).forEach((key) => {
      const child = control.get(key)
      if (child instanceof FormGroup) {
        this.markFormGroupAsTouched(child)
      } else {
        child?.markAsTouched()
      }
    })
  }

  private createProductComposer(): ServiceOrderAgreementProductComposer {
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

  private createServiceComposer(unitPrice: number = TECHNICAL_SERVICE_OPTION.price): ServiceOrderAgreementServiceComposer {
    return {
      id: Date.now(),
      type: "service",
      serviceId: TECHNICAL_SERVICE_OPTION.id,
      unitPrice,
      notes: "",
    }
  }

  private buildDefaultAgreementItems(serviceOrder: ServiceOrder | null | undefined): ServiceOrderAgreementComposerItem[] {
    return this.buildDefaultAgreementItemsForServiceType(serviceOrder?.serviceType ?? null)
  }

  private buildDefaultAgreementItemsForServiceType(
    serviceType: ServiceType | null | undefined,
  ): ServiceOrderAgreementComposerItem[] {
    if (!serviceType || [ServiceType.CUSTOMER_SERVICE, ServiceType.WARRANTY_SERVICE].includes(serviceType)) {
      return []
    }
    return [this.createServiceComposer()]
  }

  private ensureTechnicalServiceLine(
    collection: ServiceOrderAgreementComposerItem[],
    unitPrice: number = TECHNICAL_SERVICE_OPTION.price,
  ): void {
    const currentService = collection.find(
      (entry): entry is ServiceOrderAgreementServiceComposer => entry.type === "service",
    )
    if (currentService) {
      currentService.serviceId = TECHNICAL_SERVICE_OPTION.id
      currentService.unitPrice = Number(currentService.unitPrice ?? unitPrice) || unitPrice
      return
    }
    collection.unshift(this.createServiceComposer(unitPrice))
  }

  onCreateWorkflowServiceTypeChange(): void {
    const serviceType = this.createServiceOrderForm.get("workflowServiceType")?.value as ServiceType | null
    if (serviceType === ServiceType.ASSEMBLY) {
      this.createServiceOrderForm.patchValue({ requestOrigin: RequestOrigin.INTERNAL }, { emitEvent: false })
      this.clearCreateClientData()
      this.setCustomerFieldsEnabled(false)
    } else if (this.isInternalRequestOrigin()) {
      this.createServiceOrderForm.patchValue({ requestOrigin: RequestOrigin.CLIENT }, { emitEvent: false })
      this.setCustomerFieldsEnabled(true)
    }
    this.createOrderAgreementItemsByItemIndex[0] = this.buildDefaultAgreementItemsForServiceType(serviceType)
    this.loadTechnicianAssignmentSuggestion(true)
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
        key: "assignment",
        label: "Técnico",
        description: "Selecciona al técnico que recibirá al cliente y atenderá la orden.",
      },
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

    if (this.requiresCreateServiceOrderInitialAgreementStep()) {
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

  beginAnotherCreateServiceOrderCandidate(): void {
    if (!this.areCurrentCreateOrderItemControlsValid()) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa los campos obligatorios antes de agregar otro equipo.")
      return
    }
    this.addCurrentEquipmentToCreateOrder()
    this.createServiceOrderStep = 3
  }

  canAddAnotherCreateServiceOrderCandidate(): boolean {
    return (
      this.isCreateServiceOrderStepActive(3) &&
      this.editingCreateServiceOrderCandidateIndex === null
    )
  }

  private resetCreateServiceOrderItemDraft(): void {
    this.editingCreateServiceOrderCandidateIndex = null
    this.createServiceOrderForm.patchValue(this.getEmptyEquipmentDraftSnapshot())
    this.getCreateServiceOrderItemControlNames().forEach((controlName) => {
      const control = this.createServiceOrderForm.get(controlName)
      control?.markAsPristine()
      control?.markAsUntouched()
    })
    this.createOrderAgreementItemsByItemIndex[0] = this.buildDefaultAgreementItemsForServiceType(
      this.getSelectedWorkflowServiceType(),
    )
  }

  private getCreateServiceOrderItemControlNames(): string[] {
    return [
      "priority",
      "equipmentType",
      "equipmentTypeOther",
      "brand",
      "model",
      "serialNumber",
      "initialIssue",
      "accessories",
      "notes",
    ]
  }

  private areCurrentCreateOrderItemControlsValid(): boolean {
    const controlNames = this.getCreateServiceOrderItemControlNames()
    this.markControlsAsTouched(controlNames)
    return this.areControlsValid(controlNames)
  }

  addCurrentEquipmentToCreateOrder(): void {
    if (!this.areCurrentCreateOrderItemControlsValid()) {
      return
    }
    const nextCandidate = this.buildCreateServiceOrderCandidateDraft()
    if (this.editingCreateServiceOrderCandidateIndex !== null) {
      this.createServiceOrderCandidates = this.createServiceOrderCandidates.map((entry, index) =>
        index === this.editingCreateServiceOrderCandidateIndex ? nextCandidate : entry,
      )
    } else {
      this.createServiceOrderCandidates = [...this.createServiceOrderCandidates, nextCandidate]
    }
    this.resetCreateServiceOrderItemDraft()
  }

  private buildCreateServiceOrderCandidateDraft(): CreateServiceOrderCandidateDraft {
    const formValue = this.createServiceOrderForm.getRawValue()
    return {
      equipmentType: formValue.equipmentType,
      equipmentTypeOther: formValue.equipmentTypeOther || null,
      brand: formValue.brand || null,
      model: formValue.model || null,
      serialNumber: formValue.serialNumber || null,
      accessories: formValue.accessories || null,
      initialIssue: formValue.initialIssue,
      priority: formValue.priority ?? ServiceOrderPriority.LOW,
      notes: formValue.notes || null,
      quoteItems: (this.createOrderAgreementItemsByItemIndex[0] || []).map((item) => ({ ...item })),
    }
  }

  editCreateServiceOrderCandidate(index: number): void {
    const candidate = this.createServiceOrderCandidates[index]
    if (!candidate) return
    this.editingCreateServiceOrderCandidateIndex = index
    this.createServiceOrderForm.patchValue({
      equipmentType: candidate.equipmentType,
      equipmentTypeOther: candidate.equipmentTypeOther || "",
      brand: candidate.brand || "",
      model: candidate.model || "",
      serialNumber: candidate.serialNumber || "",
      accessories: candidate.accessories || "",
      initialIssue: candidate.initialIssue,
      priority: candidate.priority,
      notes: candidate.notes || "",
    })
    this.createOrderAgreementItemsByItemIndex[0] = candidate.quoteItems.map(item => ({ ...item }))
    if (this.requiresCreateServiceOrderInitialAgreementStep()) {
      this.ensureTechnicalServiceLine(this.createOrderAgreementItemsByItemIndex[0])
    }
    this.createServiceOrderStep = 3
  }

  removeCreateServiceOrderCandidate(index: number): void {
    this.createServiceOrderCandidates = this.createServiceOrderCandidates.filter((_, i) => i !== index)
    if (this.editingCreateServiceOrderCandidateIndex !== null) {
      if (this.editingCreateServiceOrderCandidateIndex === index) {
        this.editingCreateServiceOrderCandidateIndex = null
      } else if (this.editingCreateServiceOrderCandidateIndex > index) {
        this.editingCreateServiceOrderCandidateIndex -= 1
      }
    }
  }

  getSavedEquipmentCards(): Array<{
    index: number
    typeLabel: string
    brandModel: string
    serialNumber: string | null
  }> {
    return this.createServiceOrderCandidates.map((candidate, index) => ({
      index,
      typeLabel: this.getEquipmentTypeLabel(candidate.equipmentType),
      brandModel: [candidate.brand, candidate.model].filter(Boolean).join(" ") || "Sin marca/modelo",
      serialNumber: candidate.serialNumber,
    }))
  }

  deleteEquipmentCard(index: number, event: Event): void {
    event.stopPropagation()
    this.removeCreateServiceOrderCandidate(index)
  }

  isOnConfirmationStep(): boolean {
    return this.isLastCreateServiceOrderStep()
  }

  getCreateOrderSummaryItems(): Array<{
    index: number
    equipmentTypeLabel: string
    serviceTypeLabel: string
    priorityLabel: string
    description: string
    brand: string | null
    model: string | null
    serialNumber: string | null
    accessories: string | null
    notes: string | null
    quoteItems: ServiceOrderAgreementComposerItem[]
    quoteItemsCount: number
    quoteTotal: number
  }> {
    return this.createServiceOrderCandidates.map((candidate, index) => ({
      index,
      equipmentTypeLabel: this.getEquipmentTypeLabel(candidate.equipmentType),
      serviceTypeLabel: this.getServiceTypeLabel(this.getSelectedWorkflowServiceType()),
      priorityLabel: this.getPriorityLabel(candidate.priority),
      description: candidate.initialIssue,
      brand: candidate.brand,
      model: candidate.model,
      serialNumber: candidate.serialNumber,
      accessories: candidate.accessories,
      notes: candidate.notes,
      quoteItems: candidate.quoteItems,
      quoteItemsCount: candidate.quoteItems.length,
      quoteTotal: this.calculateQuoteItemsTotal(candidate.quoteItems),
    }))
  }

  getCreateOrderCandidateQuoteItems(index: number): ServiceOrderAgreementComposerItem[] {
    return this.createServiceOrderCandidates[index]?.quoteItems || []
  }

  calculateQuoteItemsTotal(items: ServiceOrderAgreementComposerItem[]): number {
    return items.reduce((total, item) => {
      const qty = item.type === "product" ? (item as any).quantity || 1 : 1
      return total + (item.unitPrice || 0) * qty
    }, 0)
  }

  calculateCreateOrderGrandTotal(): number {
    return this.createServiceOrderCandidates.reduce(
      (total, candidate) => total + this.calculateQuoteItemsTotal(candidate.quoteItems),
      0,
    )
  }

  nextCreateServiceOrderStep(): void {
    const steps = this.getCreateServiceOrderSteps()
    const currentStep = this.getCurrentCreateServiceOrderStep().key
    if (!this.validateCurrentCreateServiceOrderStep()) {
      return
    }
    if (currentStep === "items" && this.requiresCreateServiceOrderInitialAgreementStep()) {
      this.prepareCandidateCommercialDrafts()
    } else if (currentStep === "initialQuote") {
      this.syncCandidateCommercialDrafts()
    }
    const nextStep = Math.min(this.createServiceOrderStep + 1, steps.length - 1)
    this.createServiceOrderStep = nextStep
    this.saveCreateServiceOrderDraft()
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

  getEquipmentPhysicalExitLabel(item: ServiceOrderItem): string {
    if (!item.deliveredAt) {
      return item.operativeStatus === ServiceOrderOperativeStatus.CANCELADA
        ? "Pendiente de devolución"
        : "Pendiente de entrega"
    }
    return item.operativeStatus === ServiceOrderOperativeStatus.CANCELADA
      ? "Devuelto"
      : "Entregado"
  }

  canSendPickupReminder(item: ServiceOrderItem): boolean {
    return !item.deliveredAt && Boolean(item.readyForPickupAt || item.cancelledAt)
  }

  sendEquipmentPickupReminder(order: ServiceOrder, item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!this.canSendPickupReminder(item)) return
    this.serviceOrderService.sendPickupReminder(Number(order.id), [Number(item.id)]).subscribe({
      next: () => this.showMessage('success', 'fas fa-paper-plane', 'Recordatorio de recojo enviado al cliente.'),
      error: (error) => this.showMessage(
        'error',
        'fas fa-exclamation-circle',
        error?.error?.message || 'No pudimos enviar el recordatorio de recojo.',
      ),
    })
  }

  handleItemCancellationSaved(result: ServiceOrderCancellationResult): void {
    this.itemCancellationTarget = null
    this.selectedServiceOrder = result.order
    if (this.equipmentDetailOrder?.id === result.order.id) {
      this.equipmentDetailOrder = result.order
      this.selectedEquipmentCancellationIds = []
    }
    this.loadServiceOrders()
    if (this.showServiceOrderAgreementsModal && this.serviceOrderAgreementsServiceOrder?.id === result.order.id) {
      this.serviceOrderAgreementsServiceOrder = result.order
    }
    const isBatch = "requests" in result
    const pending = !isBatch && ["PENDING", "AWAITING_CLIENT_ACCEPTANCE"].includes(result.request.status)
    const cancelledCount = isBatch ? result.requests.length : 1
    this.showMessage(
      "success",
      "fas fa-check-circle",
      pending
        ? "La cancelación quedó pendiente de revisión por supervisión."
        : isBatch && result.chargedItemsCount > 0
          ? `${cancelledCount} equipo(s) cancelados. Se registró S/ ${result.chargeTotal.toFixed(2)} pendiente de pago.`
          : `${cancelledCount} equipo(s) cancelados correctamente.`,
    )
  }

  previousCreateServiceOrderStep(): void {
    if (this.getCurrentCreateServiceOrderStep().key === "initialQuote") {
      this.syncCandidateCommercialDrafts()
    }
    this.createServiceOrderStep = Math.max(this.createServiceOrderStep - 1, 0)
    this.saveCreateServiceOrderDraft()
  }

  private saveCreateServiceOrderDraft(): void {
    if (!this.showCreateServiceOrderModal || this.isRestoringCreateServiceOrderDraft) {
      return
    }

    const draft: CreateServiceOrderDraft = {
      version: 2,
      updatedAt: Date.now(),
      step: this.createServiceOrderStep,
      formValue: this.createServiceOrderForm.getRawValue(),
      candidates: this.createServiceOrderCandidates,
      editingCandidateIndex: this.editingCreateServiceOrderCandidateIndex,
      agreementItemsByItemIndex: this.createOrderAgreementItemsByItemIndex,
    }

    try {
      localStorage.setItem(this.getCreateServiceOrderDraftKey(), JSON.stringify(draft))
    } catch {
      // El almacenamiento puede estar deshabilitado; el wizard debe seguir funcionando.
    }
  }

  private restoreCreateServiceOrderDraft(): boolean {
    const draft = this.readCreateServiceOrderDraft()
    if (!draft) {
      return false
    }

    this.isRestoringCreateServiceOrderDraft = true
    try {
      this.createServiceOrderForm.patchValue(draft.formValue, { emitEvent: false })
      this.createServiceOrderCandidates = draft.candidates ?? []
      this.editingCreateServiceOrderCandidateIndex = draft.editingCandidateIndex ?? null
      this.createOrderAgreementItemsByItemIndex = draft.agreementItemsByItemIndex ?? {}
      this.createServiceOrderStep = Math.min(
        Math.max(Number(draft.step) || 0, 0),
        this.getCreateServiceOrderSteps().length - 1,
      )
      this.setCustomerFieldsEnabled(!this.isInternalRequestOrigin())
      return true
    } finally {
      this.isRestoringCreateServiceOrderDraft = false
    }
  }

  private hasValidCreateServiceOrderDraft(): boolean {
    return Boolean(this.readCreateServiceOrderDraft())
  }

  private readCreateServiceOrderDraft(): CreateServiceOrderDraft | null {
    try {
      const serialized = localStorage.getItem(this.getCreateServiceOrderDraftKey())
      if (!serialized) {
        return null
      }
      const draft = JSON.parse(serialized) as CreateServiceOrderDraft
      if (
        draft?.version !== 2 ||
        !Number.isFinite(draft.updatedAt) ||
        Date.now() - draft.updatedAt > CREATE_SERVICE_ORDER_DRAFT_TTL_MS
      ) {
        this.clearCreateServiceOrderDraft()
        return null
      }
      return draft
    } catch {
      this.clearCreateServiceOrderDraft()
      return null
    }
  }

  private clearCreateServiceOrderDraft(): void {
    try {
      localStorage.removeItem(this.getCreateServiceOrderDraftKey())
    } catch {
      // Sin acción: el almacenamiento puede estar deshabilitado.
    }
  }

  private getCreateServiceOrderDraftKey(): string {
    const userId = Number(this.currentUserService.value?.id) || "anonymous"
    return `${CREATE_SERVICE_ORDER_DRAFT_KEY_PREFIX}:${this.companyId}:${userId}`
  }

  isLastCreateServiceOrderStep(): boolean {
    return this.createServiceOrderStep >= this.getCreateServiceOrderSteps().length - 1
  }

  requiresCreateServiceOrderInitialAgreementStep(): boolean {
    return [ServiceType.STANDARD_SERVICE, ServiceType.ASSEMBLY].includes(
      this.getSelectedWorkflowServiceType(),
    )
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

  get selectedAssignmentTechnician(): TechnicianAssignmentSuggestionRow | null {
    const technicianId = this.toNumericId(this.createServiceOrderForm.get("assignedToTechnicianId")?.value)
    if (!technicianId) {
      return null
    }
    return this.assignmentSuggestion?.technicians.find((entry) => Number(entry.technicianId) === technicianId) ?? null
  }

  selectSuggestedTechnician(technicianId: number): void {
    this.createServiceOrderForm.patchValue({ assignedToTechnicianId: technicianId })
  }

  isSuggestedTechnician(technicianId: number): boolean {
    return Number(this.assignmentSuggestion?.suggestedTechnicianId) === Number(technicianId)
  }

  getTechnicianActiveBreakdown(
    candidate: TechnicianAssignmentSuggestionRow,
  ): Array<{ serviceType: ServiceType; activeCount: number; assignedCount: number }> {
    return (candidate.activeByType ?? []).filter((entry) => entry.activeCount > 0)
  }

  getTechnicianActiveCountForType(
    candidate: TechnicianAssignmentSuggestionRow,
    serviceType: ServiceType,
  ): number {
    return (
      candidate.activeByType?.find((entry) => entry.serviceType === serviceType)?.activeCount ?? 0
    )
  }

  loadTechnicianAssignmentSuggestion(preserveSelectedTechnician = false): void {
    const serviceType = this.getSelectedWorkflowServiceType()
    const selectedTechnicianId = preserveSelectedTechnician
      ? this.toNumericId(this.createServiceOrderForm.get("assignedToTechnicianId")?.value)
      : null
    this.isLoadingAssignmentSuggestion = true
    this.assignmentSuggestionError = ""
    this.assignmentSuggestion = null

    this.serviceOrderService
      .getTechnicianSuggestion(serviceType)
      .pipe(finalize(() => (this.isLoadingAssignmentSuggestion = false)))
      .subscribe({
        next: (suggestion) => {
          this.assignmentSuggestion = suggestion
          const selectedTechnicianStillAvailable = suggestion.technicians?.some(
            (entry) => Number(entry.technicianId) === Number(selectedTechnicianId),
          )
          this.createServiceOrderForm.patchValue({
            assignedToTechnicianId: selectedTechnicianStillAvailable
              ? selectedTechnicianId
              : suggestion.suggestedTechnicianId,
          })
        },
        error: () => {
          this.assignmentSuggestionError = "No pudimos calcular la sugerencia automática de técnico."
          this.createServiceOrderForm.patchValue({ assignedToTechnicianId: null })
        },
      })
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
      case ServiceType.WARRANTY_SERVICE:
        return "Revisión de garantía"
      case ServiceType.ASSEMBLY:
        return "Trabajo de ensamblaje"
      case ServiceType.CUSTOMER_SERVICE:
        return "Atención a socio"
      default:
        return "Orden de servicio"
    }
  }

  getCreateOrderAgreementItems(index: number): ServiceOrderAgreementComposerItem[] {
    return this.createOrderAgreementItemsByItemIndex[index] ?? []
  }

  getCreateOrderAgreementTechnicalServiceItem(
    index: number,
  ): ServiceOrderAgreementServiceComposer | null {
    return (
      this.getCreateOrderAgreementItems(index).find(
        (item): item is ServiceOrderAgreementServiceComposer => item.type === "service",
      ) ?? null
    )
  }

  getCreateOrderAgreementProductItems(index: number): ServiceOrderAgreementProductComposer[] {
    return this.getCreateOrderAgreementItems(index).filter(
      (item): item is ServiceOrderAgreementProductComposer => item.type === "product",
    )
  }

  getQuoteTechnicalServiceItem(): ServiceOrderAgreementServiceComposer | null {
    return (
      this.quoteItems.find(
        (item): item is ServiceOrderAgreementServiceComposer => item.type === "service",
      ) ?? null
    )
  }

  getQuoteProductItems(): ServiceOrderAgreementProductComposer[] {
    return this.quoteItems.filter(
      (item): item is ServiceOrderAgreementProductComposer => item.type === "product",
    )
  }

  calculateAgreementProductsTotal(items: ServiceOrderAgreementProductComposer[]): number {
    return items.reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
  }

  isTechnicalServiceLineAmountValid(
    item: ServiceOrderAgreementServiceComposer | null | undefined,
  ): boolean {
    if (!item) {
      return false
    }

    return Number(item.unitPrice ?? 0) >= TECHNICAL_SERVICE_OPTION.price
  }

  addProductToCreateOrderItemAgreement(index: number): void {
    const current = this.getCreateOrderAgreementItems(index)
    this.createOrderAgreementItemsByItemIndex[index] = [...current, this.createProductComposer()]
  }

  addServiceToCreateOrderItemAgreement(index: number): void {
    const current = [...this.getCreateOrderAgreementItems(index)]
    this.ensureTechnicalServiceLine(current)
    this.createOrderAgreementItemsByItemIndex[index] = current
  }

  removeCreateOrderItemAgreement(index: number, quoteIndex: number): void {
    const current = [...this.getCreateOrderAgreementItems(index)]
    if (current[quoteIndex]?.type === "service") {
      return
    }
    current.splice(quoteIndex, 1)
    this.createOrderAgreementItemsByItemIndex[index] = current
  }

  onCreateOrderProductSelected(index: number, item: ServiceOrderAgreementProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (item.productId) {
      this.fetchCreateOrderProductPrice(index, item)
      return
    }
    item.unitPrice = 0
  }

  onCreateOrderProductQuantityChange(index: number, item: ServiceOrderAgreementProductComposer, value: any): void {
    item.quantity = Math.max(1, Number(value) || 1)
    if (item.productId) {
      this.fetchCreateOrderProductPrice(index, item)
    }
  }

  fetchCreateOrderProductPrice(index: number, item: ServiceOrderAgreementProductComposer): void {
    if (!item.productId) {
      return
    }
    this.getCreateOrderItemPriceLoadingMap(index)[item.id] = true
    this.pricingQuery
      .calculatePrice(item.productId)
      .pipe(finalize(() => (this.getCreateOrderItemPriceLoadingMap(index)[item.id] = false)))
      .subscribe({
        next: (res) => {
          item.recommendedPrice = Number(res?.recommendedPrice ?? res?.salePriceWithIgv ?? 0)
          item.minAllowedPrice = Number(res?.minAllowedPrice ?? 0)
          item.unitPrice = item.recommendedPrice
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

  calculateCreateOrderItemAgreementTotal(index: number): number {
    return this.getCreateOrderAgreementItems(index).reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
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
        contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
        contactPhoneNationalNumber: "",
      },
      { emitEvent: false },
    )
    this.documentSearchMessage = ""
    this.documentSearchError = ""
  }

  getCreateServiceOrderControl(controlName: string) {
    return this.createServiceOrderForm.get(controlName) ?? null
  }

  get isExistingPartner(): boolean {
    return Boolean(this.createServiceOrderForm.get("clientId")?.value)
  }

  private persistInlineContactForExistingCompany(partner: ClientResponse): Observable<{ clientId: number; clientContactId: number | null }> {
    const contactName = String(this.createServiceOrderForm.get("contactName")?.value ?? "").trim()
    const contactEmail = String(this.createServiceOrderForm.get("contactEmail")?.value ?? "").trim() || null
    const contactPhone = normalizeOptionalPhone(this.createServiceOrderForm.get("contactPhone")?.value)

    if (!contactName || !contactPhone) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "La empresa requiere un contacto con nombre y teléfono para continuar.",
      )
      return throwError(() => new Error("Contacto de empresa incompleto"))
    }

    const existingContacts = (partner.contacts ?? []).map<ClientContactRequest>((contact) => ({
      id: Number(contact.id),
      name: contact.name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      isPrimary: contact.isPrimary,
      isActive: contact.isActive ?? true,
    }))

    const nextContact: ClientContactRequest = {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      isPrimary: existingContacts.length === 0,
      isActive: true,
    }

    return this.clientsService.update(Number(partner.id), { contacts: [...existingContacts, nextContact] }).pipe(
      map((updatedPartner) => ({
        ...partner,
        ...updatedPartner,
        id: Number(updatedPartner.id ?? partner.id),
        companyId: Number(updatedPartner.companyId ?? partner.companyId),
        documentTypeId: Number(updatedPartner.documentTypeId ?? partner.documentTypeId),
        contacts: updatedPartner.contacts ?? partner.contacts ?? [],
      })),
      map((updatedPartner) => {
        const persistedContact =
          [...(updatedPartner.contacts ?? [])].reverse().find(
            (contact) =>
              (contact.name ?? "").trim() === contactName &&
              (contact.email ?? null) === contactEmail &&
              (contact.phone ?? null) === contactPhone,
          ) ??
          updatedPartner.contacts?.find(
            (contact) =>
              (contact.name ?? "").trim() === contactName &&
              (contact.phone ?? null) === contactPhone,
          ) ??
          null

        if (!persistedContact?.id) {
          throw new Error("No se pudo resolver el contacto persistido")
        }

        return { updatedPartner, persistedContact }
      }),
      tap(({ updatedPartner, persistedContact }) => {
        this.clients = this.clients.map((client) => Number(client.id) === Number(updatedPartner.id) ? updatedPartner : client)
        this.createServiceOrderForm.patchValue(
          {
            clientContactId: Number(persistedContact.id),
            contactName: persistedContact.name,
            contactEmail: persistedContact.email ?? "",
          },
          { emitEvent: false },
        )
        this.patchPhoneControls(this.createServiceOrderForm, persistedContact.phone ?? "", { emitEvent: false })
        this.setCustomerFieldsEnabled(false)
      }),
      map(({ updatedPartner, persistedContact }) => ({
        clientId: Number(updatedPartner.id),
        clientContactId: Number(persistedContact.id),
      })),
    )
  }

  private syncClientInCache(partner: ClientResponse): void {
    const partnerId = Number(partner.id)
    if (!partnerId) return

    const existingIndex = this.clients.findIndex((client) => Number(client.id) === partnerId)
    if (existingIndex === -1) {
      this.clients = [partner, ...this.clients]
      return
    }

    this.clients = this.clients.map((client) => Number(client.id) === partnerId ? partner : client)
  }

  private enableCompanyInlineContactFields(): void {
    const controls = ["contactName", "contactEmail", "contactPhone", "contactPhoneCountry", "contactPhoneNationalNumber"]
    controls.forEach((controlName) => {
      this.createServiceOrderForm.get(controlName)?.enable({ emitEvent: false })
    })
  }

  private setCustomerFieldsEnabled(enabled: boolean): void {
    const controls = [
      "companyName",
      "companyTradeName",
      "contactName",
      "contactEmail",
      "contactPhone",
      "contactPhoneCountry",
      "contactPhoneNationalNumber",
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
      this.markControlsAsTouched(["workflowServiceType", "requestOrigin"])
      return this.areControlsValid(["workflowServiceType", "requestOrigin"])
    }

    if (step === "assignment") {
      this.markControlsAsTouched(["assignedToTechnicianId"])
      return this.areControlsValid(["assignedToTechnicianId"])
    }

    if (step === "client") {
      if (this.isInternalRequestOrigin()) {
        return true
      }
      this.markControlsAsTouched(["documentNumber", "documentTypeId", "contactName", "contactPhone", "contactEmail"])
      return this.areControlsValid(["documentNumber", "documentTypeId", "contactName", "contactPhone", "contactEmail"])
    }

    if (step === "items") {
      return this.canAdvanceFromEquipmentStep()
    }

    if (step === "initialQuote") {
      return this.validateCreateServiceOrderInitialAgreement()
    }

    return true
  }

  private validateCreateServiceOrderInitialAgreement(): boolean {
    if (!this.requiresCreateServiceOrderInitialAgreementStep()) {
      return true
    }

    for (let index = 0; index < this.createServiceOrderCandidates.length; index += 1) {
      const quoteItems = this.getCreateOrderAgreementItems(index)
      if (!quoteItems.length) {
        this.showMessage(
          "warning",
          "fas fa-exclamation-circle",
          `Completa la cotización inicial del equipo ${index + 1}.`,
        )
        return false
      }

      const hasInvalidItem = quoteItems.some((entry) => {
        if (entry.type === "product") {
          return !this.toNumericId(entry.productId) || Number(entry.quantity) <= 0
        }
        return Number(entry.unitPrice ?? 0) < TECHNICAL_SERVICE_OPTION.price
      })

      if (hasInvalidItem) {
        this.showMessage(
          "warning",
          "fas fa-exclamation-circle",
          `Revisa la línea de servicio técnico y los productos del equipo ${index + 1}.`,
        )
        return false
      }
    }

    return true
  }

  private canAdvanceFromEquipmentStep(): boolean {
    if (this.hasPendingEquipmentDraft()) {
      if (!this.areCurrentCreateOrderItemControlsValid()) {
        this.showMessage(
          "warning",
          "fas fa-exclamation-circle",
          "Completa los campos obligatorios del equipo antes de continuar.",
        )
        return false
      }

      this.addCurrentEquipmentToCreateOrder()
    }

    if (!this.hasSavedEquipmentCandidates()) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Debes guardar al menos un equipo antes de continuar.")
      return false
    }

    return true
  }

  private hasSavedEquipmentCandidates(): boolean {
    return this.createServiceOrderCandidates.length > 0
  }

  private isEditingEquipmentDraft(): boolean {
    return this.editingCreateServiceOrderCandidateIndex !== null
  }

  private hasPendingEquipmentDraft(): boolean {
    return this.isEditingEquipmentDraft() || !this.isCurrentEquipmentDraftClean()
  }

  private isCurrentEquipmentDraftClean(): boolean {
    return JSON.stringify(this.getCurrentEquipmentDraftSnapshot()) === JSON.stringify(this.getEmptyEquipmentDraftSnapshot())
  }

  private getCurrentEquipmentDraftSnapshot(): EquipmentDraftSnapshot {
    const formValue = this.createServiceOrderForm.getRawValue()
    return {
      priority: formValue.priority ?? ServiceOrderPriority.LOW,
      equipmentType: formValue.equipmentType ?? EquipmentType.LAPTOP,
      equipmentTypeOther: this.normalizeEquipmentDraftText(formValue.equipmentTypeOther),
      brand: this.normalizeEquipmentDraftText(formValue.brand),
      model: this.normalizeEquipmentDraftText(formValue.model),
      serialNumber: this.normalizeEquipmentDraftText(formValue.serialNumber),
      accessories: this.normalizeEquipmentDraftText(formValue.accessories),
      initialIssue: this.normalizeEquipmentDraftText(formValue.initialIssue),
      notes: this.normalizeEquipmentDraftText(formValue.notes),
    }
  }

  private getEmptyEquipmentDraftSnapshot(): EquipmentDraftSnapshot {
    return {
      priority: ServiceOrderPriority.LOW,
      equipmentType: EquipmentType.LAPTOP,
      equipmentTypeOther: "",
      brand: "",
      model: "",
      serialNumber: "",
      accessories: "",
      initialIssue: "",
      notes: "",
    }
  }

  private normalizeEquipmentDraftText(value: unknown): string {
    return value == null ? "" : String(value).trim()
  }

  private prepareCandidateCommercialDrafts(): void {
    this.createOrderAgreementItemsByItemIndex = Object.fromEntries(
      this.createServiceOrderCandidates.map((candidate, index) => [
        index,
        candidate.quoteItems.map((item) => ({ ...item })),
      ]),
    )
  }

  private syncCandidateCommercialDrafts(): void {
    if (!this.requiresCreateServiceOrderInitialAgreementStep()) {
      return
    }
    this.createServiceOrderCandidates = this.createServiceOrderCandidates.map((candidate, index) => ({
      ...candidate,
      quoteItems: (this.createOrderAgreementItemsByItemIndex[index] ?? candidate.quoteItems).map((item) => ({
        ...item,
      })),
    }))
  }

  private buildInitialCommercialRequest(
    candidate: CreateServiceOrderCandidateDraft,
  ): ServiceOrderInitialCommercialRequest | undefined {
    if (!this.requiresCreateServiceOrderInitialAgreementStep()) {
      return undefined
    }
    return {
      notes: candidate.notes || undefined,
      lines: candidate.quoteItems.map((item) => {
        if (item.type === "product") {
          return {
            type: "PRODUCT" as const,
            productId: this.toNumericId(item.productId)!,
            quantity: Math.max(1, Number(item.quantity) || 1),
            unitPrice: Number(item.unitPrice) || 0,
            requiresPurchase: item.requiresPurchase,
            notes: item.notes || undefined,
          }
        }
        return {
          type: "SERVICE" as const,
          serviceId: this.toNumericId(item.serviceId) ?? undefined,
          quantity: 1,
          unitPrice: Number(item.unitPrice) || 0,
          notes: item.notes || undefined,
        }
      }),
    }
  }

  private buildServiceOrderAgreementPayload(
    serviceOrderId: number,
    serviceType: ServiceType,
    items: ServiceOrderAgreementComposerItem[],
    notes?: string | null,
  ): ServiceOrderAgreementRequest {
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

    return {
      serviceOrderId,
      diagnosisId: this.currentDiagnosis?.id ?? undefined,
      status:
        serviceType === ServiceType.STANDARD_SERVICE || serviceType === ServiceType.ASSEMBLY
          ? ServiceOrderAgreementStatus.CONFIRMED
          : ServiceOrderAgreementStatus.DRAFT,
      source:
        serviceType === ServiceType.STANDARD_SERVICE || serviceType === ServiceType.ASSEMBLY
          ? ServiceOrderAgreementSource.RECEPTION_DIRECT
          : ServiceOrderAgreementSource.TECHNICIAN_COORDINATION,
      notes: notes ?? null,
      products,
      technicalServiceAmount: this.resolveTechnicalServiceAmount(items, serviceType),
    }
  }

  private resolveTechnicalServiceAmount(
    items: ServiceOrderAgreementComposerItem[],
    serviceType: ServiceType | null,
  ): number {
    if ([ServiceType.CUSTOMER_SERVICE, ServiceType.WARRANTY_SERVICE].includes(serviceType as ServiceType)) {
      return 0
    }

    const total = items
      .filter((entry): entry is ServiceOrderAgreementServiceComposer => entry.type === "service")
      .reduce((sum, entry) => sum + Number(entry.unitPrice ?? 0), 0)

    return Math.max(total || TECHNICAL_SERVICE_OPTION.price, TECHNICAL_SERVICE_OPTION.price)
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

  viewServiceOrderAgreementDetail(quote: ServiceOrderAgreement): void {
    this.isLoadingServiceOrderAgreementDetail = true
    this.quoteDetailError = ""
    this.selectedServiceOrderAgreementDetail = null
    this.agreementService
      .findOne(quote.id, true)
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreementDetail = false)))
      .subscribe({
        next: (detail) => (this.selectedServiceOrderAgreementDetail = detail),
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
    return serviceId ? TECHNICAL_SERVICE_OPTION.name : TECHNICAL_SERVICE_OPTION.name
  }

  getServiceCategoryName(categoryId?: number | null): string {
    return TECHNICAL_SERVICE_OPTION.name
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

  private loadServiceOrderDocumentContext(serviceOrder: ServiceOrder) {
    return this.serviceOrderService.findOne(Number(serviceOrder.id)).pipe(
      switchMap((fullOrder) => {
        if (!this.canCreateBoletaFromOrder(fullOrder)) {
          return of({ fullOrder, quote: null as ServiceOrderAgreement | null })
        }
        return this.agreementService.findAll({ page: 1, limit: 20, serviceOrderId: Number(fullOrder.id) }).pipe(
          map(({ data }) => ({
            fullOrder,
            quote: this.selectPreferredServiceOrderAgreement(data ?? []),
          })),
        )
      }),
    )
  }

  private selectPreferredServiceOrderAgreement(quotes: ServiceOrderAgreement[]): ServiceOrderAgreement | null {
    const preferredStatuses = [
      ServiceOrderAgreementStatus.CONFIRMED,
      ServiceOrderAgreementStatus.DRAFT,
      ServiceOrderAgreementStatus.SUPERSEDED,
    ]
    for (const status of preferredStatuses) {
      const match = quotes.find((quote) => quote.status === status)
      if (match) {
        return match
      }
    }
    return quotes[0] ?? null
  }

  canCreateBoletaFromOrder(serviceOrder: ServiceOrder): boolean {
    if (![ServiceType.STANDARD_SERVICE, ServiceType.DIAGNOSIS].includes(serviceOrder.serviceType)) {
      return false
    }

    if (serviceOrder.economicStatus === ServiceOrderEconomicStatus.TOTAL) {
      return true
    }

    return [
      ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO,
      ServiceOrderTechnicalStatus.EN_EJECUCION,
      ServiceOrderTechnicalStatus.RESUELTA,
    ].includes(serviceOrder.technicalStatus) || [
      ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      ServiceOrderOperativeStatus.ENTREGADA,
    ].includes(serviceOrder.operativeStatus)
  }

  private canUseAgreementForBoleta(serviceOrder: ServiceOrder, quote: ServiceOrderAgreement): boolean {
    if (quote.status === ServiceOrderAgreementStatus.CONFIRMED || Boolean(quote.agreedAt)) {
      return true
    }

    if (serviceOrder.economicStatus === ServiceOrderEconomicStatus.TOTAL) {
      return true
    }

    return [
      ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO,
      ServiceOrderTechnicalStatus.EN_EJECUCION,
      ServiceOrderTechnicalStatus.RESUELTA,
    ].includes(serviceOrder.technicalStatus) || [
      ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      ServiceOrderOperativeStatus.ENTREGADA,
    ].includes(serviceOrder.operativeStatus)
  }

  canMarkServiceOrderAsPaid(serviceOrder: ServiceOrder): boolean {
    return false
  }

  private getServiceOrderBoletaClientKey(serviceOrder: ServiceOrder): string {
    return String(
      serviceOrder.clientId ??
      serviceOrder.clientSnapshotDocumentNumber ??
      serviceOrder.clientSnapshotPhone ??
      serviceOrder.clientSnapshotName ??
      serviceOrder.contactPhone ??
      serviceOrder.contactName ??
      serviceOrder.id,
    )
  }

  private isSameClientSelection(serviceOrder: ServiceOrder): boolean {
    const selectedClientKey = this.selectedMockBoletaClientKey
    if (!selectedClientKey) {
      return true
    }
    return this.getServiceOrderBoletaClientKey(serviceOrder) === selectedClientKey
  }

  private normalizeOptionalText(value: unknown): string | null {
    const normalized = String(value ?? "").trim()
    return normalized ? normalized : null
  }

  private configureEquipmentTypeOtherValidation(group: FormGroup): void {
    const equipmentTypeControl = group.get("equipmentType")
    const equipmentTypeOtherControl = group.get("equipmentTypeOther")
    if (!equipmentTypeControl || !equipmentTypeOtherControl) {
      return
    }

    const applyValidation = (type: EquipmentType | null | undefined) => {
      if (type === EquipmentType.OTHER) {
        equipmentTypeOtherControl.setValidators([Validators.required, Validators.maxLength(120)])
      } else {
        equipmentTypeOtherControl.setValue("", { emitEvent: false })
        equipmentTypeOtherControl.clearValidators()
      }
      equipmentTypeOtherControl.updateValueAndValidity({ emitEvent: false })
    }

    applyValidation(equipmentTypeControl.value)
    const subscription = equipmentTypeControl.valueChanges.subscribe((type) => applyValidation(type))
    this.subscriptions.add(subscription)
  }

  private loadCurrentDiagnosis(serviceOrderId: number | null): void {
    if (!serviceOrderId) {
      this.currentDiagnosis = null
      return
    }
    this.isLoadingDiagnosis = true
    this.diagnosisService
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

  getServiceOrderAgreementStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      confirmed: "Confirmado",
      voided: "Anulado",
      superseded: "Reemplazado",
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
      draft: "Borrador",
    }
    return statusMap[status.toLowerCase()] || status
  }

  isLatestServiceOrderAgreement(quote: ServiceOrderAgreement | null): boolean {
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

  isClientResponded(quote: ServiceOrderAgreement | null): boolean {
    if (!quote) return false
    if (quote.agreedAt) return true
    return [ServiceOrderAgreementStatus.CONFIRMED, ServiceOrderAgreementStatus.VOIDED].includes(quote.status)
  }

  canRespondToServiceOrderAgreement(quote: ServiceOrderAgreement | null): boolean {
    if (!quote) return false
    if (!this.isLatestServiceOrderAgreement(quote)) return false
    if (this.isClientResponded(quote)) return false
    return quote.status === ServiceOrderAgreementStatus.DRAFT
  }

  getServiceOrderAgreementStatusClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      confirmed: "status-client-approved",
      voided: "status-client-rejected",
      superseded: "status-archived",
      pending: "status-pending",
      approved: "status-approved",
      rejected: "status-rejected",
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

  sendServiceOrderAgreementToClient(quote: ServiceOrderAgreement): void {
    if (!quote?.id) return
    if (!this.canRespondToServiceOrderAgreement(quote)) {
      this.showMessage("warning", "fas fa-info-circle", "Esta cotización ya fue cerrada.")
      this.refreshServiceOrderAgreementsForCurrentItem()
      this.refreshServiceOrderAgreementDetail(quote.id)
      return
    }
    this.isLoadingServiceOrderAgreementDetail = true
    this.agreementService
      .confirm(quote.id)
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreementDetail = false)))
      .subscribe({
        next: (updatedServiceOrderAgreement) => {
          this.showMessage("success", "fas fa-check-circle", "Cotización confirmada correctamente.")
          const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === quote.id)
          if (index >= 0) {
            this.serviceOrderItemQuotes[index] = updatedServiceOrderAgreement
          }
          if (this.selectedServiceOrderAgreementDetail?.id === quote.id) {
            this.selectedServiceOrderAgreementDetail = updatedServiceOrderAgreement
          }
          this.loadServiceOrders()
        },
        error: (error) => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos confirmar la cotización.")
          const applied = this.applyServiceOrderAgreementStatusFromError(quote.id, error)
          if (!applied) {
            this.refreshServiceOrderAgreementsForCurrentItem()
            this.refreshServiceOrderAgreementDetail(quote.id)
          }
        },
      })
  }

  rejectServiceOrderAgreementByClient(quote: ServiceOrderAgreement): void {
    if (!quote?.id) return
    if (!this.canRespondToServiceOrderAgreement(quote)) {
      this.showMessage("warning", "fas fa-info-circle", "Esta cotización ya fue cerrada.")
      this.refreshServiceOrderAgreementsForCurrentItem()
      this.refreshServiceOrderAgreementDetail(quote.id)
      return
    }
    this.isLoadingServiceOrderAgreementDetail = true
    this.agreementService
      .voidAgreement(quote.id, "Sin aceptación de la cotización por parte del cliente.")
      .pipe(
        switchMap(() => this.agreementService.createDiagnosisFeeAgreement(Number(quote.serviceOrderId))),
      )
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreementDetail = false)))
      .subscribe({
        next: () => {
          this.showMessage(
            "success",
            "fas fa-check-circle",
            "Orden marcada como pendiente de recojo y se generó la cotización automática por diagnóstico.",
          )
          const index = this.serviceOrderItemQuotes.findIndex((q) => q.id === quote.id)
          if (index >= 0) {
            this.serviceOrderItemQuotes[index] = {
              ...this.serviceOrderItemQuotes[index],
              status: ServiceOrderAgreementStatus.VOIDED,
            }
          }
          if (this.selectedServiceOrderAgreementDetail?.id === quote.id) {
            this.selectedServiceOrderAgreementDetail = {
              ...this.selectedServiceOrderAgreementDetail,
              status: ServiceOrderAgreementStatus.VOIDED,
            }
          }
          this.loadServiceOrders()
          this.refreshServiceOrderAgreementsForCurrentItem()
        },
        error: (error) => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos cerrar la cotización sin continuidad.")
          const applied = this.applyServiceOrderAgreementStatusFromError(quote.id, error)
          if (!applied) {
            this.refreshServiceOrderAgreementsForCurrentItem()
            this.refreshServiceOrderAgreementDetail(quote.id)
          }
        },
      })
  }

  supersedeServiceOrderAgreement(quote: ServiceOrderAgreement): void {
    if (!quote?.id) return
    const serviceOrder = this.serviceOrderAgreementsServiceOrder
    if (!serviceOrder) {
      this.showMessage("warning", "fas fa-info-circle", "No se pudo preparar la cotización para reenviar.")
      return
    }
    this.showServiceOrderAgreementsModal = false
    this.openResubmitServiceOrderAgreementModal(quote, serviceOrder)
  }

  editDraftServiceOrderAgreement(quote: ServiceOrderAgreement): void {
    if (!quote?.id) return
    if (quote.status !== ServiceOrderAgreementStatus.DRAFT) {
      this.showMessage("warning", "fas fa-info-circle", "Solo puedes editar cotizaciones en borrador.")
      return
    }
    const serviceOrder = this.serviceOrderAgreementsServiceOrder
    if (!serviceOrder) {
      this.showMessage("warning", "fas fa-info-circle", "No se pudo preparar el borrador para edición.")
      return
    }

    this.showServiceOrderAgreementsModal = false
    this.agreementServiceOrder = serviceOrder
    this.selectedServiceOrder = serviceOrder
    this.selectedServiceOrderId = Number(serviceOrder.id)
    this.loadCurrentDiagnosis(this.selectedServiceOrderId)
    this.selectedServiceOrderAgreementDetail = quote
    this.isResubmittingServiceOrderAgreement = false
    this.isEditingDraftServiceOrderAgreement = true
    this.quoteItems = this.buildDefaultAgreementItems(serviceOrder)

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

    this.ensureTechnicalServiceLine(
      this.quoteItems,
      Number(quote.serviceItems?.[0]?.unitPrice ?? TECHNICAL_SERVICE_OPTION.price),
    )

    this.createServiceOrderAgreementForm.patchValue({
      notes: quote.notes || "",
    })

    this.showCreateServiceOrderAgreementModal = true
  }

  openResubmitServiceOrderAgreementModal(quote: ServiceOrderAgreement, serviceOrder?: ServiceOrder): void {
    const targetServiceOrder = serviceOrder ?? this.serviceOrderAgreementsServiceOrder
    if (!targetServiceOrder) return
    this.agreementServiceOrder = targetServiceOrder
    this.selectedServiceOrder = targetServiceOrder
    this.selectedServiceOrderId = Number(targetServiceOrder.id)
    this.loadCurrentDiagnosis(this.selectedServiceOrderId)
    this.selectedServiceOrderAgreementDetail = quote
    this.isResubmittingServiceOrderAgreement = true
    this.isEditingDraftServiceOrderAgreement = false
    this.quoteItems = this.buildDefaultAgreementItems(targetServiceOrder)

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

    this.ensureTechnicalServiceLine(
      this.quoteItems,
      Number(quote.serviceItems?.[0]?.unitPrice ?? TECHNICAL_SERVICE_OPTION.price),
    )

    this.createServiceOrderAgreementForm.patchValue({
      notes: quote.notes || "",
    })

    this.showCreateServiceOrderAgreementModal = true
  }

  submitResubmitServiceOrderAgreement(): void {
    if (!this.selectedServiceOrderAgreementDetail?.id || this.createServiceOrderAgreementForm.invalid || this.quoteItems.length === 0) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa los datos de la cotización.")
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

    const payload = {
      products: productsPayload,
      technicalServiceAmount: this.resolveTechnicalServiceAmount(this.quoteItems, this.selectedServiceOrder?.serviceType ?? null),
      notes: this.createServiceOrderAgreementForm.get("notes")?.value || undefined,
    }

    this.isCreatingServiceOrderAgreement = true

    const status = (this.selectedServiceOrderAgreementDetail.status || "").toUpperCase()
    const supersedeRequest = status === "VOIDED"
      ? this.agreementService.supersedeVoidedAgreement(this.selectedServiceOrderAgreementDetail.id, payload)
      : this.agreementService.supersedeServiceOrderAgreement(this.selectedServiceOrderAgreementDetail.id, payload)

    supersedeRequest
      .pipe(finalize(() => (this.isCreatingServiceOrderAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización reenviada correctamente.")
          this.closeCreateServiceOrderAgreementModal()
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
      contactPhone: "",
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: "",
      notes: serviceOrder.notes,
      equipmentType: serviceOrder.equipmentType ?? EquipmentType.LAPTOP,
      equipmentTypeOther: serviceOrder.equipmentTypeOther ?? "",
      serviceType: serviceOrder.serviceType ?? ServiceType.DIAGNOSIS,
      brand: serviceOrder.brand ?? "",
      model: serviceOrder.model ?? "",
      serialNumber: serviceOrder.serialNumber ?? "",
      initialIssue: serviceOrder.initialIssue ?? "",
      accessories: serviceOrder.accessories ?? "",
    })
    this.patchPhoneControls(this.editServiceOrderForm, this.getServiceOrderContactPhone(serviceOrder), { emitEvent: false })
    this.showEditServiceOrderModal = true
  }

  submitUpdateDraftServiceOrderAgreement(): void {
    if (!this.selectedServiceOrderAgreementDetail?.id || this.createServiceOrderAgreementForm.invalid || this.quoteItems.length === 0) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa los datos de la cotización.")
      return
    }

    const payload = {
      serviceOrderId: this.selectedServiceOrderId ?? this.selectedServiceOrderAgreementDetail.serviceOrderId,
      diagnosisId: this.currentDiagnosis?.id ?? this.selectedServiceOrderAgreementDetail.diagnosisId ?? undefined,
      notes: this.createServiceOrderAgreementForm.get("notes")?.value || undefined,
      technicalServiceAmount: this.resolveTechnicalServiceAmount(this.quoteItems, this.selectedServiceOrder?.serviceType ?? null),
      products: this.quoteItems.reduce<{ productId: number; quantity: number; unitPrice?: number; requiresPurchase: boolean; notes?: string }[]>((acc, entry) => {
        if (entry.type !== "product") return acc
        const productId = this.toNumericId(entry.productId)
        if (!productId) return acc
        acc.push({
          productId,
          quantity: Math.max(1, Number(entry.quantity) || 1),
          unitPrice: Number.isFinite(Number(entry.unitPrice)) ? Number(entry.unitPrice) : undefined,
          requiresPurchase: entry.requiresPurchase,
          notes: entry.notes || undefined,
        })
        return acc
      }, []),
    }

    this.isCreatingServiceOrderAgreement = true
    this.agreementService
      .update(this.selectedServiceOrderAgreementDetail.id, payload)
      .pipe(finalize(() => (this.isCreatingServiceOrderAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Borrador actualizado correctamente.")
          this.closeCreateServiceOrderAgreementModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el borrador.")
        },
      })
  }

  canOpenReceptionInbox(serviceOrder: ServiceOrder | null): boolean {
    if (!serviceOrder) return false
    return ![
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ].includes(serviceOrder.operativeStatus)
  }

  openReceptionInbox(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenReceptionInbox(serviceOrder)) return

    this.serviceOrderInboxService.getThreadByOrder(Number(serviceOrder.id)).subscribe({
      next: (thread) => {
        void this.router.navigate(['/service-order-inbox'], {
          queryParams: {
            threadId: thread.id,
            serviceOrderId: Number(serviceOrder.id),
          },
        })
      },
      error: () => {
        this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos abrir la conversación del cliente.")
      },
    })
  }


  closeEditServiceOrderModal(): void {
    this.showEditServiceOrderModal = false
    this.editingServiceOrder = null
    this.editServiceOrderForm.reset({
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: "",
      priority: ServiceOrderPriority.MEDIUM,
      notes: "",
      equipmentType: EquipmentType.LAPTOP,
      equipmentTypeOther: "",
      serviceType: ServiceType.DIAGNOSIS,
      brand: "",
      model: "",
      serialNumber: "",
      initialIssue: "",
      accessories: "",
    })
  }

  submitEditServiceOrder(): void {
    this.syncPhoneControls(this.editServiceOrderForm)
    if (this.editServiceOrderForm.invalid || !this.editingServiceOrder) {
      return
    }

    this.isSaving = true
    const formValue = this.editServiceOrderForm.getRawValue()
    const serviceOrderPayload: ServiceOrderUpdateRequest = {
      contactName: String(formValue.contactName ?? "").trim(),
      contactPhone: normalizeOptionalPhone(formValue.contactPhone),
      contactEmail: String(formValue.contactEmail ?? "").trim() || null,
      notes: formValue.notes ?? null,
      equipmentType: formValue.equipmentType,
      equipmentTypeOther:
        formValue.equipmentType === EquipmentType.OTHER
          ? this.normalizeOptionalText(formValue.equipmentTypeOther)
          : null,
      brand: this.normalizeOptionalText(formValue.brand),
      model: this.normalizeOptionalText(formValue.model),
      serialNumber: this.normalizeOptionalText(formValue.serialNumber),
      initialIssue: String(formValue.initialIssue ?? "").trim(),
      accessories: this.normalizeOptionalText(formValue.accessories),
    }

    this.serviceOrderService
      .update(this.editingServiceOrder.id, serviceOrderPayload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Orden actualizada correctamente.")
          this.closeEditServiceOrderModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar la orden.")
        },
      })
  }

  // ===== REASIGNACIÓN DE TÉCNICO =====
  openReassignTechnicianModal(serviceOrder: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.canReassignTechnician(serviceOrder)) {
      return
    }
    this.reassignTechnicianForm.patchValue({
      technicianId: serviceOrder.assignedToTechnicianId,
    })
    this.editingServiceOrder = serviceOrder
    this.loadTechnicians()
    this.showReassignTechnicianModal = true
  }

  closeReassignTechnicianModal(): void {
    this.showReassignTechnicianModal = false
    this.editingServiceOrder = null
    this.reassignTechnicianForm.reset()
  }

  submitReassignTechnician(): void {
    if (this.reassignTechnicianForm.invalid || !this.editingServiceOrder) {
      return
    }

    this.isSaving = true
    const technicianId = Number(this.reassignTechnicianForm.value.technicianId)

    this.serviceOrderService
      .assignTechnician(this.editingServiceOrder.id, technicianId)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (updatedOrder) => {
          this.replaceServiceOrderInState(updatedOrder)
          this.showMessage("success", "fas fa-check-circle", "Técnico reasignado correctamente.")
          this.closeReassignTechnicianModal()
          this.loadServiceOrders()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos reasignar el técnico.")
        },
      })
  }

  private replaceServiceOrderInState(updatedOrder: ServiceOrder): void {
    const updatedId = Number(updatedOrder.id)
    this.serviceOrders = this.serviceOrders.map((item) =>
      Number(item.id) === updatedId ? updatedOrder : item,
    )
    if (this.selectedServiceOrder && Number(this.selectedServiceOrder.id) === updatedId) {
      this.selectedServiceOrder = updatedOrder
    }
    if (this.editingServiceOrder && Number(this.editingServiceOrder.id) === updatedId) {
      this.editingServiceOrder = updatedOrder
    }
    this.applyFilters()
  }

  private loadTechnicians(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.technicians = users
          .filter(
            (user) =>
              hasAnyRole(user.roles, TECHNICIAN_ROLE_NAMES) &&
              user.isActive &&
              !user.deletedAt,
          )
          .map(user => ({ id: Number(user.id), name: user.name }))
      },
      error: () => {
        this.technicians = []
      }
    })
  }

  private buildPhoneControlsValue(value: unknown): {
    country: PhoneCountry
    nationalNumber: string
    e164: string
  } {
    const parsed = parseStoredPhoneToFormValue(value)
    return {
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
      e164: parsed.e164 ?? "",
    }
  }

  private patchPhoneControls(
    form: FormGroup,
    value: unknown,
    options?: { emitEvent?: boolean },
  ): void {
    const phoneValue = this.buildPhoneControlsValue(value)
    form.patchValue(
      {
        contactPhone: phoneValue.e164,
        contactPhoneCountry: phoneValue.country,
        contactPhoneNationalNumber: phoneValue.nationalNumber,
      },
      options,
    )
  }

  private syncPhoneControls(form: FormGroup): void {
    const parsed = buildPhoneFormValue(
      form.get("contactPhoneCountry")?.value,
      form.get("contactPhoneNationalNumber")?.value,
    )
    form.get("contactPhone")?.setValue(
      !parsed.nationalNumber ? "" : parsed.e164 ?? invalidPhoneSentinel(),
      { emitEvent: false },
    )
    form.get("contactPhone")?.updateValueAndValidity({ emitEvent: false })
  }
}

const normalizeOptionalPhone = (value: unknown): string | null => normalizePhoneToE164(value) ?? null





