import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { forkJoin, of } from "rxjs"
import { catchError, finalize, map, switchMap } from "rxjs/operators"
import {
  EquipmentType,
  ServiceOrder,
  ServiceOrderOperativeStatus,
  ServiceOrderTechnicalStatus,
  ServiceType,
} from "../../models/service-orders/service-order"
import { ServiceOrderService } from "../../services/service-orders/service-order.service"
import { ServiceOrderDiagnosisService } from "../../services/service-orders/service-order-diagnosis.service"
import {
  ServiceOrderDiagnosis,
  ServiceOrderDiagnosisOutcome,
  ServiceOrderDiagnosisStatus,
} from "../../models/service-orders/service-order-diagnosis"
import { ServiceOrderDiagnosisSaveRequest } from "../../models/service-orders/service-order-diagnosis-request"
import {
  ServiceOrderAgreement,
  ServiceOrderAgreementProduct,
  ServiceOrderAgreementService as ServiceOrderAgreementServiceItem,
  ServiceOrderAgreementStatus,
} from "../../models/service-orders/service-agreement"
import { ServiceOrderAgreementService } from "../../services/service-orders/service-agreement.service"
import { ProductsService } from "../../services/inventory/products.service"
import { Product } from "../../models/catalog/product"
import { PricingQueryApiService } from "../../services/pricing/pricing-query-api.service"
import { UsersApiService } from "../../services/rbac/users-api.service"
import { UserApi } from "../../models/rbac/user.model"
import { CurrentUserService } from "../../services/current-user.service"
import { User } from "../../models/user/user"
import { hasAnyRole, TECHNICIAN_ROLE_NAMES } from "../../utils/role.utils"
import {
  ServiceOrderInboxAttachment,
  ServiceOrderInboxMessage,
  ServiceOrderInboxThreadSummary,
} from "../../models/service-orders/service-order-inbox"
import { ServiceOrderInboxService } from "../../services/service-orders/service-order-inbox.service"

interface InboxDraftAttachment {
  file: File
  previewUrl: string | null
}

interface AgreementProductComposer {
  id: number
  type: "product"
  productId: number | null
  quantity: number
  unitPrice: number
  requiresPurchase: boolean
  notes: string
}

interface AgreementServiceComposer {
  id: number
  type: "service"
  serviceId: number | null
  unitPrice: number
  notes: string
}

type AgreementComposerItem = AgreementProductComposer | AgreementServiceComposer

interface FixedTechnicalServiceOption {
  id: number
  code: string
  name: string
  price: number
}

const TECHNICAL_SERVICE_OPTION: FixedTechnicalServiceOption = {
  id: 1,
  code: "TECHNICAL_SERVICE",
  name: "Servicio técnico",
  price: 20,
}

@Component({
  selector: "app-technician-panel",
  standalone: false,
  templateUrl: "./technician-panel.html",
  styleUrls: ["./technician-panel.scss"],
})
export class TechnicianPanel implements OnInit {
  activeTab: "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all" = "todo"
  currentPage = 1
  itemsPerPage = 6

  todoOrders: ServiceOrder[] = []
  diagnosisOrders: ServiceOrder[] = []
  pendingApprovalOrders: ServiceOrder[] = []
  repairOrders: ServiceOrder[] = []
  repairedOrders: ServiceOrder[] = []
  allOrders: ServiceOrder[] = []
  selectedServiceOrder: ServiceOrder | null = null

  showDiagnosisModal = false
  diagnosisForm: FormGroup
  showAgreementModal = false
  agreementForm: FormGroup
  diagnosticHistory: ServiceOrderDiagnosis[] = []
  agreementSummary: ServiceOrderAgreement | null = null
  agreementHistory: ServiceOrderAgreement[] = []
  isLoadingServiceOrderAgreement = false
  isSavingAgreement = false
  agreementItems: AgreementComposerItem[] = []
  products: Product[] = []
  productPriceLoading: Record<number, boolean> = {}

  orderInDiagnosis = false
  currentOrderInDiagnosisId: number | null = null

  showAlert = false
  alertType = ""
  alertMessage = ""
  alertIcon = ""

  isLoadingOrders = false
  isSavingDiagnosis = false
  showInboxModal = false
  inboxDraftMessage = ""
  inboxActiveThread: ServiceOrderInboxThreadSummary | null = null
  inboxMessages: ServiceOrderInboxMessage[] = []
  inboxDraftAttachments: InboxDraftAttachment[] = []
  inboxAttachmentPreviewUrls: Record<number, string> = {}
  isLoadingInbox = false
  isSendingInboxMessage = false

