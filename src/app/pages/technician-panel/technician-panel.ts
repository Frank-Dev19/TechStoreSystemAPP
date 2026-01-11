import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { finalize } from "rxjs/operators"
import { EquipmentType, ServiceType, TicketItem, TicketItemStatus } from "../../models/tickets/ticket-item"
import { TicketItemService } from "../../services/tickets/ticket-item.service"
import { DiagnosticService } from "../../services/tickets/diagnostic.service"
import { Diagnostic } from "../../models/tickets/diagnostic"
import { DiagnosticSaveRequest } from "../../models/tickets/diagnostic-request"
import { Quote, QuoteProduct, QuoteService as QuoteServiceItem, QuoteStatus } from "../../models/tickets/quote"
import { QuoteService } from "../../services/tickets/quote.service"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { CurrentUserService } from "../../services/current-user.service"
import { User } from "../../models/user/user"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"

@Component({
  selector: "app-technician-panel",
  standalone: false,
  templateUrl: "./technician-panel.html",
  styleUrls: ["./technician-panel.scss"],
})
export class TechnicianPanel implements OnInit {
  activeTab: "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all" = "todo"

  todoItems: TicketItem[] = []           // Asignados y listos para reparar
  diagnosisItems: TicketItem[] = []      // En diagnóstico activo
  pendingApprovalItems: TicketItem[] = [] // Diagnosticados/cotizados esperando aprobación
  repairItems: TicketItem[] = []         // En reparación
  repairedItems: TicketItem[] = []       // Reparados pendientes de alistar
  allItems: TicketItem[] = []
  selectedItem: TicketItem | null = null

  showDiagnosisModal = false
  diagnosisForm: FormGroup
  showRediagnosisModal = false
  rediagnosisForm: FormGroup
  diagnosticHistory: Diagnostic[] = []
  quoteSummary: Quote | null = null
  isLoadingQuote = false

  itemInDiagnosis = false
  currentItemInDiagnosisId: number | null = null

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingItems = false
  isSavingDiagnosis = false
  isSubmittingRediagnosis = false

  private currentUser: User | null = null
  private isTechnician = false

