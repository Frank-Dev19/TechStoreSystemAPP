import { Component, OnDestroy, OnInit } from "@angular/core"
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Subscription } from "rxjs"
import { finalize, map, switchMap, tap } from "rxjs/operators"
import { of, throwError } from "rxjs"
import { BusinessPartnersApiService } from "../../services/business-partners-api.service"
import { BusinessPartnerResponse } from "../../models/business-partners/business-partners-response"
import { BusinessPartnerSaveRequest } from "../../models/business-partners/business-partners-request"
import { TicketService } from "../../services/tickets/ticket.service"
import { TicketItemService } from "../../services/tickets/ticket-item.service"
import { Ticket, TicketPriority, TicketStatus, PaymentStatus } from "../../models/tickets/ticket"
import { TicketSaveRequest } from "../../models/tickets/ticket-request"
import { TicketItemSaveRequest } from "../../models/tickets/ticket-item-request"
import { EquipmentType, ServiceType, TicketItem, TicketItemStatus } from "../../models/tickets/ticket-item"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { ServiceService } from "../../services/service-catalog/service.service"
import { Service } from "../../models/service-catalog/service"
import { ServiceCategoryService } from "../../services/service-catalog/service-category.service"
import { ServiceCategory } from "../../models/service-catalog/service-category"
import { QuoteService } from "../../services/tickets/quote.service"
import { QuoteRequest } from "../../models/tickets/quote-request"
import { Quote, QuoteStatus } from "../../models/tickets/quote"
import { DiagnosticService } from "../../services/tickets/diagnostic.service"
import { Diagnostic } from "../../models/tickets/diagnostic"
import { config } from "../../../environments/environment"
import { DocumentTypesApiService } from "../../services/document-types-api.service"
import { DocumentTypeResponse } from "../../models/document-types/document-types-response"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"
import { PricingQueryApiService } from "../../services/pricing/pricing-query-api.service"

interface QuoteProductComposer {
  id: number
  type: "product"
  productId: number | null
  quantity: number
  unitPrice: number
  requiresPurchase: boolean
  notes: string
}

interface QuoteServiceComposer {
  id: number
  type: "service"
  serviceId: number | null
  notes: string
}

type QuoteComposerItem = QuoteProductComposer | QuoteServiceComposer

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "Abierto",
  [TicketStatus.IN_PROGRESS]: "En progreso",
  [TicketStatus.PARTIALLY_COMPLETED]: "Parcialmente completado",
  [TicketStatus.COMPLETED]: "Completado",
  [TicketStatus.CANCELLED]: "Cancelado",
}

const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: "Baja",
  [TicketPriority.MEDIUM]: "Media",
  [TicketPriority.HIGH]: "Alta",
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "Pendiente",
  [PaymentStatus.PARTIAL]: "Pago parcial",
  [PaymentStatus.PAID]: "Pagado",
}

