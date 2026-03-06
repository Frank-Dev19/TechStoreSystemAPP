import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { finalize } from "rxjs/operators"
import { EquipmentType, ServiceType, ServiceOrderItem, ServiceOrderItemStatus } from "../../models/service-orders/service-order-item"
import { ServiceOrderItemService } from "../../services/service-orders/service-order-item.service"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import { ServiceOrderDiagnosis } from "../../models/service-orders/service-order-diagnosis"
import { ServiceOrderDiagnosisSaveRequest } from "../../models/service-orders/service-order-diagnosis-request"
import { ServiceOrderQuote, ServiceOrderQuoteProduct, ServiceOrderQuoteService as ServiceOrderQuoteServiceItem, ServiceOrderQuoteStatus } from "../../models/service-orders/service-quote"
import { ServiceOrderQuoteService } from "../../services/service-orders/service-quote.service"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { CurrentUserService } from "../../services/current-user.service"
import { User } from "../../models/user/user"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"

type InboxAuthor = "TECHNICIAN" | "CLIENT" | "SYSTEM"

interface ServiceOrderItemInboxMessage {
  id: number
  author: InboxAuthor
  text: string
  createdAt: Date
}

interface ServiceOrderItemInboxThread {
  serviceOrderItemId: number
  serviceOrderCode: string
  itemLabel: string
  clientAlias: string
  assignedTechnicianAlias: string
  unreadForSupervisor: number
  messages: ServiceOrderItemInboxMessage[]
}

@Component({
  selector: "app-technician-panel",
  standalone: false,
  templateUrl: "./technician-panel.html",
  styleUrls: ["./technician-panel.scss"],
})
export class TechnicianPanel implements OnInit {
  activeTab: "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all" = "todo"

  todoItems: ServiceOrderItem[] = []           // Asignados y listos para reparar
  diagnosisItems: ServiceOrderItem[] = []      // En diagnóstico activo
  pendingApprovalItems: ServiceOrderItem[] = [] // Diagnosticados/cotizados esperando respuesta
  repairItems: ServiceOrderItem[] = []         // En reparación
  repairedItems: ServiceOrderItem[] = []       // Reparados pendientes de alistar
  allItems: ServiceOrderItem[] = []
  selectedItem: ServiceOrderItem | null = null

  showDiagnosisModal = false
  diagnosisForm: FormGroup
  showRediagnosisModal = false
  rediagnosisForm: FormGroup
  diagnosticHistory: ServiceOrderDiagnosis[] = []
  quoteSummary: ServiceOrderQuote | null = null
  isLoadingServiceOrderQuote = false

  itemInDiagnosis = false
  currentItemInDiagnosisId: number | null = null

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingItems = false
  isSavingDiagnosis = false
  isSubmittingRediagnosis = false
  showInboxModal = false
  inboxDraftMessage = ""
  inboxActiveThread: ServiceOrderItemInboxThread | null = null
  inboxThreads: ServiceOrderItemInboxThread[] = []

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
    private readonly serviceOrderItemService: ServiceOrderItemService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly quoteService: ServiceOrderQuoteService,
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
    this.serviceOrderItemService
      .findAll(params)
      .pipe(finalize(() => (this.isLoadingItems = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar tus órdenes asignadas."),
      })
  }

  private hydrateLists(items: ServiceOrderItem[]): void {
    this.allItems = [...items]

    // Por hacer: Asignados + Aprobados por cliente (listos para reparar)
    this.todoItems = items.filter((item) =>
      [
        ServiceOrderItemStatus.ASSIGNED,
        ServiceOrderItemStatus.READY_FOR_REPAIR,
        ServiceOrderItemStatus.CLIENT_APPROVED,
      ].includes(item.status),
    )

    // En diagnóstico: Solo items activamente en diagnóstico
    this.diagnosisItems = items.filter((item) =>
      item.status === ServiceOrderItemStatus.IN_DIAGNOSIS
    )

    // Pendientes: diagnosticados o cotizados esperando respuesta
    this.pendingApprovalItems = items.filter((item) =>
      [
        ServiceOrderItemStatus.DIAGNOSED,
        ServiceOrderItemStatus.QUOTED,
        ServiceOrderItemStatus.SENT_TO_CLIENT,
        ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE,
      ].includes(item.status),
    )

    this.repairItems = items.filter((item) => item.status === ServiceOrderItemStatus.IN_REPAIR)
    this.repairedItems = items.filter((item) => item.status === ServiceOrderItemStatus.REPAIRED)
    const activeDiagnosis = this.diagnosisItems.find((item) => item.status === ServiceOrderItemStatus.IN_DIAGNOSIS)
    this.itemInDiagnosis = !!activeDiagnosis
    this.currentItemInDiagnosisId = activeDiagnosis?.id ? Number(activeDiagnosis.id) : null

    if (this.selectedItem) {
      const updated = items.find((entry) => Number(entry.id) === Number(this.selectedItem?.id))
      this.selectedItem = updated ?? null
      if (this.selectedItem) {
        this.loadServiceOrderDiagnosisHistory(Number(this.selectedItem.id))
        this.loadServiceOrderQuoteSummary(this.selectedItem)
      } else {
        this.diagnosticHistory = []
        this.quoteSummary = null
      }
    }
  }