  private techniciansMap = new Map<number, string>()

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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly ticketItemService: TicketItemService,
    private readonly diagnosticService: DiagnosticService,
    private readonly quoteService: QuoteService,
    private readonly usersApi: UsersApiService,
    private readonly currentUserService: CurrentUserService,
  ) {
    this.diagnosisForm = this.createDiagnosisForm()
    this.rediagnosisForm = this.createRediagnosisForm()
  }

  ngOnInit(): void {
    this.syncCurrentUserContext()
    this.loadTechnicianItems()
    this.loadTechnicians()
  }

  private createDiagnosisForm(): FormGroup {
    return this.formBuilder.group({
      summary: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      details: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    })
  }

  private createRediagnosisForm(): FormGroup {
    return this.formBuilder.group({
      reason: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
    })
  }

  private loadTechnicianItems(): void {
    this.isLoadingItems = true
    const params: Record<string, string | number | boolean | undefined> = {
      page: 1,
      limit: 50,
      assignedToMe: true,
    }
    this.ticketItemService
      .findAll(params)
      .pipe(finalize(() => (this.isLoadingItems = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar tus tickets."),
      })
  }

  private hydrateLists(items: TicketItem[]): void {
    this.allItems = [...items]

    // Por hacer: Asignados + Aprobados por cliente (listos para reparar)
    this.todoItems = items.filter((item) =>
      [
        TicketItemStatus.ASSIGNED,
        TicketItemStatus.READY_FOR_REPAIR,
        TicketItemStatus.CLIENT_APPROVED,
      ].includes(item.status),
    )

    // En diagnóstico: Solo items activamente en diagnóstico
    this.diagnosisItems = items.filter((item) =>
      item.status === TicketItemStatus.IN_DIAGNOSIS
    )

    // Esperando aprobación: Diagnosticados o cotizados esperando aprobación
    this.pendingApprovalItems = items.filter((item) =>
      [
        TicketItemStatus.DIAGNOSED,
        TicketItemStatus.QUOTED,
        TicketItemStatus.SUPERVISOR_APPROVED,
        TicketItemStatus.SENT_TO_CLIENT,
        TicketItemStatus.AWAITING_CLIENT_RESPONSE,
      ].includes(item.status),
    )

    this.repairItems = items.filter((item) => item.status === TicketItemStatus.IN_REPAIR)
    this.repairedItems = items.filter((item) => item.status === TicketItemStatus.REPAIRED)
    const activeDiagnosis = this.diagnosisItems.find((item) => item.status === TicketItemStatus.IN_DIAGNOSIS)
    this.itemInDiagnosis = !!activeDiagnosis
    this.currentItemInDiagnosisId = activeDiagnosis?.id ? Number(activeDiagnosis.id) : null

    if (this.selectedItem) {
      const updated = items.find((entry) => Number(entry.id) === Number(this.selectedItem?.id))
      this.selectedItem = updated ?? null
      if (this.selectedItem) {
        this.loadDiagnosticHistory(Number(this.selectedItem.id))
        this.loadQuoteSummary(this.selectedItem)
      } else {
        this.diagnosticHistory = []
        this.quoteSummary = null
      }
    }
  }

  selectItem(item: TicketItem): void {
    this.selectedItem = item
    const itemId = Number(item.id)
    if (itemId) {
      this.loadDiagnosticHistory(itemId)
      this.loadQuoteSummary(item)
    }
  }

  clearSelectedItem(): void {
    this.selectedItem = null
    this.diagnosticHistory = []
    this.quoteSummary = null
  }

  startDiagnosis(item: TicketItem): void {
    if (this.itemInDiagnosis && this.currentItemInDiagnosisId !== Number(item.id)) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa el diagnóstico activo antes de iniciar otro.")
      return
    }
    this.transitionItemStatus(item, TicketItemStatus.IN_DIAGNOSIS, "Diagnóstico iniciado correctamente.")
  }

  startStandardService(item: TicketItem): void {
    if (!this.isStandardService(item)) return
    this.startRepair(item)
  }

  openDiagnosisModal(): void {
    if (!this.selectedItem) return
    if (!this.isDiagnosisService(this.selectedItem)) return
    this.showDiagnosisModal = true
    this.diagnosisForm.reset()
  }

  closeDiagnosisModal(): void {
    this.showDiagnosisModal = false
    this.diagnosisForm.reset()
  }

  openRediagnosisModal(item: TicketItem): void {
    this.selectItem(item)
    this.showRediagnosisModal = true
    this.rediagnosisForm.reset()
  }

  closeRediagnosisModal(): void {
    this.showRediagnosisModal = false
    this.rediagnosisForm.reset()
  }

  submitDiagnosis(): void {
    if (this.diagnosisForm.invalid || !this.selectedItem) {
      this.markFormGroupAsTouched(this.diagnosisForm)
      return
    }

    const payload: DiagnosticSaveRequest = {
      ticketItemId: Number(this.selectedItem.id),
      summary: this.diagnosisForm.get("summary")?.value,
      details: this.diagnosisForm.get("details")?.value,
    }

    this.isSavingDiagnosis = true
    this.diagnosticService
      .create(payload)
      .pipe(finalize(() => (this.isSavingDiagnosis = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Diagnóstico registrado correctamente.")
          this.closeDiagnosisModal()
          this.loadTechnicianItems()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar el diagnóstico."),
      })
  }

  submitRediagnosis(): void {
    if (this.rediagnosisForm.invalid || !this.selectedItem) {
      this.markFormGroupAsTouched(this.rediagnosisForm)
      return
    }

    const reason = this.rediagnosisForm.get("reason")?.value
    this.isSubmittingRediagnosis = true
    this.ticketItemService
      .requestRediagnosis(Number(this.selectedItem.id), reason)
      .pipe(finalize(() => (this.isSubmittingRediagnosis = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Se solicitó un nuevo diagnóstico.")
          this.closeRediagnosisModal()
          this.loadTechnicianItems()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos solicitar el nuevo diagnóstico.")
        },
      })
  }

  startRepair(item: TicketItem): void {
    if (this.isStandardService(item) && [TicketItemStatus.ASSIGNED, TicketItemStatus.READY_FOR_REPAIR].includes(item.status)) {
      this.transitionItemStatus(item, TicketItemStatus.IN_REPAIR, "Servicio iniciado.")
      return
    }

    if (item.status !== TicketItemStatus.CLIENT_APPROVED) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "Finaliza el diagnóstico y aprueba la cotización antes de iniciar la reparación.",
      )
      return
    }
    this.transitionItemStatus(item, TicketItemStatus.IN_REPAIR, "Reparación iniciada.")
  }

  markRepaired(item: TicketItem): void {
    if (item.status === TicketItemStatus.IN_REPAIR) {
      const itemId = Number(item.id)
      if (!itemId) {
        this.showMessage("danger", "fas fa-times-circle", "ID de item inválido.")
        return
      }
      this.ticketItemService.changeStatus(itemId, TicketItemStatus.REPAIRED).subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Equipo marcado como reparado.")
          this.loadTechnicianItems()
        },
        error: () =>
          this.showMessage("danger", "fas fa-times-circle", "No pudimos marcar el equipo como reparado."),
      })
      return
    }
  }

  canFinishRepair(item?: TicketItem | null): boolean {
    if (!item) return false
    return item.status === TicketItemStatus.IN_REPAIR
  }

  completeDiagnosis(): void {
    if (!this.selectedItem) return
    this.transitionItemStatus(this.selectedItem, TicketItemStatus.DIAGNOSED, "Diagnóstico completado.")
  }

  private transitionItemStatus(item: TicketItem, status: TicketItemStatus, successMessage: string): void {
    const itemId = Number(item.id)
    if (!itemId) {
      this.showMessage("danger", "fas fa-times-circle", "ID de item inválido.")
      return
    }
    this.ticketItemService.changeStatus(itemId, status).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", successMessage)
        this.loadTechnicianItems()
      },
      error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el estado del item."),
    })
  }

  getTechnicianName(item: TicketItem): string {
    if (item.assignedToTechnicianName) {
      return item.assignedToTechnicianName
    }
    if (item.assignedToTechnicianId) {
      return this.techniciansMap.get(item.assignedToTechnicianId) ?? `Técnico #${item.assignedToTechnicianId}`
    }
    return "Sin asignar"
  }

  private loadDiagnosticHistory(itemId: number): void {
    const normalizedId = Number(itemId)
    if (!normalizedId) {
      this.diagnosticHistory = []
      return
    }
    this.diagnosticService.findAll({ ticketItemId: normalizedId, limit: 20 }).subscribe({
      next: ({ data }) => (this.diagnosticHistory = data ?? []),
      error: () => this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el historial de diagnósticos."),
    })
  }

  canStartDiagnosis(item: TicketItem): boolean {
    return item.status === TicketItemStatus.ASSIGNED && item.serviceType === ServiceType.DIAGNOSIS
  }

  canRequestRediagnosis(item: TicketItem | null): boolean {
    if (!item) return false
    return item.status === TicketItemStatus.IN_REPAIR && item.serviceType === ServiceType.DIAGNOSIS
  }

  canStartRepairDirectly(item: TicketItem): boolean {
    return item.status === TicketItemStatus.CLIENT_APPROVED
  }

  canStartStandardService(item: TicketItem): boolean {
    return this.isStandardService(item) && item.status === TicketItemStatus.READY_FOR_REPAIR
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

  private loadTechnicians(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.techniciansMap.clear()
        const list = users ?? []
        list.forEach((user: UserApi) => {
          const hasTechRole = hasAnyRole(user.roles, TECHNICIAN_ROLE_NAMES)
          if (hasTechRole) {
            this.techniciansMap.set(Number(user.id), user.name)
          }
        })
      },
      error: () => {
        this.techniciansMap.clear()
      },
    })
  }

  isDiagnosisService(item: TicketItem | null): boolean {
    return !!item && item.serviceType === ServiceType.DIAGNOSIS
  }

  isStandardService(item: TicketItem | null): boolean {
    return !!item && item.serviceType === ServiceType.STANDARD_SERVICE
  }

  private syncCurrentUserContext(): void {
    const current = this.currentUserService.value ?? this.restoreUserFromStorage()
    this.currentUser = current
    this.isTechnician = hasAnyRole(current?.roles, TECHNICIAN_ROLE_NAMES)
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

  getEquipmentTypeLabel(type?: EquipmentType | null): string {
    if (!type) {
      return "Sin tipo"
    }
    return this.equipmentTypeLabels[type] ?? String(type)
  }

  getDiagnosisStatusLabel(status?: string | null): string {
    if (!status) return "Sin estado"
    switch (status) {
      case "CURRENT":
        return "Actual"
      case "ARCHIVED":
        return "Archivado"
      default:
        return status
    }
  }

  getProductName(product: QuoteProduct): string {
    if (product?.product?.name) {
      const sku = product.product.sku ? `${product.product.sku} | ` : ""
      return `${sku}${product.product.name}`
    }
    if (product?.productId) return `Producto #${product.productId}`
    return "Producto sin referencia"
  }

  getServiceName(service: QuoteServiceItem): string {
    if (service?.service?.name) {
      const code = service.service.code ? `${service.service.code} | ` : ""
      return `${code}${service.service.name}`
    }
    if (service?.serviceId) return `Servicio #${service.serviceId}`
    return "Servicio sin referencia"
  }

  private shouldLoadQuote(item: TicketItem | null): boolean {
    if (!item) return false
    return [
      TicketItemStatus.SUPERVISOR_APPROVED,
      TicketItemStatus.SENT_TO_CLIENT,
      TicketItemStatus.AWAITING_CLIENT_RESPONSE,
      TicketItemStatus.CLIENT_APPROVED,
      TicketItemStatus.READY_FOR_REPAIR,
      TicketItemStatus.IN_REPAIR,
      TicketItemStatus.REPAIRED,
      TicketItemStatus.DELIVERED,
    ].includes(item.status)
  }

  canShowQuoteSection(item: TicketItem | null): boolean {
    return this.shouldLoadQuote(item)
  }

  private loadQuoteSummary(item: TicketItem | null): void {
    if (!item?.id || !this.shouldLoadQuote(item)) {
      this.quoteSummary = null
      return
    }
    this.isLoadingQuote = true
    this.quoteSummary = null
    this.quoteService
      .findAll({ page: 1, limit: 5, ticketItemId: Number(item.id) })
      .pipe(finalize(() => (this.isLoadingQuote = false)))
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          const preferredOrder = [
            QuoteStatus.CLIENT_APPROVED,
            QuoteStatus.CURRENT,
            QuoteStatus.SENT_TO_CLIENT,
            QuoteStatus.AWAITING_CLIENT_RESPONSE,
            QuoteStatus.SUPERVISOR_APPROVED,
          ]
          const match = preferredOrder
            .map((status) => list.find((q) => q.status === status))
            .find((q) => !!q)
          this.quoteSummary = match ?? list[0] ?? null
        },
        error: () => {
          this.quoteSummary = null
        },
      })
  }

  getItemStatusLabel(status: TicketItemStatus): string {
    switch (status) {
      case TicketItemStatus.ASSIGNED:
        return "Asignado"
      case TicketItemStatus.IN_DIAGNOSIS:
        return "En diagnóstico"
      case TicketItemStatus.DIAGNOSED:
        return "Diagnosticado"
      case TicketItemStatus.QUOTED:
        return "Cotizado"
      case TicketItemStatus.SUPERVISOR_APPROVED:
        return "Aprobado por supervisor"
      case TicketItemStatus.SUPERVISOR_REJECTED:
        return "Rechazado por supervisor"
      case TicketItemStatus.SENT_TO_CLIENT:
        return "Enviado al cliente"
      case TicketItemStatus.AWAITING_CLIENT_RESPONSE:
        return "Esperando respuesta del cliente"
      case TicketItemStatus.CLIENT_APPROVED:
        return "Aprobado por cliente"
      case TicketItemStatus.QUOTE_EXPIRED:
        return "Cotización expirada"
      case TicketItemStatus.READY_FOR_REPAIR:
        return "Listo para reparación"
      case TicketItemStatus.CLIENT_REJECTED:
        return "Rechazado por cliente"
      case TicketItemStatus.AWAITING_PARTS:
        return "Esperando repuestos"
      case TicketItemStatus.IN_REPAIR:
        return "En reparación"
      case TicketItemStatus.REPAIRED:
        return "Reparado"
      case TicketItemStatus.DELIVERED:
        return "Entregado"
      case TicketItemStatus.CANCELLED:
        return "Cancelado"
      default:
        return status
    }
  }
}