const TICKET_ITEM_STATUS_LABELS: Record<TicketItemStatus, string> = {
  [TicketItemStatus.ASSIGNED]: "Asignado",
  [TicketItemStatus.IN_DIAGNOSIS]: "En diagnóstico",
  [TicketItemStatus.DIAGNOSED]: "Diagnosticado",
  [TicketItemStatus.QUOTED]: "Cotizado",
  [TicketItemStatus.SUPERVISOR_APPROVED]: "Aprobado por supervisor",
  [TicketItemStatus.SUPERVISOR_REJECTED]: "Rechazado por supervisor",
  [TicketItemStatus.SENT_TO_CLIENT]: "Enviado al cliente",
  [TicketItemStatus.AWAITING_CLIENT_RESPONSE]: "Esperando respuesta del cliente",
  [TicketItemStatus.CLIENT_APPROVED]: "Aprobado por cliente",
  [TicketItemStatus.QUOTE_EXPIRED]: "Cotización expirada",
  [TicketItemStatus.READY_FOR_REPAIR]: "Listo para reparación",
  [TicketItemStatus.CLIENT_REJECTED]: "Rechazado por cliente",
  [TicketItemStatus.AWAITING_PARTS]: "Esperando repuestos",
  [TicketItemStatus.IN_REPAIR]: "En reparación",
  [TicketItemStatus.REPAIRED]: "Reparado",
  [TicketItemStatus.DELIVERED]: "Entregado",
  [TicketItemStatus.CANCELLED]: "Cancelado",
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.DIAGNOSIS]: "Diagnóstico",
  [ServiceType.STANDARD_SERVICE]: "Servicio estándar",
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
  tickets: Ticket[] = []
  filteredTickets: Ticket[] = []
  paginatedTickets: Ticket[] = []
  selectedTicketItemId: number | null = null
  selectedTicketItem: TicketItem | null = null
  currentDiagnosis: Diagnostic | null = null
  isLoadingDiagnosis = false
  readonly serviceTypeEnum = ServiceType
  expectedDocumentDigits: number | null = null
  private itemQuoteTotals: Record<number, number> = {}
  filterState: "all" | TicketStatus = "all"
  filterPriority: "all" | TicketPriority = "all"
  filterStartDate = ""
  filterEndDate = ""
  searchTerm = ""
  currentPage = 1
  itemsPerPage = 10
  totalPages = 1
  readonly Math = Math

  showCreateTicketModal = false
  showCreateQuoteModal = false
  isResubmittingQuote = false

  createTicketForm: FormGroup
  createQuoteForm: FormGroup

  businessPartners: BusinessPartnerResponse[] = []
  documentTypes: DocumentTypeResponse[] = []
  products: Product[] = []
  services: Service[] = []
  diagnosticFeeService: Service | null = null
  serviceCategories: ServiceCategory[] = []
  private serviceCategoryMap = new Map<number, string>()
  quoteItems: QuoteComposerItem[] = []
  documentSearchMessage = ""
  documentSearchError = ""
  isSearchingPartner = false
  expandedTickets = new Set<number>()

  isLoadingTickets = false
  isCreatingTicket = false
  isCreatingQuote = false
  isLoadingQuotes = false
  isLoadingQuoteDetail = false

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  readonly equipmentTypeOptions = Object.values(EquipmentType)
  readonly serviceTypeOptions = Object.values(ServiceType)
  private readonly companyId = Number(config.defaultCompanyId ?? 1) || 1
  showQuotesModal = false
  quotesError = ""
  ticketItemQuotes: Quote[] = []
  quoteTicket: Ticket | null = null
  quotesTicket: Ticket | null = null
  quotesTicketItem: TicketItem | null = null
  selectedQuoteDetail: Quote | null = null
  quoteDetailError = ""
  readonly ticketItemStatusEnum = TicketItemStatus
  productPriceLoading: Record<number, boolean> = {}

  // Modales de edición
  showEditTicketModal = false
  showEditItemModal = false
  showReassignTechnicianModal = false
  editingTicket: Ticket | null = null
  editingItem: TicketItem | null = null
  reassigningItem: TicketItem | null = null
  editTicketForm: FormGroup
  editItemForm: FormGroup
  reassignTechnicianForm: FormGroup
  technicians: { id: number; name: string }[] = []
  isSaving = false

  private readonly subscriptions = new Subscription()

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly ticketService: TicketService,
    private readonly ticketItemService: TicketItemService,
    private readonly businessPartnersService: BusinessPartnersApiService,
    private readonly productsService: ProductsService,
    private readonly serviceCatalog: ServiceService,
    private readonly serviceCategoryService: ServiceCategoryService,
    private readonly quoteService: QuoteService,
    private readonly diagnosticService: DiagnosticService,
    private readonly documentTypesService: DocumentTypesApiService,
    private readonly usersApi: UsersApiService,
    private readonly pricingQuery: PricingQueryApiService,
  ) {
    this.createTicketForm = this.createTicketFormGroup()
    this.createQuoteForm = this.createQuoteFormGroup()
    this.editTicketForm = this.createEditTicketFormGroup()
    this.editItemForm = this.createEditItemFormGroup()
    this.reassignTechnicianForm = this.createReassignTechnicianFormGroup()
    const partnerChanges = this.createTicketForm
      .get("businessPartnerId")
      ?.valueChanges.subscribe((value) => this.applyPartnerContact(value))
    if (partnerChanges) {
      this.subscriptions.add(partnerChanges)
    }
  }

  ngOnInit(): void {
    this.loadTickets()
    this.loadBusinessPartners()
    this.loadCatalogData()
    this.loadDocumentTypes()
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe()
  }

  private createTicketFormGroup(): FormGroup {
    return this.formBuilder.group({
      businessPartnerId: [null],
      documentNumber: ["", [Validators.required, Validators.pattern(/^[0-9]*$/)]],
      documentTypeId: [null, Validators.required],
      contactName: ["", Validators.required],
      contactPhone: ["", [Validators.required, Validators.pattern(/^[0-9+\-\s]*$/)]],
      contactEmail: ["", Validators.email],
      priority: [TicketPriority.MEDIUM, Validators.required],
      notes: [""],
      ticketItems: this.formBuilder.array([this.createTicketItemGroup()]),
    })
  }

  private createQuoteFormGroup(): FormGroup {
    return this.formBuilder.group({
      currency: ["PEN", Validators.required],
      notes: ["", Validators.maxLength(500)],
    })
  }

  private createEditTicketFormGroup(): FormGroup {
    return this.formBuilder.group({
      contactName: ["", Validators.required],
      contactEmail: ["", Validators.email],
      contactPhone: ["", Validators.pattern(/^[0-9+\-\s]*$/)],
      priority: [TicketPriority.MEDIUM, Validators.required],
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

  private loadTickets(): void {
    this.isLoadingTickets = true
    const expandedSnapshot = this.snapshotExpandedItems()
    this.ticketService
      .findAll({ page: 1, limit: 50, includeItems: false })
      .pipe(finalize(() => (this.isLoadingTickets = false)))
      .subscribe({
        next: ({ data }) => {
          this.tickets = data ?? []
          this.restoreExpandedItems(expandedSnapshot)
          this.currentPage = 1
          this.applyFilters()
          this.refreshExpandedTickets()
        },
        error: () => {
          this.tickets = []
          this.filteredTickets = []
          this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar los tickets.")
        },
      })
  }

  private snapshotExpandedItems(): Map<number, TicketItem[]> {
    if (!this.expandedTickets.size) return new Map()
    const snapshot = new Map<number, TicketItem[]>()
    this.tickets
      .filter((ticket) => this.expandedTickets.has(ticket.id))
      .forEach((ticket) => {
        if (ticket.items?.length) {
          snapshot.set(ticket.id, ticket.items)
        }
      })
    return snapshot
  }

  private restoreExpandedItems(snapshot: Map<number, TicketItem[]>): void {
    if (!snapshot.size) return
    this.tickets.forEach((ticket) => {
      const cached = snapshot.get(ticket.id)
      if (cached?.length) {
        ticket.items = cached
      }
    })
  }

  private refreshExpandedTickets(): void {
    if (!this.expandedTickets.size) return
    const expandedIds = new Set(this.expandedTickets)
    this.tickets
      .filter((ticket) => expandedIds.has(ticket.id))
      .forEach((ticket) => {
        this.ticketService.findOne(ticket.id).subscribe({
          next: (full) => {
            ticket.items = full.items ?? []
            ticket.items.forEach((item) => this.loadItemQuoteTotal(item))
          },
          error: () => {
            // silencio: se puede reintentar al volver a expandir
          },
        })
      })
  }

  private loadBusinessPartners(): void {
    this.businessPartnersService
      .findAll({ page: 1, limit: 100, companyId: this.companyId })
      .subscribe({
        next: ({ data }) => {
          this.businessPartners = data ?? []
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
    const documentTypeIdControl = this.createTicketForm.get("documentTypeId")

    this.documentTypesService.findAll({ page: 1, limit: 50 }).subscribe(({ data }) => {
      this.documentTypes = data ?? []

      const documentTypeId = documentTypeIdControl?.value
      const documentNumber = (this.createTicketForm.get("documentNumber")?.value ?? "").toString().trim()
      const hasNumber = documentNumber.length > 0
      if (!hasNumber) {
        documentTypeIdControl?.enable({ emitEvent: false })
      }

      if (!hasNumber) {
        this.createTicketForm.patchValue({ documentTypeId: documentTypeId ?? null }, { emitEvent: false })
      }
    })
  }

  onDocumentNumberInput(): void {
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    const documentNumber = (this.createTicketForm.get("documentNumber")?.value ?? "").trim()
    console.debug("[docNumberInput] value", documentNumber, "expected", this.expectedDocumentDigits)
    this.createTicketForm.patchValue({ businessPartnerId: null }, { emitEvent: false })

    const docTypeControl = this.createTicketForm.get("documentTypeId")
    if (documentNumber) {
      docTypeControl?.disable({ emitEvent: false })
    } else {
      docTypeControl?.enable({ emitEvent: false })
    }

    if (!documentNumber) {
      console.debug("[docNumberInput] empty, docType stays", this.createTicketForm.get("documentTypeId")?.value)
      return
    }

    const docTypeId = this.createTicketForm.get("documentTypeId")?.value
    const docType = this.documentTypes.find((type) => Number(type.id) === Number(docTypeId))
    if (!docType) {
      this.documentSearchError = "Selecciona primero el tipo de documento."
      this.setCustomerFieldsEnabled(true)
      return
    }

    if (docType.digits && documentNumber.length > docType.digits) {
      const trimmed = documentNumber.slice(0, docType.digits)
      console.debug("[docNumberInput] trim to", trimmed)
      this.createTicketForm.get("documentNumber")?.setValue(trimmed)
      return
    }

    if (docType.digits && documentNumber.length === docType.digits) {
      this.lookupBusinessPartnerByDocument(documentNumber)
    }

    console.debug("[docNumberInput] docType after input", this.createTicketForm.get("documentTypeId")?.value)
  }

  getSelectedDocumentTypeName(): string {
    const docTypeId = this.createTicketForm.get("documentTypeId")?.value
    if (docTypeId) {
      const docType = this.documentTypes.find((type) => Number(type.id) === Number(docTypeId))
      if (docType) {
        return docType.name
      }
    }
    const partnerId = this.createTicketForm.get("businessPartnerId")?.value
    if (partnerId) {
      const partner = this.businessPartners.find((bp) => bp.id === Number(partnerId))
      if (partner?.documentType?.name) {
        return partner.documentType.name
      }
    }
    return "Sin asignar"
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase()
    const startDate = this.parseDateFilter(this.filterStartDate, false)
    const endDate = this.parseDateFilter(this.filterEndDate, true)
    this.filteredTickets = this.tickets.filter((ticket) => {
      const matchState = this.filterState === "all" || ticket.status === this.filterState
      const matchPriority = this.filterPriority === "all" || ticket.priority === this.filterPriority
      const matchDate = this.matchesDateRange(ticket.createdAt, startDate, endDate)
      const matchSearch =
        term === "" ||
        ticket.code.toLowerCase().includes(term) ||
        (ticket.contactName ?? "").toLowerCase().includes(term) ||
        (ticket.contactEmail ?? "").toLowerCase().includes(term)
      return matchState && matchPriority && matchDate && matchSearch
    })
    this.updatePagination()
  }

  onSearchChange(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  onDocumentTypeChange(): void {
    const typeId = this.createTicketForm.get("documentTypeId")?.value
    console.debug("[docTypeChange] typeId", typeId)
    this.updateExpectedDocumentDigits(typeId)
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.createTicketForm.get("documentNumber")?.setValue("")
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
    const calculatedPages = Math.ceil(this.filteredTickets.length / this.itemsPerPage) || 1
    this.totalPages = Math.max(1, calculatedPages)
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }
    if (this.currentPage < 1) {
      this.currentPage = 1
    }
    const start = (this.currentPage - 1) * this.itemsPerPage
    const end = start + this.itemsPerPage
    this.paginatedTickets = this.filteredTickets.slice(start, end)
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

  toggleTicketExpansion(ticketId: number, event?: Event): void {
    event?.stopPropagation()
    if (this.expandedTickets.has(ticketId)) {
      this.expandedTickets.delete(ticketId)
    } else {
      this.expandedTickets.add(ticketId)
      const ticket = this.tickets.find((t) => t.id === ticketId)
      if (!ticket) return
      if (!ticket.items?.length) {
        this.ticketService.findOne(ticketId).subscribe({
          next: (full) => {
            ticket.items = full.items ?? []
            ticket.items.forEach((item) => this.loadItemQuoteTotal(item))
          },
          error: () => {
            this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar los items del ticket.")
          },
        })
        return
      }
      ticket.items.forEach((item) => this.loadItemQuoteTotal(item))
    }
  }

  isTicketExpanded(ticketId: number): boolean {
    return this.expandedTickets.has(ticketId)
  }

  isFinalTicket(ticket?: Ticket | null): boolean {
    if (!ticket) return false
    return [TicketStatus.COMPLETED, TicketStatus.CANCELLED].includes(ticket.status)
  }

  hasPendingQuoteItems(ticket: Ticket): boolean {
    return (ticket.items ?? []).some((item) => item.status === TicketItemStatus.DIAGNOSED)
  }

  hasRejectedQuoteItems(ticket: Ticket): boolean {
    return (ticket.items ?? []).some((item) =>
      [
        TicketItemStatus.SUPERVISOR_REJECTED,
        TicketItemStatus.CLIENT_REJECTED,
      ].includes(item.status),
    )
  }

  hasPendingDeliveryItems(ticket: Ticket): boolean {
    return (ticket.items ?? []).some((item) => item.status === TicketItemStatus.REPAIRED)
  }

  canMarkClientApproved(item: TicketItem): boolean {
    if (!item) return false
    return item.status === TicketItemStatus.SUPERVISOR_APPROVED
  }

  canDeliverItem(item: TicketItem): boolean {
    return !!item && item.status === TicketItemStatus.REPAIRED
  }

  canReassignTechnician(item?: TicketItem | null): boolean {
    if (!item) return false
    return ![
      TicketItemStatus.REPAIRED,
      TicketItemStatus.DELIVERED,
    ].includes(item.status)
  }

  markItemClientApproved(item: TicketItem, event?: Event): void {
    event?.stopPropagation()
    if (!item?.id) return
    const itemId = Number(item.id)

    const sendToClient$ = this.ticketItemService.changeStatus(itemId, TicketItemStatus.SENT_TO_CLIENT)
    const awaitingClient$ = this.ticketItemService.changeStatus(itemId, TicketItemStatus.AWAITING_CLIENT_RESPONSE)
    const approve$ = this.ticketItemService.changeStatus(itemId, TicketItemStatus.CLIENT_APPROVED)

    sendToClient$
      .pipe(switchMap(() => awaitingClient$), switchMap(() => approve$))
      .subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Item marcado como aprobado por cliente.")
        this.loadTickets()
      },
      error: () => {
        this.showMessage("danger", "fas fa-times-circle", "No pudimos marcar el item como aprobado por cliente.")
      },
    })
  }

  deliverItem(item: TicketItem, event?: Event): void {
    event?.stopPropagation()
    if (!item?.id) return
    this.ticketItemService.changeStatus(Number(item.id), TicketItemStatus.DELIVERED).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Entrega registrada.")
        this.loadTickets()
      },
      error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar la entrega."),
    })
  }

  openCreateTicketModal(): void {
    this.showCreateTicketModal = true
    this.createTicketForm.reset({
      businessPartnerId: null,
      documentNumber: "",
      documentTypeId: null,
      priority: TicketPriority.MEDIUM,
      notes: "",
    })
    while (this.ticketItems.length > 0) {
      this.ticketItems.removeAt(0)
    }
    this.ticketItems.push(this.createTicketItemGroup())
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.isSearchingPartner = false
    this.setCustomerFieldsEnabled(true)
  }

  closeCreateTicketModal(): void {
    this.showCreateTicketModal = false
    this.createTicketForm.reset()
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    this.isSearchingPartner = false
    this.setCustomerFieldsEnabled(true)
  }

  private applyPartnerContact(partnerId: number | null): void {
    if (!partnerId) {
      this.createTicketForm.patchValue(
        { contactName: "", contactEmail: "", contactPhone: "" },
        { emitEvent: false },
      )
      this.setCustomerFieldsEnabled(true)
      return
    }
    const partner = this.businessPartners.find((bp) => bp.id === Number(partnerId))
    if (!partner) return
    this.applyPartnerData(partner)
  }

  submitCreateTicket(): void {
    if (this.createTicketForm.invalid) {
      this.markFormGroupAsTouched(this.createTicketForm)
      return
    }

    const formValue = this.createTicketForm.getRawValue()
    const itemsPayload = this.ticketItems.controls.map((control) => this.buildTicketItemPayload(control as FormGroup))
    if (!itemsPayload.length) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Agrega al menos un equipo.")
      return
    }

    if (this.ticketItems.controls.some((group) => group.invalid)) {
      this.ticketItems.controls.forEach((group) => this.markFormGroupAsTouched(group as FormGroup))
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa la información de cada equipo.")
      return
    }

    this.isCreatingTicket = true
    this.resolveBusinessPartnerId(formValue)
      .pipe(
        switchMap((businessPartnerId) => {
          const payload: TicketSaveRequest = {
            businessPartnerId,
            priority: formValue.priority,
            contactName: formValue.contactName || null,
            contactPhone: formValue.contactPhone || null,
            contactEmail: formValue.contactEmail || null,
            notes: formValue.notes ?? null,
            paymentStatus: PaymentStatus.PENDING,
            currency: "PEN",
            items: itemsPayload,
          }
          return this.ticketService.create(payload)
        }),
        finalize(() => (this.isCreatingTicket = false)),
      )
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Ticket creado correctamente.")
          this.closeCreateTicketModal()
          this.loadTickets()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos crear el ticket.")
        },
      })
  }

  private resolveBusinessPartnerId(formValue: Record<string, any>) {
    const existingPartnerId = Number(this.createTicketForm.get("businessPartnerId")?.value)
    if (existingPartnerId) {
      return of(existingPartnerId)
    }

    const documentNumber = String(this.createTicketForm.get("documentNumber")?.value ?? "").trim()
    const documentTypeId = Number(this.createTicketForm.get("documentTypeId")?.value)
    const contactName = String(this.createTicketForm.get("contactName")?.value ?? "").trim()
    const contactPhone = String(this.createTicketForm.get("contactPhone")?.value ?? "").trim()

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

    const payload: BusinessPartnerSaveRequest = {
      companyId: this.companyId,
      name: contactName,
      tradeName: contactName,
      documentTypeId,
      documentNumber,
      email: this.createTicketForm.get("contactEmail")?.value ?? null,
      phone: this.createTicketForm.get("contactPhone")?.value ?? null,
      address: null,
      city: null,
      country: null,
      isClient: true,
      isSupplier: false,
    }

    return this.businessPartnersService.create(payload).pipe(
      map((partner) => ({
        ...partner,
        id: Number(partner.id),
        companyId: Number(partner.companyId),
        documentTypeId: Number(partner.documentTypeId),
      })),
      tap((partner) => {
        this.businessPartners = [partner, ...this.businessPartners]
        this.createTicketForm.patchValue({ businessPartnerId: Number(partner.id) })
        this.documentSearchMessage = "Cliente creado correctamente."
        this.documentSearchError = ""
      }),
  map((partner) => Number(partner.id)),
    )
  }

  private lookupBusinessPartnerByDocument(documentNumber: string): void {
    const normalizedDoc = documentNumber.trim()
    const docTypeId = this.createTicketForm.get("documentTypeId")?.value

    const localMatch = this.businessPartners.find(
      (partner) => partner.documentNumber?.trim() === normalizedDoc && Number(partner.documentTypeId) === Number(docTypeId),
    )
    if (localMatch) {
      this.applyPartnerData(localMatch)
      return
    }

    this.isSearchingPartner = true
    this.businessPartnersService
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

  private applyPartnerData(partner: BusinessPartnerResponse): void {
    const documentTypeId = partner.documentTypeId ?? partner.documentType?.id ?? null

    this.createTicketForm.patchValue(
      {
        businessPartnerId: Number(partner.id),
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
      const phoneControl = this.createTicketForm.get("contactPhone")
      phoneControl?.enable({ emitEvent: false })
    }
  }

  private updateExpectedDocumentDigits(documentTypeId: number | null): void {
    const docType = this.documentTypes.find((type) => Number(type.id) === Number(documentTypeId))
    console.debug("[updateDigits] docTypeId", documentTypeId, "digits", docType?.digits)
    this.expectedDocumentDigits = docType?.digits ?? null

    const control = this.createTicketForm.get("documentNumber")
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
      "No encontramos un cliente con ese documento y tipo. Completa los datos para registrarlo al crear el ticket."
    this.createTicketForm.patchValue(
      {
        businessPartnerId: null,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      },
      { emitEvent: false },
    )
    this.setCustomerFieldsEnabled(true)
  }

  private buildTicketItemPayload(group: FormGroup): TicketItemSaveRequest {
    return {
      equipmentType: group.get("equipmentType")?.value,
      serviceType: group.get("serviceType")?.value ?? ServiceType.DIAGNOSIS,
      brand: group.get("brand")?.value ?? null,
      model: group.get("model")?.value ?? null,
      serialNumber: group.get("serialNumber")?.value ?? null,
      initialIssue: group.get("initialIssue")?.value,
      accessories: group.get("accessories")?.value ?? null,
    }
  }

  openCreateQuoteModal(ticket: Ticket, item?: TicketItem, event?: Event): void {
    event?.stopPropagation()
    if (!ticket.items?.length) {
      this.showMessage("warning", "fas fa-info-circle", "El ticket no tiene items para cotizar.")
      return
    }
    this.quoteTicket = ticket
    const targetItem = item ?? ticket.items[0]
    if (!targetItem) {
      this.showMessage("warning", "fas fa-info-circle", "Selecciona un equipo válido para cotizar.")
      return
    }
    this.selectedTicketItem = targetItem
    this.selectedTicketItemId = Number(targetItem.id)
    this.loadCurrentDiagnosis(this.selectedTicketItemId)
    this.quoteItems = []
    this.isResubmittingQuote = false
    this.selectedQuoteDetail = null
    this.showCreateQuoteModal = true
    this.createQuoteForm.reset({ currency: "PEN", notes: "" })
  }

  closeCreateQuoteModal(): void {
    this.showCreateQuoteModal = false
    this.createQuoteForm.reset()
    this.quoteItems = []
    this.selectedTicketItemId = null
    this.selectedTicketItem = null
    this.quoteTicket = null
    this.isResubmittingQuote = false
    this.selectedQuoteDetail = null
    this.currentDiagnosis = null
  }

  addProductToQuote(): void {
    this.quoteItems.push(this.createProductComposer())
  }

  addServiceToQuote(): void {
    this.quoteItems.push(this.createServiceComposer())
  }

  onProductSelected(item: QuoteProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (item.productId) {
      this.fetchProductPrice(item)
    } else {
      item.unitPrice = 0
    }
  }

  onProductQuantityChange(item: QuoteProductComposer, value: any): void {
    const qty = Number(value) || 1
    item.quantity = qty
    if (item.productId) {
      this.fetchProductPrice(item)
    }
  }

  fetchProductPrice(item: QuoteProductComposer): void {
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

  removeQuoteItem(index: number, collection: QuoteComposerItem[] = this.quoteItems): void {
    const item = collection[index]
    if (this.isDiagnosticServiceItem(item)) {
      this.showMessage("warning", "fas fa-exclamation-circle", "El servicio de diagnóstico es obligatorio.")
      return
    }
    collection.splice(index, 1)
  }

  calculateItemSubtotal(item: QuoteComposerItem): number {
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    const service = this.services.find((svc) => Number(svc.id) === Number(item.serviceId))
    const servicePrice = service?.price ?? 0
    return Number(servicePrice)
  }

  calculateQuoteTotal(): number {
    const baseTotal = this.quoteItems.reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
    if (this.shouldIncludeDiagnosticFee() && !this.hasDiagnosticServiceInQuote()) {
      return baseTotal + this.getDiagnosticServicePrice()
    }
    return baseTotal
  }

  getDiagnosticServicePrice(): number {
    return Number(this.diagnosticFeeService?.price ?? 0)
  }

  shouldIncludeDiagnosticFee(): boolean {
    return this.selectedTicketItem?.serviceType === ServiceType.DIAGNOSIS && !!this.diagnosticFeeService
  }

  hasDiagnosticServiceInQuote(): boolean {
    if (!this.diagnosticFeeService?.id) return false
    return this.quoteItems.some(
      (item) => item.type === "service" && Number(item.serviceId) === Number(this.diagnosticFeeService?.id),
    )
  }

  isDiagnosticServiceItem(item?: QuoteComposerItem | null): boolean {
    if (!item || item.type !== "service" || !this.diagnosticFeeService?.id) return false
    return Number(item.serviceId) === Number(this.diagnosticFeeService.id)
  }

  submitCreateQuote(): void {
    if (this.isResubmittingQuote) {
      this.submitResubmitQuote()
      return
    }

    if (this.createQuoteForm.invalid || this.quoteItems.length === 0 || !this.selectedTicketItemId) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Selecciona el item y agrega productos o servicios.")
      return
    }

    const productsPayload = this.quoteItems.reduce<{ productId: number; quantity: number; unitPrice?: number; requiresPurchase: boolean; notes?: string }[]>((acc, entry) => {
      if (entry.type !== "product") return acc
      const productId = this.toNumericId(entry.productId)
      if (!productId) return acc
      acc.push({
        productId,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice || undefined,
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

    if (productsPayload.length === 0 && servicesPayload.length === 0) {
      this.showMessage("warning", "fas fa-info-circle", "Agrega por lo menos un producto o servicio válido.")
      return
    }

    const payload: QuoteRequest = {
      ticketItemId: Number(this.selectedTicketItemId),
      currency: this.createQuoteForm.get("currency")?.value,
      notes: this.createQuoteForm.get("notes")?.value,
      products: productsPayload,
      services: servicesPayload,
    }

    this.isCreatingQuote = true
    this.quoteService
      .create(payload)
      .pipe(finalize(() => (this.isCreatingQuote = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización registrada correctamente.")
          this.closeCreateQuoteModal()
          this.loadTickets()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos crear la cotización.")
        },
      })
  }

  viewItemQuotes(ticket: Ticket, item: TicketItem, event?: Event): void {
    event?.stopPropagation()
    this.quotesTicket = ticket
    this.quotesTicketItem = item
    this.ticketItemQuotes = []
    this.quotesError = ""
    this.quoteDetailError = ""
    this.selectedQuoteDetail = null
    this.showQuotesModal = true
    this.isLoadingQuotes = true

    this.quoteService
      .findAll({ page: 1, limit: 20, ticketItemId: Number(item.id) })
      .pipe(finalize(() => (this.isLoadingQuotes = false)))
      .subscribe({
        next: ({ data }) => {
          this.ticketItemQuotes = data ?? []
        },
        error: () => {
          this.quotesError = "No pudimos cargar las cotizaciones de este item."
        },
      })
  }

  closeQuotesModal(): void {
    this.showQuotesModal = false
    this.ticketItemQuotes = []
    this.quotesError = ""
    this.quotesTicket = null
    this.quotesTicketItem = null
    this.selectedQuoteDetail = null
    this.quoteDetailError = ""
  }

  getPriorityBadgeClass(priority: TicketPriority): string {
    switch (priority) {
      case TicketPriority.HIGH:
        return "badge-danger"
      case TicketPriority.MEDIUM:
        return "badge-warning"
      case TicketPriority.LOW:
        return "badge-info"
      default:
        return "badge-secondary"
    }
  }

  getPaymentStatusBadgeClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PAID:
        return "badge-success"
      case PaymentStatus.PARTIAL:
        return "badge-warning"
      case PaymentStatus.PENDING:
      default:
        return "badge-danger"
    }
  }

  getDaysUntilDeadline(deadline: string | Date | null | undefined): number {
    if (!deadline) return 0
    const deadlineDate = new Date(deadline)
    if (Number.isNaN(deadlineDate.getTime())) return 0
    const diffTime = deadlineDate.getTime() - Date.now()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  getTicketItemLabel(item: TicketItem): string {
    const parts = [
      `Equipo #${item.itemNumber}`,
      this.getEquipmentTypeLabel(item.equipmentType),
      item.brand || null,
      item.model || null,
      item.serialNumber ? `SN ${item.serialNumber}` : null,
    ].filter(Boolean)
    return parts.join(" · ")
  }

  getTicketStatusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABELS[status] ?? status
  }

  getPriorityLabel(priority: TicketPriority): string {
    return TICKET_PRIORITY_LABELS[priority] ?? priority
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status] ?? status
  }

  private loadItemQuoteTotal(item: TicketItem): void {
    const itemId = Number(item.id)
    if (!itemId || this.itemQuoteTotals[itemId]) {
      return
    }

    this.quoteService
      .findAll({ page: 1, limit: 5, ticketItemId: itemId })
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          const approved = list.find((q: Quote) => q.status === QuoteStatus.CLIENT_APPROVED)
          const candidate = approved ?? list[0]
          if (candidate?.totalAmount !== undefined) {
            this.itemQuoteTotals[itemId] = Number(candidate.totalAmount) || 0
          }
        },
        error: () => {
          // silencio: si falla, se seguirá mostrando el fallback
        },
      })
  }

  getTicketItemQuoteTotal(item: TicketItem): number {
    const cached = this.itemQuoteTotals[item.id]
    if (cached !== undefined) return cached
    const amount = (item as any).totalAmount ?? item.finalAmount ?? 0
    return Number(amount) || 0
  }

  isQuoteApproved(item: TicketItem): boolean {
    return [
      TicketItemStatus.CLIENT_APPROVED,
      TicketItemStatus.READY_FOR_REPAIR,
      TicketItemStatus.IN_REPAIR,
      TicketItemStatus.REPAIRED,
      TicketItemStatus.DELIVERED,
    ].includes(item.status)
  }

  getTicketItemQuoteStatusText(item: TicketItem): string {
    switch (item.status) {
      case TicketItemStatus.SUPERVISOR_REJECTED:
        return "Rechazada por supervisor"
      case TicketItemStatus.CLIENT_REJECTED:
        return "Rechazada por cliente"
      case TicketItemStatus.SUPERVISOR_APPROVED:
        return "Aprobada por supervisor"
      case TicketItemStatus.SENT_TO_CLIENT:
      case TicketItemStatus.AWAITING_CLIENT_RESPONSE:
        return "Enviada al cliente"
      case TicketItemStatus.QUOTED:
        return "Pendiente de aprobación"
      case TicketItemStatus.DIAGNOSED:
        return "Pendiente de cotización"
      case TicketItemStatus.QUOTE_EXPIRED:
        return "Cotización expirada"
      default:
        return "Sin cotización"
    }
  }

  getTicketQuotedTotal(ticket: Ticket): number {
    if (ticket.items?.length) {
      const sum = ticket.items.reduce((acc, item) => acc + this.getTicketItemQuoteTotal(item), 0)
      if (sum > 0) return sum
    }
    return ticket.totalQuotedAmount ?? 0
  }

  getTicketItemStatusLabel(status: TicketItemStatus): string {
    return TICKET_ITEM_STATUS_LABELS[status] ?? status
  }

  canQuoteItem(item: TicketItem): boolean {
    if (!item) return false
    // Diagnóstico: cotizar al completar diagnóstico
    if (item.serviceType === ServiceType.DIAGNOSIS) {
      return item.status === TicketItemStatus.DIAGNOSED
    }
    // Servicio estándar: cotizar desde ASSIGNED o QUOTED (para rehacer)
    if (item.serviceType === ServiceType.STANDARD_SERVICE) {
      return [TicketItemStatus.ASSIGNED, TicketItemStatus.QUOTED, TicketItemStatus.QUOTE_EXPIRED].includes(
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

  get runningTicketsCount(): number {
    return this.tickets.filter((ticket) =>
      [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PARTIALLY_COMPLETED].includes(ticket.status),
    ).length
  }

  get highPriorityTicketsCount(): number {
    return this.tickets.filter((ticket) => ticket.priority === TicketPriority.HIGH).length
  }

  get diagnosticPendingQuotesCount(): number {
    return this.tickets.reduce((total, ticket) => {
      const items = ticket.items ?? []
      const pending = items.filter(
        (item) => item.status === TicketItemStatus.DIAGNOSED && !item.quotedAt && !item.quoteApprovedAt,
      ).length
      return total + pending
    }, 0)
  }

  get sentQuotesCount(): number {
    return this.ticketItemQuotes.filter((q) => Boolean(q.sentToClientAt)).length
  }

  get approvedQuotesCount(): number {
    return this.ticketItemQuotes.filter((q) => Boolean(q.clientApprovedAt)).length
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

  private createTicketItemGroup(): FormGroup {
    return this.formBuilder.group({
      equipmentType: [EquipmentType.LAPTOP, Validators.required],
      serviceType: [null, Validators.required],
      brand: [""],
      model: [""],
      serialNumber: [""],
      initialIssue: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      accessories: [""],
    })
  }

  private createProductComposer(): QuoteProductComposer {
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

  private createServiceComposer(): QuoteServiceComposer {
    return {
      id: Date.now(),
      type: "service",
      serviceId: null,
      notes: "",
    }
  }

  get ticketItems(): FormArray {
    return this.createTicketForm.get("ticketItems") as FormArray
  }

  addTicketItem(): void {
    this.ticketItems.push(this.createTicketItemGroup())
  }

  removeTicketItem(index: number): void {
    if (this.ticketItems.length === 1) {
      return
    }
    this.ticketItems.removeAt(index)
  }

  getTicketItemControl(index: number, controlName: string) {
    return this.ticketItems.at(index)?.get(controlName) ?? null
  }

  get isExistingPartner(): boolean {
    return Boolean(this.createTicketForm.get("businessPartnerId")?.value)
  }

  private setCustomerFieldsEnabled(enabled: boolean): void {
    const controls = [
      "documentTypeId",
      "contactName",
      "contactEmail",
      "contactPhone",
    ]
    controls.forEach((controlName) => {
      const control = this.createTicketForm.get(controlName)
      if (!control) return
      if (enabled) {
        control.enable({ emitEvent: false })
      } else {
        control.disable({ emitEvent: false })
      }
    })
  }

  viewQuoteDetail(quote: Quote): void {
    this.isLoadingQuoteDetail = true
    this.quoteDetailError = ""
    this.selectedQuoteDetail = null
    this.quoteService
      .findOne(quote.id, true)
      .pipe(finalize(() => (this.isLoadingQuoteDetail = false)))
      .subscribe({
        next: (detail) => (this.selectedQuoteDetail = detail),
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

  private loadCurrentDiagnosis(ticketItemId: number | null): void {
    if (!ticketItemId) {
      this.currentDiagnosis = null
      return
    }
    this.isLoadingDiagnosis = true
    this.diagnosticService
      .findAll({ page: 1, limit: 1, ticketItemId, status: "CURRENT" })
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

  getQuoteStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending_supervisor_approval: "Pendiente aprobación supervisor",
      supervisor_approved: "Aprobada por supervisor",
      supervisor_rejected: "Rechazada por supervisor",
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

  getQuoteStatusClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      pending_supervisor_approval: "status-pending-supervisor",
      supervisor_approved: "status-supervisor-approved",
      supervisor_rejected: "status-supervisor-rejected",
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

  sendQuoteToClient(quote: Quote): void {
    if (!quote?.id) return
    this.isLoadingQuoteDetail = true
    this.quoteService
      .sendToClient(quote.id)
      .pipe(finalize(() => (this.isLoadingQuoteDetail = false)))
      .subscribe({
        next: (updatedQuote) => {
          this.showMessage("success", "fas fa-check-circle", "Cotización enviada al cliente correctamente.")
          const index = this.ticketItemQuotes.findIndex((q) => q.id === quote.id)
          if (index >= 0) {
            this.ticketItemQuotes[index] = updatedQuote
          }
          if (this.selectedQuoteDetail?.id === quote.id) {
            this.selectedQuoteDetail = updatedQuote
          }
          this.loadTickets()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos enviar la cotización al cliente.")
        },
      })
  }

  resubmitQuote(quote: Quote): void {
    if (!quote?.id) return
    const ticket = this.quotesTicket
    const item = this.quotesTicketItem
    if (!ticket || !item) {
      this.showMessage("warning", "fas fa-info-circle", "No se pudo preparar la cotización para reenviar.")
      return
    }
    this.showQuotesModal = false
    this.openResubmitQuoteModal(quote, ticket, item)
  }

  openResubmitQuoteModal(quote: Quote, ticket?: Ticket, item?: TicketItem): void {
    const targetTicket = ticket ?? this.quotesTicket
    const targetItem = item ?? this.quotesTicketItem
    if (!targetTicket || !targetItem) return
    this.quoteTicket = targetTicket
    this.selectedTicketItem = targetItem
    this.selectedTicketItemId = Number(targetItem.id)
    this.loadCurrentDiagnosis(this.selectedTicketItemId)
    this.selectedQuoteDetail = quote
    this.isResubmittingQuote = true
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

    this.createQuoteForm.patchValue({
      currency: quote.currency,
      notes: quote.notes || "",
    })

    this.showCreateQuoteModal = true
  }

  submitResubmitQuote(): void {
    if (!this.selectedQuoteDetail?.id || this.createQuoteForm.invalid || this.quoteItems.length === 0) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa los datos y agrega productos o servicios.")
      return
    }

    const productsPayload = this.quoteItems.reduce<{ productId: number; quantity: number; unitPrice?: number; requiresPurchase: boolean; notes?: string }[]>((acc, entry) => {
      if (entry.type !== "product") return acc
      const productId = this.toNumericId(entry.productId)
      if (!productId) return acc
      acc.push({
        productId,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice || undefined,
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
      products: productsPayload.length > 0 ? productsPayload : undefined,
      services: servicesPayload.length > 0 ? servicesPayload : undefined,
      notes: this.createQuoteForm.get("notes")?.value || undefined,
    }

    this.isCreatingQuote = true

    const status = (this.selectedQuoteDetail.status || "").toUpperCase()
    const resubmitMethod = status === "CLIENT_REJECTED"
      ? this.quoteService.resubmitAfterClientRejection(this.selectedQuoteDetail.id, payload)
      : this.quoteService.resubmitQuote(this.selectedQuoteDetail.id, payload)

    resubmitMethod
      .pipe(finalize(() => (this.isCreatingQuote = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización reenviada correctamente.")
          this.closeCreateQuoteModal()
          this.loadTickets()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos reenviar la cotización.")
        },
      })
  }

  // ===== EDICIÓN DE TICKET =====
  openEditTicketModal(ticket: Ticket, event?: Event): void {
    event?.stopPropagation()
    if (this.isFinalTicket(ticket)) {
      return
    }
    this.editingTicket = ticket
    this.editTicketForm.patchValue({
      contactName: ticket.contactName,
      contactEmail: ticket.contactEmail,
      contactPhone: ticket.contactPhone,
      priority: ticket.priority,
      notes: ticket.notes,
    })
    this.showEditTicketModal = true
  }

  closeEditTicketModal(): void {
    this.showEditTicketModal = false
    this.editingTicket = null
    this.editTicketForm.reset()
  }

  submitEditTicket(): void {
    if (this.editTicketForm.invalid || !this.editingTicket) {
      return
    }

    this.isSaving = true
    const payload = this.editTicketForm.value

    this.ticketService
      .update(this.editingTicket.id, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Ticket actualizado correctamente.")
          this.closeEditTicketModal()
          this.loadTickets()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el ticket.")
        },
      })
  }

  // ===== EDICIÓN DE ITEM =====
  openEditItemModal(item: TicketItem, event?: Event): void {
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

    this.ticketService
      .updateItem(this.editingItem.id, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Equipo actualizado correctamente.")
          this.closeEditItemModal()
          this.loadTickets()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el equipo.")
        },
      })
  }

  // ===== REASIGNACIÓN DE TÉCNICO =====
  openReassignTechnicianModal(item: TicketItem, event?: Event): void {
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

    this.ticketService
      .reassignTechnician(this.reassigningItem.id, technicianId)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Técnico reasignado correctamente.")
          this.closeReassignTechnicianModal()
          this.loadTickets()
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
