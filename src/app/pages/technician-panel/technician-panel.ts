import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { finalize } from "rxjs/operators"
import { TicketItem, TicketItemStatus } from "../../models/tickets/ticket-item"
import { TicketItemService } from "../../services/tickets/ticket-item.service"
import { DiagnosticService } from "../../services/tickets/diagnostic.service"
import { Diagnostic } from "../../models/tickets/diagnostic"
import { DiagnosticSaveRequest } from "../../models/tickets/diagnostic-request"
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
  activeTab: "todo" | "diagnosis" | "pending_approval" | "repair" | "ready" | "all" = "todo"

  todoItems: TicketItem[] = []           // Asignados y listos para reparar
  diagnosisItems: TicketItem[] = []      // En diagnóstico activo
  pendingApprovalItems: TicketItem[] = [] // Diagnosticados/cotizados esperando aprobación
  repairItems: TicketItem[] = []         // En reparación
  readyItems: TicketItem[] = []          // Listos para entrega
  allItems: TicketItem[] = []
  selectedItem: TicketItem | null = null

  showDiagnosisModal = false
  diagnosisForm: FormGroup
  diagnosticHistory: Diagnostic[] = []

  itemInDiagnosis = false
  currentItemInDiagnosisId: number | null = null

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingItems = false
  isSavingDiagnosis = false

  private currentUser: User | null = null
  private isTechnician = false

  private techniciansMap = new Map<number, string>()

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly ticketItemService: TicketItemService,
    private readonly diagnosticService: DiagnosticService,
    private readonly usersApi: UsersApiService,
    private readonly currentUserService: CurrentUserService,
  ) {
    this.diagnosisForm = this.createDiagnosisForm()
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
    this.readyItems = items.filter((item) => item.status === TicketItemStatus.READY_FOR_DELIVERY)

    const activeDiagnosis = this.diagnosisItems.find((item) => item.status === TicketItemStatus.IN_DIAGNOSIS)
    this.itemInDiagnosis = !!activeDiagnosis
    this.currentItemInDiagnosisId = activeDiagnosis?.id ? Number(activeDiagnosis.id) : null

    if (this.selectedItem) {
      const updated = items.find((entry) => Number(entry.id) === Number(this.selectedItem?.id))
      this.selectedItem = updated ?? null
      if (this.selectedItem) {
        this.loadDiagnosticHistory(Number(this.selectedItem.id))
      } else {
        this.diagnosticHistory = []
      }
    }
  }

  selectItem(item: TicketItem): void {
    this.selectedItem = item
    const itemId = Number(item.id)
    if (itemId) {
      this.loadDiagnosticHistory(itemId)
    }
  }

  clearSelectedItem(): void {
    this.selectedItem = null
    this.diagnosticHistory = []
  }

  startDiagnosis(item: TicketItem): void {
    if (this.itemInDiagnosis && this.currentItemInDiagnosisId !== Number(item.id)) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa el diagnóstico activo antes de iniciar otro.")
      return
    }
    this.transitionItemStatus(item, TicketItemStatus.IN_DIAGNOSIS, "Diagnóstico iniciado correctamente.")
  }

  openDiagnosisModal(): void {
    if (!this.selectedItem) return
    this.showDiagnosisModal = true
    this.diagnosisForm.reset()
  }

  closeDiagnosisModal(): void {
    this.showDiagnosisModal = false
    this.diagnosisForm.reset()
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

  startRepair(item: TicketItem): void {
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

  markReadyForDelivery(item: TicketItem): void {
    const finalizeReady = () => {
      this.transitionItemStatus(item, TicketItemStatus.READY_FOR_DELIVERY, "Item marcado como listo para entrega.")
    }

    if (item.status === TicketItemStatus.IN_REPAIR) {
      const itemId = Number(item.id)
      if (!itemId) {
        this.showMessage("danger", "fas fa-times-circle", "ID de item inválido.")
        return
      }
      this.ticketItemService.changeStatus(itemId, TicketItemStatus.REPAIRED).subscribe({
        next: () => finalizeReady(),
        error: () =>
          this.showMessage("danger", "fas fa-times-circle", "No pudimos marcar el equipo como reparado antes de la entrega."),
      })
      return
    }

    if (item.status === TicketItemStatus.REPAIRED) {
      finalizeReady()
      return
    }

    if (item.status === TicketItemStatus.READY_FOR_DELIVERY) {
      const itemId = Number(item.id)
      if (!itemId) {
        this.showMessage("danger", "fas fa-times-circle", "ID de item inválido.")
        return
      }
      this.ticketItemService.changeStatus(itemId, TicketItemStatus.DELIVERED).subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Equipo entregado al cliente.")
          this.loadTechnicianItems()
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar la entrega del equipo.")
        },
      })
      return
    }

    this.showMessage(
      "warning",
      "fas fa-exclamation-circle",
      "Debes finalizar la reparación antes de marcar el equipo como listo.",
    )
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
    return item.status === TicketItemStatus.ASSIGNED && item.serviceType === 'DIAGNOSIS'
  }

  canStartRepairDirectly(item: TicketItem): boolean {
    return item.status === TicketItemStatus.CLIENT_APPROVED
  }

  getSLABadgeClass(item: TicketItem): string {
    if (item.slaBreached) return "badge-danger"
    const daysLeft = this.getDaysUntilDeadline(item.slaDeadline)
    if (daysLeft <= 1) return "badge-warning"
    return "badge-success"
  }

  getDaysUntilDeadline(deadline: string | null): number {
    if (!deadline) return 0
    const deadlineDate = new Date(deadline)
    if (Number.isNaN(deadlineDate.getTime())) return 0
    const diffTime = deadlineDate.getTime() - Date.now()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  getSLAText(item: TicketItem): string {
    if (!item.slaDeadline) return "Sin SLA"
    if (item.slaBreached) return "SLA vencido"
    const days = this.getDaysUntilDeadline(item.slaDeadline)
    if (days <= 0) return "Hoy vence"
    if (days === 1) return "1 día"
    return `${days} días`
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
      case TicketItemStatus.CLIENT_REJECTED:
        return "Rechazado por cliente"
      case TicketItemStatus.AWAITING_PARTS:
        return "Esperando repuestos"
      case TicketItemStatus.IN_REPAIR:
        return "En reparación"
      case TicketItemStatus.REPAIRED:
        return "Reparado"
      case TicketItemStatus.READY_FOR_DELIVERY:
        return "Listo para entrega"
      case TicketItemStatus.DELIVERED:
        return "Entregado"
      case TicketItemStatus.CANCELLED:
        return "Cancelado"
      default:
        return status
    }
  }
}