  private currentUser: User | null = null
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
    private readonly serviceOrderService: ServiceOrderService,
    private readonly diagnosticService: ServiceOrderDiagnosisService,
    private readonly agreementService: ServiceOrderAgreementService,
    private readonly productsService: ProductsService,
    private readonly pricingQuery: PricingQueryApiService,
    private readonly usersApi: UsersApiService,
    private readonly currentUserService: CurrentUserService,
    private readonly serviceOrderInboxService: ServiceOrderInboxService,
  ) {
    this.diagnosisForm = this.createDiagnosisForm()
    this.agreementForm = this.createAgreementForm()
  }

  ngOnInit(): void {
    this.syncCurrentUserContext()
    this.loadAgreementCatalogs()
    this.loadTechnicianOrders()
    this.loadTechnicians()
  }

  setActiveTab(tab: "todo" | "diagnosis" | "pending_approval" | "repair" | "repaired" | "all"): void {
    this.activeTab = tab
    this.currentPage = 1
  }

  private createDiagnosisForm(): FormGroup {
    return this.formBuilder.group({
      summary: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      details: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      outcome: [ServiceOrderDiagnosisOutcome.REPAIRABLE, Validators.required],
    })
  }

  private createAgreementForm(): FormGroup {
    return this.formBuilder.group({
      notes: ["", Validators.maxLength(500)],
      currency: ["PEN", Validators.required],
    })
  }

  private loadAgreementCatalogs(): void {
    this.productsService.list().subscribe({
      next: (products) => {
        this.products = products ?? []
      },
      error: () => {
        this.products = []
      },
    })
  }

  private loadTechnicianOrders(): void {
    const technicianId = this.getCurrentUserId()
    if (!technicianId) {
      this.allOrders = []
      this.hydrateLists([])
      return
    }

    this.isLoadingOrders = true
    this.serviceOrderService
      .findAll({
        page: 1,
        limit: 50,
        technicianId,
      })
      .pipe(finalize(() => (this.isLoadingOrders = false)))
      .subscribe({
        next: ({ data }) => this.hydrateLists(data ?? []),
        error: () => this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar tus órdenes asignadas."),
      })
  }

  private hydrateLists(orders: ServiceOrder[]): void {
    this.allOrders = [...orders]

    this.todoOrders = orders.filter((order) =>
      [
        ServiceOrderTechnicalStatus.ASIGNADA,
        ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      ].includes(order.technicalStatus),
    )

    this.diagnosisOrders = orders.filter((order) => order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO)

    this.pendingApprovalOrders = orders.filter((order) =>
      [
        ServiceOrderTechnicalStatus.DIAGNOSTICADA,
        ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL,
      ].includes(order.technicalStatus),
    )

    this.repairOrders = orders.filter((order) =>
      [ServiceOrderTechnicalStatus.EN_EJECUCION, ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO].includes(order.technicalStatus),
    )

    this.repairedOrders = orders.filter((order) => order.technicalStatus === ServiceOrderTechnicalStatus.RESUELTA)

    const activeDiagnosis = this.diagnosisOrders.find((order) => order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO)
    this.orderInDiagnosis = !!activeDiagnosis
    this.currentOrderInDiagnosisId = activeDiagnosis?.id ? Number(activeDiagnosis.id) : null

    if (this.selectedServiceOrder) {
      const updated = orders.find((entry) => Number(entry.id) === Number(this.selectedServiceOrder?.id))
      this.selectedServiceOrder = updated ?? null
      if (this.selectedServiceOrder) {
        this.loadServiceOrderDiagnosisHistory(Number(this.selectedServiceOrder.id))
        this.loadServiceOrderAgreementSummary(this.selectedServiceOrder)
      } else {
        this.diagnosticHistory = []
        this.agreementSummary = null
        this.agreementHistory = []
      }
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }
  }

  get visibleOrders(): ServiceOrder[] {
    switch (this.activeTab) {
      case "todo":
        return this.todoOrders
      case "diagnosis":
        return this.diagnosisOrders
      case "pending_approval":
        return this.pendingApprovalOrders
      case "repair":
        return this.repairOrders
      case "repaired":
        return this.repairedOrders
      default:
        return this.allOrders
    }
  }

  get paginatedVisibleOrders(): ServiceOrder[] {
    const start = (this.currentPage - 1) * this.itemsPerPage
    return this.visibleOrders.slice(start, start + this.itemsPerPage)
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.visibleOrders.length / this.itemsPerPage))
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

  selectServiceOrder(order: ServiceOrder): void {
    this.selectedServiceOrder = order
    this.loadServiceOrderDiagnosisHistory(Number(order.id))
    this.loadServiceOrderAgreementSummary(order)
  }

  clearSelectedServiceOrder(): void {
    this.selectedServiceOrder = null
    this.diagnosticHistory = []
    this.agreementSummary = null
    this.agreementHistory = []
  }

  canOpenClientInbox(order: ServiceOrder | null): boolean {
    if (!order) return false
    return ![
      ServiceOrderOperativeStatus.ENTREGADA,
      ServiceOrderOperativeStatus.CANCELADA,
      ServiceOrderOperativeStatus.CERRADA_SIN_SOLUCION,
    ].includes(order.operativeStatus)
  }

  openWhatsAppInbox(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    if (!this.canOpenClientInbox(order)) return
    this.showInboxModal = true
    this.isLoadingInbox = true
    this.inboxDraftMessage = ""
    this.clearInboxDraftAttachments()

    this.serviceOrderInboxService
      .ensureThreadByOrder(Number(order.id))
      .pipe(
        switchMap((thread) => {
          if (!thread) {
            return of(null)
          }
          return this.serviceOrderInboxService.getMessages(thread.id).pipe(
            switchMap((response) =>
              this.serviceOrderInboxService.markRead(thread.id).pipe(
                catchError(() => of({ ok: false })),
                map(() => response),
              ),
            ),
          )
        }),
        finalize(() => (this.isLoadingInbox = false)),
      )
      .subscribe({
        next: (response) => {
          this.inboxActiveThread = response?.thread ?? null
          this.inboxMessages = response?.messages ?? []
          this.hydrateInboxAttachmentPreviews(this.inboxMessages)
        },
        error: () => {
          this.inboxActiveThread = null
          this.inboxMessages = []
          this.showMessage("danger", "fas fa-exclamation-circle", "No pudimos cargar el inbox de la orden.")
        },
      })
  }

  closeInboxModal(): void {
    this.showInboxModal = false
    this.inboxDraftMessage = ""
    this.isLoadingInbox = false
    this.isSendingInboxMessage = false
    this.inboxActiveThread = null
    this.inboxMessages = []
    this.clearInboxAttachmentPreviews()
    this.clearInboxDraftAttachments()
  }

  sendInboxMessage(): void {
    if (!this.inboxActiveThread) return
    const text = this.inboxDraftMessage.trim()
    if (!text && !this.inboxDraftAttachments.length) return

    this.isSendingInboxMessage = true
    const attachments = this.inboxDraftAttachments.map((entry) => entry.file)

    this.serviceOrderInboxService
      .sendMessage(this.inboxActiveThread.id, text, attachments)
      .pipe(
        switchMap((sendResult) =>
          this.serviceOrderInboxService.getMessages(this.inboxActiveThread!.id).pipe(
            map((response) => ({ response, sendResult })),
          ),
        ),
        finalize(() => (this.isSendingInboxMessage = false)),
      )
      .subscribe({
        next: ({ response, sendResult }) => {
          this.inboxActiveThread = response.thread
          this.inboxMessages = response.messages
          this.inboxDraftMessage = ""
          this.clearInboxDraftAttachments()
          this.hydrateInboxAttachmentPreviews(this.inboxMessages)
          const partialFailures = sendResult.partialFailures ?? []
          if (partialFailures.length) {
            this.showMessage("warning", "fas fa-exclamation-triangle", "El mensaje salió parcialmente: revisá los adjuntos fallidos antes de reenviar.")
          }
        },
        error: () => {
          this.showMessage("danger", "fas fa-times-circle", "No pudimos enviar el mensaje al canal.")
        },
      })
  }

  getInboxAuthorLabel(message: ServiceOrderInboxMessage): string {
    if (message.authorDisplayName?.trim()) {
      return message.authorDisplayName.trim()
    }
    switch (message.authorRole) {
      case "TECHNICIAN":
        return "Tecnico"
      case "SUPERVISOR":
        return "Supervisor"
      case "RECEPTION":
        return "Recepción"
      case "CLIENT":
        return this.inboxActiveThread?.clientAlias ?? "Cliente"
      default:
        return "Sistema"
    }
  }

  triggerInboxAttachmentPicker(input: HTMLInputElement): void {
    input.click()
  }

  onInboxFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement
    const files = Array.from(target.files ?? [])
    if (!files.length) {
      return
    }

    const nextAttachments = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }))

    this.inboxDraftAttachments = [...this.inboxDraftAttachments, ...nextAttachments]
    target.value = ""
  }

  removeInboxDraftAttachment(index: number): void {
    const attachment = this.inboxDraftAttachments[index]
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl)
    }
    this.inboxDraftAttachments.splice(index, 1)
  }

  getInboxAttachmentPreviewUrl(attachmentId: number): string | null {
    return this.inboxAttachmentPreviewUrls[attachmentId] ?? null
  }

  downloadInboxAttachment(attachment: ServiceOrderInboxAttachment): void {
    this.serviceOrderInboxService.downloadAttachmentBlob(attachment.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = attachment.fileName
        anchor.click()
        URL.revokeObjectURL(url)
      },
      error: () => {
        this.showMessage("warning", "fas fa-paperclip", "No pudimos descargar el adjunto.")
      },
    })
  }

  startDiagnosis(order: ServiceOrder): void {
    if (this.orderInDiagnosis && this.currentOrderInDiagnosisId !== Number(order.id)) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Completa la revision activa antes de iniciar otra.")
      return
    }
    this.transitionWorkflow(
      order,
      ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      this.isWarrantyService(order) ? "Revision de garantia iniciada correctamente." : "Diagnostico iniciado correctamente.",
    )
  }

  startStandardService(order: ServiceOrder): void {
    if (!this.isStandardService(order)) return
    this.startRepair(order)
  }

  openDiagnosisModal(
    order?: ServiceOrder,
    event?: Event,
    presetOutcome: ServiceOrderDiagnosisOutcome = ServiceOrderDiagnosisOutcome.REPAIRABLE,
  ): void {
    event?.stopPropagation()
    if (order) {
      this.selectServiceOrder(order)
    }
    if (!this.selectedServiceOrder) return
    if (!this.isDiagnosisService(this.selectedServiceOrder)) return
    this.showDiagnosisModal = true
    this.diagnosisForm.reset({
      summary: "",
      details: "",
      outcome: presetOutcome,
    })
  }

  closeDiagnosisModal(): void {
    this.showDiagnosisModal = false
    this.diagnosisForm.reset({
      summary: "",
      details: "",
      outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE,
    })
  }

  openAgreementModal(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.selectServiceOrder(order)
    this.showAgreementModal = true
    this.agreementSummary = null
    this.agreementItems = []
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.isLoadingServiceOrderAgreement = true

    this.agreementService
      .findAll({ page: 1, limit: 5, serviceOrderId: Number(order.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreement = false)))
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          this.agreementHistory = list
          const draft = list.find((entry) => entry.status === ServiceOrderAgreementStatus.DRAFT)
          const confirmed = list.find((entry) => entry.status === ServiceOrderAgreementStatus.CONFIRMED)
          const allowNewAgreement = this.canManageAgreement(order)
          this.agreementSummary = draft ?? (!allowNewAgreement ? confirmed ?? null : null)
          this.agreementForm.patchValue({
            notes: this.agreementSummary?.notes ?? "",
            currency: this.agreementSummary?.currency ?? "PEN",
          })
          if (this.agreementSummary) {
            this.hydrateAgreementComposer(this.agreementSummary)
          } else {
            this.ensureTechnicalServiceItem()
          }
        },
        error: () => {
          this.agreementSummary = null
          this.agreementHistory = []
        },
      })
  }

  openAgreementHistoryModal(agreement: ServiceOrderAgreement, event?: Event): void {
    event?.stopPropagation()
    if (!this.selectedServiceOrder) return

    this.showAgreementModal = true
    this.agreementSummary = agreement
    this.agreementForm.reset({
      notes: agreement.notes ?? "",
      currency: agreement.currency ?? "PEN",
    })
    this.hydrateAgreementComposer(agreement)
  }

  closeAgreementModal(): void {
    this.showAgreementModal = false
    this.agreementForm.reset({ notes: "", currency: "PEN" })
    this.agreementItems = []
    this.productPriceLoading = {}
  }

  addAgreementProduct(): void {
    if (!this.isAgreementEditable()) return
    this.agreementItems.push({
      id: Date.now() + Math.random(),
      type: "product",
      productId: null,
      quantity: 1,
      unitPrice: 0,
      requiresPurchase: true,
      notes: "",
    })
  }

  removeAgreementItem(index: number): void {
    if (!this.isAgreementEditable()) return
    if (this.agreementItems[index]?.type === "service") return
    this.agreementItems.splice(index, 1)
  }

  updateTechnicalServiceAmount(value: unknown): void {
    const item = this.getTechnicalServiceItem()
    if (!item) return
    item.unitPrice = Number(value) || 0
  }

  onAgreementProductSelected(item: AgreementProductComposer, value: any): void {
    item.productId = this.toNumericId(value)
    if (!item.productId) {
      item.unitPrice = 0
      return
    }
    this.fetchAgreementProductPrice(item)
  }

  onAgreementProductQuantityChange(item: AgreementProductComposer, value: any): void {
    item.quantity = Math.max(1, Number(value) || 1)
    if (item.productId) {
      this.fetchAgreementProductPrice(item)
    }
  }

  private fetchAgreementProductPrice(item: AgreementProductComposer): void {
    if (!item.productId) return
    this.productPriceLoading[item.id] = true
    this.pricingQuery
      .calculatePrice(item.productId)
      .pipe(finalize(() => (this.productPriceLoading[item.id] = false)))
      .subscribe({
        next: (res) => {
          item.unitPrice = res?.salePrice ?? 0
        },
        error: () => {
          this.showMessage("warning", "fas fa-info-circle", "No pudimos obtener el precio del producto.")
        },
      })
  }

  calculateAgreementItemSubtotal(item: AgreementComposerItem): number {
    if (item.type === "product") {
      return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
    }
    return Number(item.unitPrice ?? TECHNICAL_SERVICE_OPTION.price)
  }

  calculateAgreementTotal(): number {
    return this.agreementItems.reduce((total, item) => total + this.calculateAgreementItemSubtotal(item), 0)
  }

  submitAgreement(confirmImmediately = true): void {
    const order = this.selectedServiceOrder
    if (!order?.id) return
    if (!this.isAgreementEditable()) {
      this.showMessage("warning", "fas fa-info-circle", "El acuerdo ya esta confirmado y no puede modificarse.")
      return
    }
    if (!this.agreementItems.length) {
      this.showMessage("warning", "fas fa-exclamation-circle", "Agrega al menos un producto o servicio al acuerdo.")
      return
    }
    if (!this.isTechnicalServiceAmountValid()) {
      this.showMessage("warning", "fas fa-exclamation-circle", "El servicio técnico debe ser de al menos S/20.")
      return
    }

    const currentDiagnosisId = this.toNumericId(
      this.diagnosticHistory.find((entry) => entry.status === ServiceOrderDiagnosisStatus.CURRENT)?.id,
    )

    const payload = {
      serviceOrderId: Number(order.id),
      ...(currentDiagnosisId ? { diagnosisId: currentDiagnosisId } : {}),
      notes: this.agreementForm.get("notes")?.value || undefined,
      technicalServiceAmount: this.resolveTechnicalServiceAmount(),
      products: this.agreementItems.flatMap((entry) => {
        if (entry.type !== "product") return []
        const productId = this.toNumericId(entry.productId)
        if (!productId) return []
        return [{
          productId,
          quantity: Math.max(1, Number(entry.quantity) || 1),
          unitPrice: Number(entry.unitPrice || 0),
          requiresPurchase: entry.requiresPurchase,
          notes: entry.notes || undefined,
        }]
      }),
    }

    const request$ = this.agreementSummary?.status === ServiceOrderAgreementStatus.DRAFT
      ? this.agreementService.update(this.agreementSummary.id, payload)
      : this.agreementService.create(payload)

    this.isSavingAgreement = true
    request$
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: (agreement) => {
          if (!confirmImmediately) {
            this.agreementSummary = agreement
            this.showMessage("success", "fas fa-check-circle", "Borrador de acuerdo guardado.")
            this.closeAgreementModal()
            this.loadTechnicianOrders()
            return
          }

          this.confirmAgreement(agreement.id)
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos guardar el acuerdo."),
      })
  }

  confirmAgreement(agreementId: number): void {
    if (!this.isAgreementEditable()) {
      this.showMessage("warning", "fas fa-info-circle", "El acuerdo ya esta confirmado.")
      return
    }
    this.isSavingAgreement = true
    this.agreementService
      .confirm(agreementId)
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Acuerdo confirmado. Ya puedes continuar con el servicio.")
          this.closeAgreementModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos confirmar el acuerdo."),
      })
  }

  markNoAgreement(order: ServiceOrder, event?: Event): void {
    event?.stopPropagation()
    this.selectServiceOrder(order)
    this.isSavingAgreement = true
    this.agreementService
      .createDiagnosisFeeAgreement(Number(order.id))
      .pipe(finalize(() => (this.isSavingAgreement = false)))
      .subscribe({
        next: () => {
          this.showMessage("success", "fas fa-check-circle", "Orden marcada para recojo con cargo de diagnóstico.")
          this.closeAgreementModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos cerrar la orden sin acuerdo."),
      })
  }

  submitDiagnosis(): void {
    if (this.diagnosisForm.invalid || !this.selectedServiceOrder) {
      this.markFormGroupAsTouched(this.diagnosisForm)
      return
    }

    const wasInService = this.selectedServiceOrder.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION
    const orderId = Number(this.selectedServiceOrder.id)
    const selectedOutcome =
      (this.diagnosisForm.get("outcome")?.value as ServiceOrderDiagnosisOutcome | null) ??
      ServiceOrderDiagnosisOutcome.REPAIRABLE
    const chargesDiagnosisFee = selectedOutcome === ServiceOrderDiagnosisOutcome.IRREPARABLE
    const waivesCharge = selectedOutcome === ServiceOrderDiagnosisOutcome.NO_FAULT_FOUND

    const payload: ServiceOrderDiagnosisSaveRequest = {
      serviceOrderId: orderId,
      summary: this.diagnosisForm.get("summary")?.value,
      details: this.diagnosisForm.get("details")?.value,
      outcome: selectedOutcome,
    }

    this.isSavingDiagnosis = true
    this.diagnosticService
      .create(payload)
      .pipe(
        switchMap(() => {
          if (chargesDiagnosisFee) {
            return this.agreementService.createDiagnosisFeeAgreement(orderId).pipe(map(() => "DIAGNOSIS_FEE"))
          }

          if (waivesCharge) {
            return of("WAIVED")
          }

          return of("NORMAL")
        }),
        finalize(() => (this.isSavingDiagnosis = false)),
      )
      .subscribe({
        next: (resolution) => {
          this.showMessage(
            "success",
            "fas fa-check-circle",
            resolution === "DIAGNOSIS_FEE"
              ? "Diagnostico registrado. La orden quedo lista para entrega con cobro de diagnostico."
              : resolution === "WAIVED"
                ? "Diagnostico registrado. La orden quedo lista para entrega sin cobro."
                : wasInService
                  ? "Nuevo diagnostico registrado. La orden volvio a coordinacion para generar un nuevo acuerdo."
                  : "Diagnostico registrado correctamente.",
          )
          this.closeDiagnosisModal()
          this.loadTechnicianOrders()
        },
        error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos registrar el diagnostico."),
      })
  }

  submitDiagnosisAsNoSolution(): void {
    if (!this.selectedServiceOrder || !this.isDiagnosisService(this.selectedServiceOrder)) return

    const currentOutcome =
      (this.diagnosisForm.get("outcome")?.value as ServiceOrderDiagnosisOutcome | null) ??
      ServiceOrderDiagnosisOutcome.REPAIRABLE

    if (currentOutcome === ServiceOrderDiagnosisOutcome.REPAIRABLE) {
      this.diagnosisForm.patchValue({ outcome: ServiceOrderDiagnosisOutcome.IRREPARABLE })
    }

    this.submitDiagnosis()
  }

  canSubmitDiagnosisAsIrreparable(): boolean {
    return this.diagnosisForm.get("outcome")?.value === ServiceOrderDiagnosisOutcome.IRREPARABLE
  }

  startRepair(order: ServiceOrder): void {
    if (order.technicalStatus !== ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION) {
      this.showMessage(
        "warning",
        "fas fa-exclamation-circle",
        "La orden debe estar aprobada para iniciar el servicio.",
      )
      return
    }
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.EN_EJECUCION, "Servicio iniciado.")
  }

  markRepaired(order: ServiceOrder): void {
    if (order.technicalStatus !== ServiceOrderTechnicalStatus.EN_EJECUCION) {
      return
    }
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.RESUELTA, "Equipo marcado como reparado.")
  }

  canFinishRepair(order?: ServiceOrder | null): boolean {
    if (!order) return false
    return order.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION
  }

  acceptWarrantyReview(order: ServiceOrder): void {
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION, "Garantia aceptada correctamente.")
  }

  rejectWarrantyReview(order: ServiceOrder): void {
    this.transitionWorkflow(order, ServiceOrderTechnicalStatus.SIN_SOLUCION, "Garantia rechazada correctamente.")
  }

  private transitionWorkflow(order: ServiceOrder, status: ServiceOrderTechnicalStatus, successMessage: string): void {
    const orderId = Number(order.id)
    if (!orderId) {
      this.showMessage("danger", "fas fa-times-circle", "ID de orden invalido.")
      return
    }

    this.serviceOrderService.changeTechnicalStatus(orderId, status).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", successMessage)
        this.loadTechnicianOrders()
      },
      error: () => this.showMessage("danger", "fas fa-times-circle", "No pudimos actualizar el estado de la orden."),
    })
  }

  getTechnicianName(order: ServiceOrder): string {
    if (order.assignedToTechnicianName) {
      return order.assignedToTechnicianName
    }
    if (order.assignedToTechnicianId) {
      return this.techniciansMap.get(order.assignedToTechnicianId) ?? `Tecnico #${order.assignedToTechnicianId}`
    }
    return "Sin asignar"
  }

  private loadServiceOrderDiagnosisHistory(serviceOrderId: number): void {
    const normalizedId = Number(serviceOrderId)
    if (!normalizedId) {
      this.diagnosticHistory = []
      return
    }
    this.diagnosticService.findAll({ serviceOrderId: normalizedId, limit: 20 }).subscribe({
      next: ({ data }) => (this.diagnosticHistory = data ?? []),
      error: () => this.showMessage("warning", "fas fa-info-circle", "No pudimos cargar el historial de diagnosticos."),
    })
  }

  canStartDiagnosis(order: ServiceOrder): boolean {
    return order.technicalStatus === ServiceOrderTechnicalStatus.ASIGNADA &&
      [ServiceType.DIAGNOSIS, ServiceType.WARRANTY_SERVICE].includes(order.serviceType)
  }

  canOpenRediagnosis(order: ServiceOrder | null): boolean {
    if (!order) return false
    return order.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION && order.serviceType === ServiceType.DIAGNOSIS
  }

  canManageAgreement(order: ServiceOrder | null): boolean {
    if (!order || this.isWarrantyService(order)) return false
    return [
      ServiceOrderTechnicalStatus.DIAGNOSTICADA,
      ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL,
    ].includes(order.technicalStatus)
  }

  isAgreementEditable(): boolean {
    return !this.agreementSummary || this.agreementSummary.status === ServiceOrderAgreementStatus.DRAFT
  }

  getAgreementModalMessage(): string | null {
    if (!this.agreementSummary) {
      return null
    }

    switch (this.agreementSummary.status) {
      case ServiceOrderAgreementStatus.DRAFT:
        return 'Este acuerdo esta en borrador. Puedes editarlo o confirmarlo.'
      case ServiceOrderAgreementStatus.CONFIRMED:
        return 'Este acuerdo ya esta confirmado. Solo puedes revisarlo.'
      case ServiceOrderAgreementStatus.SUPERSEDED:
        return 'Este acuerdo fue reemplazado por una version mas reciente. Solo puedes revisarlo.'
      case ServiceOrderAgreementStatus.VOIDED:
        return 'Este acuerdo fue anulado. Solo puedes revisarlo.'
      default:
        return null
    }
  }

  isAdditionalDiagnosisFlow(): boolean {
    return this.selectedServiceOrder?.technicalStatus === ServiceOrderTechnicalStatus.EN_EJECUCION
  }

  getDiagnosisOutcomeOptions(): Array<{ value: ServiceOrderDiagnosisOutcome; label: string }> {
    return [
      { value: ServiceOrderDiagnosisOutcome.REPAIRABLE, label: "Reparable" },
      { value: ServiceOrderDiagnosisOutcome.IRREPARABLE, label: "Sin arreglo / irreparable" },
      { value: ServiceOrderDiagnosisOutcome.NO_FAULT_FOUND, label: "No replicable" },
    ]
  }

  canStartRepairDirectly(order: ServiceOrder): boolean {
    return (
      order.technicalStatus === ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION &&
      !this.isStandardService(order)
    )
  }

  isWarrantyService(order: ServiceOrder | null): boolean {
    return !!order && order.serviceType === ServiceType.WARRANTY_SERVICE
  }

  canAcceptWarrantyReview(order: ServiceOrder | null): boolean {
    return !!order && this.isWarrantyService(order) && order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO
  }

  canRejectWarrantyReview(order: ServiceOrder | null): boolean {
    return !!order && this.isWarrantyService(order) && order.technicalStatus === ServiceOrderTechnicalStatus.EN_DIAGNOSTICO
  }

  canStartStandardService(order: ServiceOrder): boolean {
    return this.isStandardService(order) && order.technicalStatus === ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION
  }

  private hydrateInboxAttachmentPreviews(messages: ServiceOrderInboxMessage[]): void {
    const imageAttachments = messages.flatMap((message) =>
      (message.attachments ?? []).filter((attachment) => attachment.previewable),
    )

    imageAttachments.forEach((attachment) => {
      if (this.inboxAttachmentPreviewUrls[attachment.id]) {
        return
      }

      this.serviceOrderInboxService.downloadAttachmentBlob(attachment.id).subscribe({
        next: (blob) => {
          this.inboxAttachmentPreviewUrls[attachment.id] = URL.createObjectURL(blob)
        },
      })
    })
  }

  private clearInboxAttachmentPreviews(): void {
    Object.values(this.inboxAttachmentPreviewUrls).forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    })
    this.inboxAttachmentPreviewUrls = {}
  }

  private clearInboxDraftAttachments(): void {
    this.inboxDraftAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
    })
    this.inboxDraftAttachments = []
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

  isDiagnosisService(order: ServiceOrder | null): boolean {
    return !!order && order.serviceType === ServiceType.DIAGNOSIS
  }

  isStandardService(order: ServiceOrder | null): boolean {
    return !!order && [ServiceType.STANDARD_SERVICE, ServiceType.ASSEMBLY].includes(order.serviceType)
  }

  private syncCurrentUserContext(): void {
    this.currentUser = this.currentUserService.value ?? this.restoreUserFromStorage()
  }

  private getCurrentUserId(): number | null {
    const id = Number(this.currentUser?.id)
    return Number.isFinite(id) && id > 0 ? id : null
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

  getEquipmentTypeLabel(type?: EquipmentType | null, equipmentTypeOther?: string | null): string {
    if (!type) {
      return "Sin tipo"
    }
    if (type === EquipmentType.OTHER) {
      const custom = String(equipmentTypeOther ?? "").trim()
      return custom || (this.equipmentTypeLabels[type] ?? String(type))
    }
    return this.equipmentTypeLabels[type] ?? String(type)
  }

  getDiagnosisStatusLabel(status?: ServiceOrderDiagnosisStatus | null): string {
    if (!status) return "Sin estado"
    switch (status) {
      case ServiceOrderDiagnosisStatus.CURRENT:
        return "Actual"
      case ServiceOrderDiagnosisStatus.SUPERSEDED:
        return "Reemplazado"
      default:
        return status
    }
  }

  getProductName(product: ServiceOrderAgreementProduct): string {
    if (product?.product?.name) {
      const sku = product.product.sku ? `${product.product.sku} | ` : ""
      return `${sku}${product.product.name}`
    }
    if (product?.productId) return `Producto #${product.productId}`
    return "Producto sin referencia"
  }

  getCatalogProductName(productId: number | null): string {
    const product = this.products.find((entry) => Number(entry.id) === Number(productId))
    if (!product) return "Producto"
    return product.sku ? `${product.sku} | ${product.name}` : product.name
  }

  getServiceName(service: ServiceOrderAgreementServiceItem): string {
    return service?.serviceNameSnapshot || TECHNICAL_SERVICE_OPTION.name
  }

  getTechnicalServiceLabel(): string {
    return TECHNICAL_SERVICE_OPTION.name
  }

  private shouldLoadServiceOrderAgreement(order: ServiceOrder | null): boolean {
    if (!order) return false
    if (order.serviceType === ServiceType.WARRANTY_SERVICE) return false
    return [
      ServiceOrderTechnicalStatus.DIAGNOSTICADA,
      ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL,
      ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      ServiceOrderTechnicalStatus.EN_EJECUCION,
      ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO,
      ServiceOrderTechnicalStatus.RESUELTA,
    ].includes(order.technicalStatus)
  }

  canShowServiceOrderAgreementSection(order: ServiceOrder | null): boolean {
    return this.shouldLoadServiceOrderAgreement(order)
  }

  private loadServiceOrderAgreementSummary(order: ServiceOrder | null): void {
    if (!order?.id || !this.shouldLoadServiceOrderAgreement(order)) {
      this.agreementSummary = null
      this.agreementHistory = []
      return
    }
    this.isLoadingServiceOrderAgreement = true
    this.agreementSummary = null
    this.agreementHistory = []
    this.agreementService
      .findAll({ page: 1, limit: 20, serviceOrderId: Number(order.id) })
      .pipe(finalize(() => (this.isLoadingServiceOrderAgreement = false)))
      .subscribe({
        next: ({ data }) => {
          const list = data ?? []
          this.agreementHistory = list
          const draft = list.find((agreement) => agreement.status === ServiceOrderAgreementStatus.DRAFT) ?? null
          const confirmed = list.find((agreement) => agreement.status === ServiceOrderAgreementStatus.CONFIRMED) ?? null
          if (this.canManageAgreement(order) && !draft) {
            this.agreementSummary = null
            return
          }
          this.agreementSummary = draft ?? confirmed ?? list[0] ?? null
        },
        error: () => {
          this.agreementSummary = null
          this.agreementHistory = []
        },
      })
  }

  private hydrateAgreementComposer(agreement: ServiceOrderAgreement): void {
    this.agreementItems = []
    agreement.productItems?.forEach((product) => {
      this.agreementItems.push({
        id: Date.now() + Math.random(),
        type: "product",
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        requiresPurchase: product.requiresPurchase,
        notes: product.notes || "",
      })
    })
    agreement.serviceItems?.forEach((service) => {
      this.agreementItems.push({
        id: Date.now() + Math.random(),
        type: "service",
        serviceId: TECHNICAL_SERVICE_OPTION.id,
        unitPrice: Number(service.unitPrice ?? TECHNICAL_SERVICE_OPTION.price),
        notes: service.notes || "",
      })
    })
    this.ensureTechnicalServiceItem()
  }

  getAgreementStatusLabel(status?: ServiceOrderAgreementStatus | null): string {
    if (!status) return "Sin estado"
    switch (status) {
      case ServiceOrderAgreementStatus.DRAFT:
        return "Borrador"
      case ServiceOrderAgreementStatus.CONFIRMED:
        return "Confirmado"
      case ServiceOrderAgreementStatus.SUPERSEDED:
        return "Reemplazado"
      case ServiceOrderAgreementStatus.VOIDED:
        return "Anulado"
      default:
        return status
    }
  }

  private toNumericId(value: unknown): number | null {
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }

  productSearchFn = (term: string, item: Product): boolean => {
    const query = term.toLowerCase().trim()
    return !query || `${item?.sku ?? ""} ${item?.name ?? ""}`.toLowerCase().includes(query)
  }

  private resolveTechnicalServiceAmount(): number {
    return Number(this.getTechnicalServiceItem()?.unitPrice ?? 0)
  }

  getTechnicalServiceItem(): AgreementServiceComposer | null {
    return this.agreementItems.find((entry): entry is AgreementServiceComposer => entry.type === "service") ?? null
  }

  getAgreementProductItems(): AgreementProductComposer[] {
    return this.agreementItems.filter((entry): entry is AgreementProductComposer => entry.type === "product")
  }

  canRemoveAgreementItemById(itemId: number): boolean {
    return this.agreementItems.find((entry) => entry.id === itemId)?.type === "product"
  }

  isTechnicalServiceAmountValid(): boolean {
    return this.resolveTechnicalServiceAmount() >= TECHNICAL_SERVICE_OPTION.price
  }

  private ensureTechnicalServiceItem(): void {
    const current = this.getTechnicalServiceItem()
    if (current) {
      current.serviceId = TECHNICAL_SERVICE_OPTION.id
      current.notes = ""
      if (!Number.isFinite(Number(current.unitPrice)) || Number(current.unitPrice) <= 0) {
        current.unitPrice = TECHNICAL_SERVICE_OPTION.price
      }
      return
    }

    this.agreementItems.unshift({
      id: Date.now() + Math.random(),
      type: "service",
      serviceId: TECHNICAL_SERVICE_OPTION.id,
      unitPrice: TECHNICAL_SERVICE_OPTION.price,
      notes: "",
    })
  }

  getWorkflowLabel(order: ServiceOrder): string {
    switch (order.technicalStatus) {
      case ServiceOrderTechnicalStatus.PENDIENTE_ASIGNACION:
        return "Pendiente de asignación"
      case ServiceOrderTechnicalStatus.ASIGNADA:
        return "Asignado"
      case ServiceOrderTechnicalStatus.EN_DIAGNOSTICO:
        return this.isWarrantyService(order) ? "En revisión de garantía" : "En diagnóstico"
      case ServiceOrderTechnicalStatus.DIAGNOSTICADA:
        return "Diagnosticado"
      case ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL:
        return "En coordinación"
      case ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION:
        return this.isWarrantyService(order) ? "Garantía aceptada" : "Aprobado para servicio"
      case ServiceOrderTechnicalStatus.EN_EJECUCION:
        return "En servicio"
      case ServiceOrderTechnicalStatus.BLOQUEADA:
        return "Bloqueada"
      case ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO:
        return "Esperando repuestos"
      case ServiceOrderTechnicalStatus.RESUELTA:
        return "Servicio finalizado"
      case ServiceOrderTechnicalStatus.SIN_SOLUCION:
        return "Sin solución"
      default:
        return order.technicalStatus
    }
  }

}
