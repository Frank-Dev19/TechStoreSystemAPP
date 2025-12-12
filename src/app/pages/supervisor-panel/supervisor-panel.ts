import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { finalize } from "rxjs/operators"
import { Quote, QuoteStatus } from "../../models/tickets/quote"
import { QuoteService } from "../../services/tickets/quote.service"
import { TicketItemService } from "../../services/tickets/ticket-item.service"
import { TicketItem } from "../../models/tickets/ticket-item"
import { Product } from "../../models/catalog/product"
import { Service } from "../../models/service-catalog/service"
import { ProductsService } from "../../services/inventory/products.service"
import { ServiceService } from "../../services/service-catalog/service.service"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { CurrentUserService } from "../../services/current-user.service"
import { User } from "../../models/user/user"
import { hasAnyRole, SUPERVISOR_ROLE_NAMES } from "../../utils/role.utils"

@Component({
  selector: "app-supervisor-panel",
  standalone: false,
  templateUrl: "./supervisor-panel.html",
  styleUrls: ["./supervisor-panel.scss"],
})
export class SupervisorPanel implements OnInit {
  activeTab: "pending" | "approved" | "rejected" | "all" = "pending"

  pendingQuotes: Quote[] = []
  approvedQuotes: Quote[] = []
  rejectedQuotes: Quote[] = []
  allQuotes: Quote[] = []

  selectedQuote: Quote | null = null
  selectedTicketItem: TicketItem | null = null

  showApprovalModal = false
  showRejectionModal = false
  showAssignSupervisorModal = false

  approvalForm: FormGroup
  rejectionForm: FormGroup
  assignSupervisorForm: FormGroup

  products: Product[] = []
  services: Service[] = []
  supervisors: UserApi[] = []
  currentUserId: number | null = null
  isSupervisor = false

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingQuotes = false
  isProcessingAction = false