  selectItem(item: ServiceOrderItem): void {
    this.selectedItem = item
    const itemId = Number(item.id)
    if (itemId) {
      this.loadServiceOrderDiagnosisHistory(itemId)
      this.loadServiceOrderQuoteSummary(item)
    }
  }

  clearSelectedItem(): void {
    this.selectedItem = null
    this.diagnosticHistory = []
    this.quoteSummary = null
  }

  canOpenClientInbox(item: ServiceOrderItem | null): boolean {
    if (!item) return false
    return ![
      ServiceOrderItemStatus.DELIVERED,
      ServiceOrderItemStatus.CANCELLED,
      ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT,
    ].includes(item.status)
  }

  openWhatsAppInbox(item: ServiceOrderItem, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenClientInbox(item)) return

    const existing = this.inboxThreads.find((thread) => thread.serviceOrderItemId === Number(item.id))
    if (existing) {
      existing.unreadForSupervisor = 0
      this.inboxActiveThread = existing
      this.showInboxModal = true
      return
    }

    const thread = this.buildInboxThread(item)
    this.inboxThreads = [thread, ...this.inboxThreads]
    this.inboxActiveThread = thread
    this.showInboxModal = true
  }

  closeInboxModal(): void {
    this.showInboxModal = false
    this.inboxDraftMessage = ""
    this.inboxActiveThread = null
  }

  sendInboxMessage(): void {
    if (!this.inboxActiveThread) return
    const text = this.inboxDraftMessage.trim()
    if (!text) return

    this.inboxActiveThread.messages.push({
      id: Date.now(),
      author: "TECHNICIAN",
      text,
      createdAt: new Date(),
    })
    this.inboxDraftMessage = ""

    // Mock response to visualize monitored two-way flow.
    this.inboxActiveThread.messages.push({
      id: Date.now() + 1,
      author: "CLIENT",
      text: "Recibido. Gracias por la actualización técnica.",
      createdAt: new Date(),
    })
    this.inboxActiveThread.unreadForSupervisor += 1
  }

  getInboxAuthorLabel(author: InboxAuthor): string {
    switch (author) {
      case "TECHNICIAN":
        return "Técnico"
      case "CLIENT":
        return this.inboxActiveThread?.clientAlias ?? "Cliente anónimo"
      default:
        return "Sistema"
    }
  }

  startDiagnosis(item: ServiceOrderItem): void {
    if (this.itemInDiagnosis && this.currentItemInDiagnosisId !== Number(item.id)) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa el diagnóstico activo antes de iniciar otro.")
      return
    }
    this.transitionItemStatus(item, ServiceOrderItemStatus.IN_DIAGNOSIS, "Diagnóstico iniciado correctamente.")
  }

  startStandardService(item: ServiceOrderItem): void {
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

  openRediagnosisModal(item: ServiceOrderItem): void {
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

    const payload: ServiceOrderDiagnosisSaveRequest = {
      serviceOrderItemId: Number(this.selectedItem.id),
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
    this.serviceOrderItemService
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

  startRepair(item: ServiceOrderItem): void {
    if (this.isStandardService(item) && [ServiceOrderItemStatus.ASSIGNED, ServiceOrderItemStatus.READY_FOR_REPAIR].includes(item.status)) {
      this.transitionItemStatus(item, ServiceOrderItemStatus.IN_REPAIR, "Servicio iniciado.")
      return
    }

    if (item.status !== ServiceOrderItemStatus.CLIENT_APPROVED) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "Finaliza el diagnóstico y aprueba la cotización antes de iniciar la reparación.",
      )
      return
    }
    this.transitionItemStatus(item, ServiceOrderItemStatus.IN_REPAIR, "Reparación iniciada.")
  }

  markRepaired(item: ServiceOrderItem): void {
    if (item.status === ServiceOrderItemStatus.IN_REPAIR) {
      const itemId = Number(item.id)
      if (!itemId) {
        this.showMessage("danger", "fas fa-times-circle", "ID de item inválido.")
        return
      }
      this.serviceOrderItemService.changeStatus(itemId, ServiceOrderItemStatus.REPAIRED).subscribe({
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

  canFinishRepair(item?: ServiceOrderItem | null): boolean {
    if (!item) return false
    return item.status === ServiceOrderItemStatus.IN_REPAIR
  }

  completeDiagnosis(): void {
    if (!this.selectedItem) return
    this.transitionItemStatus(this.selectedItem, ServiceOrderItemStatus.DIAGNOSED, "Diagnóstico completado.")
  }

  private transitionItemStatus(item: ServiceOrderItem, status: ServiceOrderItemStatus, successMessage: string): void {
    const itemId = Number(item.id)
    if (!itemId) {
      this.showMessage("danger", "fas fa-times-circle", "ID de item inválido.")
      return
    }
    this.serviceOrderItemService.changeStatus(itemId, status).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", successMessage)
        this.loadTechnicianItems()
      },
      error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el estado del item."),
    })
  }

  getTechnicianName(item: ServiceOrderItem): string {
    if (item.assignedToTechnicianName) {
      return item.assignedToTechnicianName
    }
    if (item.assignedToTechnicianId) {
      return this.techniciansMap.get(item.assignedToTechnicianId) ?? `Técnico #${item.assignedToTechnicianId}`
    }
    return "Sin asignar"
  }

  private loadServiceOrderDiagnosisHistory(itemId: number): void {
    const normalizedId = Number(itemId)
    if (!normalizedId) {
      this.diagnosticHistory = []
      return
    }
    this.diagnosticService.findAll({ serviceOrderItemId: normalizedId, limit: 20 }).subscribe({
      next: ({ data }) => (this.diagnosticHistory = data ?? []),
      error: () => this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el historial de diagnósticos."),
    })
  }

  canStartDiagnosis(item: ServiceOrderItem): boolean {
    return item.status === ServiceOrderItemStatus.ASSIGNED && item.serviceType === ServiceType.DIAGNOSIS
  }

  canRequestRediagnosis(item: ServiceOrderItem | null): boolean {
    if (!item) return false
    return item.status === ServiceOrderItemStatus.IN_REPAIR && item.serviceType === ServiceType.DIAGNOSIS
  }

  canStartRepairDirectly(item: ServiceOrderItem): boolean {
    return item.status === ServiceOrderItemStatus.CLIENT_APPROVED
  }

  canStartStandardService(item: ServiceOrderItem): boolean {
    return this.isStandardService(item) && item.status === ServiceOrderItemStatus.READY_FOR_REPAIR
  }

  private buildInboxThread(item: ServiceOrderItem): ServiceOrderItemInboxThread {
    const serviceOrderCode = item.serviceOrder?.code ?? `SO-${item.serviceOrderId}`
    const itemLabel = `Equipo #${item.itemNumber || item.id}`
    const shortRef = String(serviceOrderCode).slice(-4)
    const clientAlias = `Cliente-${shortRef || "XXXX"}`
    const techRef = item.assignedToTechnicianId ? String(item.assignedToTechnicianId).padStart(2, "0") : "00"
    const assignedTechnicianAlias = `Tecnico-${techRef}`

    return {
      serviceOrderItemId: Number(item.id),
      serviceOrderCode,
      itemLabel,
      clientAlias,
      assignedTechnicianAlias,
      unreadForSupervisor: 0,
      messages: [
        {
          id: Date.now(),
          author: "SYSTEM",
          text: "Canal supervisado: no se muestran nombre ni datos de contacto del cliente.",
          createdAt: new Date(),
        },
        {
          id: Date.now() + 1,
          author: "CLIENT",
          text: "Buenos días, ¿podrían indicarme el avance del equipo?",
          createdAt: new Date(),
        },
      ],
    }
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

  isDiagnosisService(item: ServiceOrderItem | null): boolean {
    return !!item && item.serviceType === ServiceType.DIAGNOSIS
  }

  isStandardService(item: ServiceOrderItem | null): boolean {
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

  getProductName(product: ServiceOrderQuoteProduct): string {
    if (product?.product?.name) {
      const sku = product.product.sku ? `${product.product.sku} | ` : ""
      return `${sku}${product.product.name}`
    }
    if (product?.productId) return `Producto #${product.productId}`
    return "Producto sin referencia"
  }

  getServiceName(service: ServiceOrderQuoteServiceItem): string {
    if (service?.service?.name) {
      const code = service.service.code ? `${service.service.code} | ` : ""
      return `${code}${service.service.name}`
    }
    if (service?.serviceId) return `Servicio #${service.serviceId}`
    return "Servicio sin referencia"
  }

  private shouldLoadServiceOrderQuote(item: ServiceOrderItem | null): boolean {
    if (!item) return false
    return [
      ServiceOrderItemStatus.QUOTED,
      ServiceOrderItemStatus.SENT_TO_CLIENT,
      ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE,
      ServiceOrderItemStatus.CLIENT_APPROVED,
      ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT,
      ServiceOrderItemStatus.READY_FOR_REPAIR,
      ServiceOrderItemStatus.IN_REPAIR,
      ServiceOrderItemStatus.REPAIRED,
      ServiceOrderItemStatus.DELIVERED,
    ].includes(item.status)
  }

  canShowServiceOrderQuoteSection(item: ServiceOrderItem | null): boolean {
    return this.shouldLoadServiceOrderQuote(item)
  }

  private loadServiceOrderQuoteSummary(item: ServiceOrderItem | null): void {
    if (!item?.id || !this.shouldLoadServiceOrderQuote(item)) {
      this.quoteSummary = null
      return
    }
    this.isLoadingServiceOrderQuote = true
    this.quoteSummary = null
    this.quoteService
      .findAll({ page: 1, limit: 5, serviceOrderItemId: Number(item.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderQuote = false)))
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          const preferredOrder = [
            ServiceOrderQuoteStatus.CLIENT_APPROVED,
            ServiceOrderQuoteStatus.CURRENT,
            ServiceOrderQuoteStatus.SENT_TO_CLIENT,
            ServiceOrderQuoteStatus.AWAITING_CLIENT_RESPONSE,
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

  getItemStatusLabel(status: ServiceOrderItemStatus): string {
    switch (status) {
      case ServiceOrderItemStatus.ASSIGNED:
        return "Asignado"
      case ServiceOrderItemStatus.IN_DIAGNOSIS:
        return "En diagnóstico"
      case ServiceOrderItemStatus.DIAGNOSED:
        return "Diagnosticado"
      case ServiceOrderItemStatus.QUOTED:
        return "Cotizado"
      case ServiceOrderItemStatus.SENT_TO_CLIENT:
        return "Enviado al cliente"
      case ServiceOrderItemStatus.AWAITING_CLIENT_RESPONSE:
        return "Esperando respuesta del cliente"
      case ServiceOrderItemStatus.CLIENT_APPROVED:
        return "Aprobado por cliente"
      case ServiceOrderItemStatus.QUOTE_EXPIRED:
        return "Cotización expirada"
      case ServiceOrderItemStatus.READY_FOR_REPAIR:
        return "Listo para reparación"
      case ServiceOrderItemStatus.CLIENT_REJECTED:
        return "Rechazado por cliente"
      case ServiceOrderItemStatus.CLOSED_REJECTED_CLIENT:
        return "Cerrado por rechazo del cliente"
      case ServiceOrderItemStatus.AWAITING_PARTS:
        return "Esperando repuestos"
      case ServiceOrderItemStatus.IN_REPAIR:
        return "En reparación"
      case ServiceOrderItemStatus.REPAIRED:
        return "Reparado"
      case ServiceOrderItemStatus.DELIVERED:
        return "Entregado"
      case ServiceOrderItemStatus.CANCELLED:
        return "Cancelado"
      default:
        return status
    }
  }
}
