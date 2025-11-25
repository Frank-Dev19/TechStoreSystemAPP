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
import { EquipmentType, TicketItem } from "../../models/tickets/ticket-item"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { ServiceService } from "../../services/service-catalog/service.service"
import { Service } from "../../models/service-catalog/service"
import { QuoteService } from "../../services/tickets/quote.service"
import { QuoteRequest } from "../../models/tickets/quote-request"
import { config } from "../../../environments/environment"
import { DocumentTypesApiService } from "../../services/document-types-api.service"
import { DocumentTypeResponse } from "../../models/document-types/document-types-response"

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
  selectedTicket: Ticket | null = null
  selectedTicketItemId: number | null = null

  filterState: "all" | TicketStatus = "all"
  filterPriority: "all" | TicketPriority = "all"
  searchTerm = ""
  currentPage = 1
  itemsPerPage = 10
  totalPages = 1
  readonly Math = Math

  showCreateTicketModal = false
  showCreateQuoteModal = false

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

  isLoadingTickets = false
  isCreatingTicket = false
  isCreatingQuote = false

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  readonly equipmentTypeOptions = Object.values(EquipmentType)
  private readonly companyId = Number(config.defaultCompanyId ?? 1) || 1

  private readonly subscriptions = new Subscription()

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly ticketService: TicketService,
    private readonly businessPartnersService: BusinessPartnersApiService,
    private readonly productsService: ProductsService,
    private readonly serviceCatalog: ServiceService,
    private readonly quoteService: QuoteService,
    private readonly documentTypesService: DocumentTypesApiService,
  ) {
    this.createTicketForm = this.createTicketFormGroup()
    this.createQuoteForm = this.createQuoteFormGroup()
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
    this.documentTypesService.findAll({ page: 1, limit: 50 }).subscribe(({ data }) => {
      this.documentTypes = data ?? []
      const documentTypeId = this.createTicketForm.get("documentTypeId")?.value
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

  selectTicket(ticket: Ticket): void {
    this.selectedTicket = ticket
    this.selectedTicketItemId = ticket.items?.[0]?.id ?? null
  }

  clearSelectedTicket(): void {
    this.selectedTicket = null
    this.selectedTicketItemId = null
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
        this.createTicketForm.patchValue({ businessPartnerId: partner.id })
        this.documentSearchMessage = "Cliente creado correctamente."
        this.documentSearchError = ""
      }),
      map((partner) => partner.id),
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
    this.createTicketForm.patchValue(
      {
        businessPartnerId: partner.id,
        documentNumber: partner.documentNumber ?? "",
        documentTypeId: partner.documentTypeId ?? partner.documentType?.id ?? null,
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
      brand: group.get("brand")?.value ?? null,
      model: group.get("model")?.value ?? null,
      serialNumber: group.get("serialNumber")?.value ?? null,
      initialIssue: group.get("initialIssue")?.value,
      accessories: group.get("accessories")?.value ?? null,
      requiresDiagnosis: true,
      slaTargetDays: 5,
    }
  }

  openCreateQuoteModal(ticket: Ticket): void {
    if (!ticket.items?.length) {
      this.showMessage("warning", "fas fa-info-circle", "El ticket no tiene items para cotizar.")
      return
    }
    this.selectedTicket = ticket
    this.selectedTicketItemId = ticket.items[0]?.id ?? null
    this.quoteItems = []
    this.showCreateQuoteModal = true
    this.createQuoteForm.reset({ currency: "PEN", notes: "" })
  }

  closeCreateQuoteModal(): void {
    this.showCreateQuoteModal = false
    this.createQuoteForm.reset()
    this.quoteItems = []
    this.selectedTicketItemId = null
  }

  addProductToQuote(): void {
    this.quoteItems.push({
      id: Date.now(),
      type: "product",
      productId: null,
      quantity: 1,
      unitPrice: 0,
      requiresPurchase: false,
      notes: "",
    })
  }

  addServiceToQuote(): void {
    this.quoteItems.push({
      id: Date.now(),
      type: "service",
      serviceId: null,
      notes: "",
    })
  }

  removeQuoteItem(index: number): void {
    this.quoteItems.splice(index, 1)
  }

  calculateItemSubtotal(item: QuoteComposerItem): number {
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    const service = this.services.find((svc) => svc.id === item.serviceId)
    return service?.price ?? 0
  }

  calculateQuoteTotal(): number {
    return this.quoteItems.reduce((total, item) => total + this.calculateItemSubtotal(item), 0)
  }

  submitCreateQuote(): void {
    if (this.createQuoteForm.invalid || this.quoteItems.length === 0 || !this.selectedTicketItemId) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Selecciona el item y agrega productos o servicios.")
      return
    }

    const productsPayload = this.quoteItems
      .filter((entry): entry is QuoteProductComposer => entry.type === "product" && !!entry.productId)
      .map((entry) => ({
        productId: entry.productId!,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice || undefined,
        requiresPurchase: entry.requiresPurchase,
        notes: entry.notes || undefined,
      }))

    const servicesPayload = this.quoteItems
      .filter((entry): entry is QuoteServiceComposer => entry.type === "service" && !!entry.serviceId)
      .map((entry) => ({
        serviceId: entry.serviceId!,
        notes: entry.notes || undefined,
      }))

    if (productsPayload.length === 0 && servicesPayload.length === 0) {
      this.showMessage("warning", "fas fa-info-circle", "Agrega por lo menos un producto o servicio válido.")
      return
    }

    const payload: QuoteRequest = {
      ticketItemId: this.selectedTicketItemId,
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
      brand: [""],
      model: [""],
      serialNumber: [""],
      initialIssue: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    })
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
}