  readonly QuoteStatusEnum = QuoteStatus

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly quoteService: QuoteService,
    private readonly ticketItemService: TicketItemService,
    private readonly productsService: ProductsService,
    private readonly serviceService: ServiceService,
    private readonly usersApi: UsersApiService,
    private readonly currentUserService: CurrentUserService,
  ) {
    this.approvalForm = this.createApprovalForm()
    this.rejectionForm = this.createRejectionForm()
    this.assignSupervisorForm = this.createAssignSupervisorForm()
  }

  ngOnInit(): void {
    this.loadCurrentUser()
    this.loadQuotes()
    this.loadCatalogData()
    this.loadSupervisors()
  }

  private createApprovalForm(): FormGroup {
    return this.formBuilder.group({
      notes: ["", Validators.maxLength(500)],
    })
  }

  private createRejectionForm(): FormGroup {
    return this.formBuilder.group({
      notes: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    })
  }

  private createAssignSupervisorForm(): FormGroup {
    return this.formBuilder.group({
      supervisorId: [null, Validators.required],
    })
  }

  private loadCurrentUser(): void {
    const user = this.currentUserService.value ?? this.restoreUserFromStorage()
    this.currentUserId = user?.id ? Number(user.id) : null
    this.isSupervisor = hasAnyRole(user?.roles, SUPERVISOR_ROLE_NAMES)
  }

  private loadQuotes(): void {
    this.isLoadingQuotes = true
    const params: Record<string, string | number | boolean | undefined> = {
      page: 1,
      limit: 100,
      assignedToMe: true,
    }
    this.quoteService
      .findAll(params)
      .pipe(finalize(() => (this.isLoadingQuotes = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar las cotizaciones."),
      })
  }

  private hydrateLists(quotes: Quote[]): void {
    this.allQuotes = [...quotes]

    this.pendingQuotes = quotes.filter((q) => q.status === QuoteStatus.PENDING_SUPERVISOR_APPROVAL)

    this.approvedQuotes = quotes.filter(
      (q) =>
        q.status === QuoteStatus.SUPERVISOR_APPROVED ||
        q.status === QuoteStatus.SENT_TO_CLIENT ||
        q.status === QuoteStatus.AWAITING_CLIENT_RESPONSE ||
        q.status === QuoteStatus.CLIENT_APPROVED,
    )

    this.rejectedQuotes = quotes.filter(
      (q) => q.status === QuoteStatus.SUPERVISOR_REJECTED || q.status === QuoteStatus.CLIENT_REJECTED,
    )

    if (this.selectedQuote) {
      const updated = quotes.find((q) => q.id === this.selectedQuote?.id)
      this.selectedQuote = updated ?? null
      if (this.selectedQuote) {
        this.loadTicketItemDetail(this.selectedQuote.ticketItemId)
      }
    }
  }

  private loadCatalogData(): void {
    this.productsService.list().subscribe({
      next: (items) => (this.products = items ?? []),
      error: () => this.showMessage("warning", "fas fa-warehouse", "No pudimos cargar los productos."),
    })

    this.serviceService.findAll({ page: 1, limit: 100 }).subscribe({
      next: ({ data }) => (this.services = data ?? []),
      error: () => this.showMessage("warning", "fas fa-concierge-bell", "No pudimos cargar los servicios."),
    })
  }

  private loadSupervisors(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => {
        const userList = users ?? []
        this.supervisors = userList.filter((user: UserApi) => hasAnyRole(user.roles, SUPERVISOR_ROLE_NAMES))
      },
      error: () => {
        this.supervisors = []
        this.showMessage("warning", "fas fa-users", "No pudimos cargar la lista de supervisores.")
      },
    })
  }

  selectQuote(quote: Quote): void {
    this.selectedQuote = quote
    this.loadTicketItemDetail(quote.ticketItemId)
  }

  clearSelectedQuote(): void {
    this.selectedQuote = null
    this.selectedTicketItem = null
  }

  private loadTicketItemDetail(ticketItemId: number): void {
    this.ticketItemService.findOne(ticketItemId).subscribe({
      next: (item) => (this.selectedTicketItem = item),
      error: () => {
        this.selectedTicketItem = null
        this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el detalle del item.")
      },
    })
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

  openApprovalModal(): void {
    if (!this.selectedQuote || !this.currentUserId) return
    this.showApprovalModal = true
    this.approvalForm.reset()
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false
    this.approvalForm.reset()
  }

  submitApproval(): void {
    if (!this.selectedQuote || !this.currentUserId) return

    const notes = this.approvalForm.get("notes")?.value || undefined

    this.isProcessingAction = true
    this.quoteService
      .approveBySupervisor(this.selectedQuote.id, this.currentUserId, notes)
      .pipe(finalize(() => (this.isProcessingAction = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización aprobada correctamente.")
          this.closeApprovalModal()
          this.loadQuotes()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos aprobar la cotización."),
      })
  }

  openRejectionModal(): void {
    if (!this.selectedQuote || !this.currentUserId) return
    this.showRejectionModal = true
    this.rejectionForm.reset()
  }

  closeRejectionModal(): void {
    this.showRejectionModal = false
    this.rejectionForm.reset()
  }

  submitRejection(): void {
    if (this.rejectionForm.invalid || !this.selectedQuote || !this.currentUserId) {
      this.markFormGroupAsTouched(this.rejectionForm)
      return
    }

    const notes = this.rejectionForm.get("notes")?.value

    this.isProcessingAction = true
    this.quoteService
      .rejectBySupervisor(this.selectedQuote.id, this.currentUserId, notes)
      .pipe(finalize(() => (this.isProcessingAction = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Cotización rechazada. El recepcionista podrá reenviarla.")
          this.closeRejectionModal()
          this.loadQuotes()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos rechazar la cotización."),
      })
  }

  openAssignSupervisorModal(): void {
    if (!this.selectedTicketItem) return
    this.showAssignSupervisorModal = true
    this.assignSupervisorForm.patchValue({
      supervisorId: this.selectedTicketItem.assignedToSupervisorId || null,
    })
  }

  closeAssignSupervisorModal(): void {
    this.showAssignSupervisorModal = false
    this.assignSupervisorForm.reset()
  }

  submitAssignSupervisor(): void {
    if (this.assignSupervisorForm.invalid || !this.selectedTicketItem) {
      this.markFormGroupAsTouched(this.assignSupervisorForm)
      return
    }

    const supervisorId = Number(this.assignSupervisorForm.get("supervisorId")?.value)

    this.isProcessingAction = true
    this.ticketItemService
      .assignSupervisor(Number(this.selectedTicketItem.id), supervisorId)
      .pipe(finalize(() => (this.isProcessingAction = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Supervisor asignado correctamente.")
          this.closeAssignSupervisorModal()
          if (this.selectedQuote) {
            this.loadTicketItemDetail(this.selectedQuote.ticketItemId)
          }
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos asignar el supervisor."),
      })
  }

  getProductLabel(productId: number | null): string {
    if (!productId) return "Producto sin referencia"
    const product = this.products.find((p) => Number(p.id) === Number(productId))
    return product ? `${product.sku} · ${product.name}` : `Producto #${productId}`
  }

  getServiceLabel(serviceId: number | null): string {
    if (!serviceId) return "Servicio sin referencia"
    const service = this.services.find((s) => Number(s.id) === Number(serviceId))
    return service ? `${service.code} · ${service.name}` : `Servicio #${serviceId}`
  }

  getQuoteStatusLabel(status: QuoteStatus): string {
    const statusMap: Record<QuoteStatus, string> = {
      [QuoteStatus.PENDING_SUPERVISOR_APPROVAL]: "Pendiente aprobación",
      [QuoteStatus.SUPERVISOR_APPROVED]: "Aprobada por supervisor",
      [QuoteStatus.SUPERVISOR_REJECTED]: "Rechazada por supervisor",
      [QuoteStatus.SENT_TO_CLIENT]: "Enviada al cliente",
      [QuoteStatus.AWAITING_CLIENT_RESPONSE]: "Esperando respuesta del cliente",
      [QuoteStatus.CLIENT_APPROVED]: "Aprobada por cliente",
      [QuoteStatus.CLIENT_REJECTED]: "Rechazada por cliente",
      [QuoteStatus.CURRENT]: "Vigente",
      [QuoteStatus.ARCHIVED]: "Archivada",
    }
    return statusMap[status] || status
  }

  getQuoteStatusClass(status: QuoteStatus): string {
    const statusClassMap: Record<QuoteStatus, string> = {
      [QuoteStatus.PENDING_SUPERVISOR_APPROVAL]: "status-pending-supervisor",
      [QuoteStatus.SUPERVISOR_APPROVED]: "status-supervisor-approved",
      [QuoteStatus.SUPERVISOR_REJECTED]: "status-supervisor-rejected",
      [QuoteStatus.SENT_TO_CLIENT]: "status-sent-client",
      [QuoteStatus.AWAITING_CLIENT_RESPONSE]: "status-awaiting-client",
      [QuoteStatus.CLIENT_APPROVED]: "status-client-approved",
      [QuoteStatus.CLIENT_REJECTED]: "status-client-rejected",
      [QuoteStatus.CURRENT]: "status-current",
      [QuoteStatus.ARCHIVED]: "status-archived",
    }
    return statusClassMap[status] || "status-default"
  }

  canApprove(quote: Quote): boolean {
    return quote.status === QuoteStatus.PENDING_SUPERVISOR_APPROVAL
  }

  canReject(quote: Quote): boolean {
    return quote.status === QuoteStatus.PENDING_SUPERVISOR_APPROVAL
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
}
