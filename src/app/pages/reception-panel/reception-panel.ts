import { Component, OnDestroy, OnInit } from "@angular/core"
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Subscription } from "rxjs"
import { finalize, map, switchMap, tap } from "rxjs/operators"
import { of, throwError } from "rxjs"
import { BusinessPartnersApiService } from "../../services/business-partners-api.service"
import { BusinessPartnerResponse } from "../../models/business-partners/business-partners-response"
import { BusinessPartnerSaveRequest } from "../../models/business-partners/business-partners-request"
import { TicketService } from "../../services/tickets/ticket.service"
import { Ticket, TicketPriority, TicketStatus, PaymentStatus } from "../../models/tickets/ticket"
import { TicketSaveRequest } from "../../models/tickets/ticket-request"
import { TicketItemSaveRequest } from "../../models/tickets/ticket-item-request"
import { EquipmentType, ServiceType, TicketItem, TicketItemStatus } from "../../models/tickets/ticket-item"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { ServiceService } from "../../services/service-catalog/service.service"
import { Service } from "../../models/service-catalog/service"
import { QuoteService } from "../../services/tickets/quote.service"
import { QuoteRequest } from "../../models/tickets/quote-request"
import { Quote } from "../../models/tickets/quote"
import { config } from "../../../environments/environment"
import { DocumentTypesApiService } from "../../services/document-types-api.service"
import { DocumentTypeResponse } from "../../models/document-types/document-types-response"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"

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
  [TicketItemStatus.CLIENT_REJECTED]: "Rechazado por cliente",
  [TicketItemStatus.AWAITING_PARTS]: "Esperando repuestos",
  [TicketItemStatus.IN_REPAIR]: "En reparación",
  [TicketItemStatus.REPAIRED]: "Reparado",
  [TicketItemStatus.READY_FOR_DELIVERY]: "Listo para entrega",
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
  filterState: "all" | TicketStatus = "all"
  filterPriority: "all" | TicketPriority = "all"
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
    private readonly businessPartnersService: BusinessPartnersApiService,
    private readonly productsService: ProductsService,
    private readonly serviceCatalog: ServiceService,
    private readonly quoteService: QuoteService,
    private readonly documentTypesService: DocumentTypesApiService,
    private readonly usersApi: UsersApiService,
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
      contactPhone: ["", Validators.pattern(/^[0-9+\-\s]*$/)],
      contactEmail: ["", Validators.email],
      tradeName: [""],
      address: [""],
      city: [""],
      country: [""],
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
      serviceLocation: ["ON_SITE", Validators.required],
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
    this.ticketService
      .findAll({ page: 1, limit: 50 })
      .pipe(finalize(() => (this.isLoadingTickets = false)))
      .subscribe({
        next: ({ data }) => {
          this.tickets = data ?? []
          this.currentPage = 1
          this.applyFilters()
        },
        error: () => {
          this.tickets = []
          this.filteredTickets = []
          this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar los tickets.")
        },
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
      next: ({ data }) => (this.services = data ?? []),
      error: () => this.showMessage("warning", "fas fa-concierge-bell", "No pudimos cargar los servicios."),
    })
  }

  private loadDocumentTypes(): void {
    const documentTypeIdControl = this.createTicketForm.get("documentTypeId")
    documentTypeIdControl?.disable()

    this.documentTypesService.findAll({ page: 1, limit: 50 }).subscribe(({ data }) => {
      this.documentTypes = data ?? []

      if (this.documentTypes.length > 0) {
        documentTypeIdControl?.enable()
      }

      const documentTypeId = documentTypeIdControl?.value
      const documentNumber = this.createTicketForm.get("documentNumber")?.value
      if (documentNumber && Number(documentNumber)) {
        const detectedType = this.documentTypes.find((type) => type.digits === String(documentNumber).length)
        if (detectedType) {
          this.createTicketForm.patchValue({ documentTypeId: detectedType.id }, { emitEvent: false })
        }
      } else if (documentTypeId === null) {
        this.createTicketForm.patchValue({ documentTypeId: null }, { emitEvent: false })
      }
    })
  }

  onDocumentNumberInput(): void {
    this.documentSearchMessage = ""
    this.documentSearchError = ""
    const documentNumber = (this.createTicketForm.get("documentNumber")?.value ?? "").trim()
    this.createTicketForm.patchValue({ businessPartnerId: null }, { emitEvent: false })

    if (!documentNumber) {
      return
    }

    const detectedType = this.documentTypes.find((type) => type.digits === documentNumber.length)
    if (detectedType) {
      this.createTicketForm.patchValue({ documentTypeId: detectedType.id }, { emitEvent: false })
    } else {
      this.createTicketForm.patchValue({ documentTypeId: null }, { emitEvent: false })
    }

    if (detectedType && documentNumber.length === detectedType.digits) {
      this.lookupBusinessPartnerByDocument(documentNumber)
    }
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
    this.filteredTickets = this.tickets.filter((ticket) => {
      const matchState = this.filterState === "all" || ticket.status === this.filterState
      const matchPriority = this.filterPriority === "all" || ticket.priority === this.filterPriority
      const matchSearch =
        term === "" ||
        ticket.code.toLowerCase().includes(term) ||
        (ticket.contactName ?? "").toLowerCase().includes(term) ||
        (ticket.contactEmail ?? "").toLowerCase().includes(term)
      return matchState && matchPriority && matchSearch
    })
    this.updatePagination()
  }

  onSearchChange(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  onFilterChange(): void {
    this.currentPage = 1
    this.applyFilters()
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
    }
  }

  isTicketExpanded(ticketId: number): boolean {
    return this.expandedTickets.has(ticketId)
  }

  hasPendingQuoteItems(ticket: Ticket): boolean {
    return (ticket.items ?? []).some((item) => item.status === TicketItemStatus.DIAGNOSED)
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
        { contactName: "", contactEmail: "", contactPhone: "", tradeName: "", address: "", city: "", country: "" },
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

    const formValue = this.createTicketForm.value
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

    if (!documentNumber || !documentTypeId || !contactName) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "Completa el documento y nombre para registrar al cliente.",
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
      tradeName: this.createTicketForm.get("tradeName")?.value || contactName,
      documentTypeId,
      documentNumber,
      email: this.createTicketForm.get("contactEmail")?.value ?? null,
      phone: this.createTicketForm.get("contactPhone")?.value ?? null,
      address: this.createTicketForm.get("address")?.value ?? null,
      city: this.createTicketForm.get("city")?.value ?? null,
      country: this.createTicketForm.get("country")?.value ?? null,
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
    const localMatch = this.businessPartners.find((partner) => partner.documentNumber?.trim() === normalizedDoc)
    if (localMatch) {
      this.applyPartnerData(localMatch)
      return
    }

    this.isSearchingPartner = true
    this.businessPartnersService
      .findAll({ page: 1, limit: 1, documentNumber: normalizedDoc, companyId: this.companyId })
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
        tradeName: partner.tradeName ?? "",
        address: partner.address ?? "",
        city: partner.city ?? "",
        country: partner.country ?? "",
      },
      { emitEvent: false },
    )

    this.documentSearchMessage = "Cliente encontrado. Datos completados automáticamente."
    this.documentSearchError = ""
    this.setCustomerFieldsEnabled(false)
  }

  private handlePartnerNotFound(): void {
    this.documentSearchMessage = ""
    this.documentSearchError =
      "No encontramos un cliente con ese documento. Completa los datos para registrarlo al crear el ticket."
    this.createTicketForm.patchValue(
      {
        businessPartnerId: null,
        documentTypeId: null,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        tradeName: "",
        address: "",
        city: "",
        country: "",
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
      slaTargetDays: 5,
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
  }

  addProductToQuote(): void {
    this.quoteItems.push(this.createProductComposer())
  }

  addServiceToQuote(): void {
    this.quoteItems.push(this.createServiceComposer())
  }

  removeQuoteItem(index: number, collection: QuoteComposerItem[] = this.quoteItems): void {
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
    return this.quoteItems.reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
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

    const productsPayload = this.quoteItems
      .filter((entry): entry is QuoteProductComposer => entry.type === "product" && !!entry.productId)
      .map((entry) => ({
        productId: Number(entry.productId!),
        quantity: entry.quantity,
        unitPrice: entry.unitPrice || undefined,
        requiresPurchase: entry.requiresPurchase,
        notes: entry.notes || undefined,
      }))

    const servicesPayload = this.quoteItems
      .filter((entry): entry is QuoteServiceComposer => entry.type === "service" && !!entry.serviceId)
      .map((entry) => ({
        serviceId: Number(entry.serviceId!),
        notes: entry.notes || undefined,
      }))

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
    const base = `Item #${item.itemNumber}`
    const issue = item.initialIssue ? ` · ${item.initialIssue}` : ""
    return `${base}${issue}`
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

  getTicketItemStatusLabel(status: TicketItemStatus): string {
    return TICKET_ITEM_STATUS_LABELS[status] ?? status
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

  get pendingPaymentsCount(): number {
    return this.tickets.filter((ticket) => ticket.paymentStatus !== PaymentStatus.PAID).length
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
      "tradeName",
      "address",
      "city",
      "country",
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
    this.closeQuotesModal()
    this.openResubmitQuoteModal(quote)
  }

  openResubmitQuoteModal(quote: Quote): void {
    if (!this.quotesTicket || !this.quotesTicketItem) return
    this.quoteTicket = this.quotesTicket
    this.selectedTicketItem = this.quotesTicketItem
    this.selectedTicketItemId = Number(this.quotesTicketItem.id)
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

    const productsPayload = this.quoteItems
      .filter((entry): entry is QuoteProductComposer => entry.type === "product" && !!entry.productId)
      .map((entry) => ({
        productId: Number(entry.productId!),
        quantity: entry.quantity,
        unitPrice: entry.unitPrice || undefined,
        requiresPurchase: entry.requiresPurchase,
        notes: entry.notes || undefined,
      }))

    const servicesPayload = this.quoteItems
      .filter((entry): entry is QuoteServiceComposer => entry.type === "service" && !!entry.serviceId)
      .map((entry) => ({
        serviceId: Number(entry.serviceId!),
        notes: entry.notes || undefined,
      }))

    const payload = {
      products: productsPayload.length > 0 ? productsPayload : undefined,
      services: servicesPayload.length > 0 ? servicesPayload : undefined,
      notes: this.createQuoteForm.get("notes")?.value || undefined,
    }

    this.isCreatingQuote = true

    const resubmitMethod = this.selectedQuoteDetail.status === "CLIENT_REJECTED"
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
      serviceLocation: item.serviceLocation,
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
