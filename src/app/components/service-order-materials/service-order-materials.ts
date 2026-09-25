import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CurrentUserService } from '../../services/current-user.service';
import {
  ServiceOrder,
  ServiceOrderItem,
  ServiceType,
} from '../../models/service-orders/service-order';
import {
  MaterialLine,
  MaterialQuoteLine,
  MaterialSerial,
  MaterialState,
  ServiceOrderMaterialsService,
} from '../../services/service-orders/service-order-materials.service';

@Component({
  selector: 'app-service-order-materials',
  standalone: false,
  templateUrl: './service-order-materials.html',
  styleUrls: ['./service-order-materials.scss'],
})
export class ServiceOrderMaterialsComponent implements OnChanges, OnDestroy {
  @Input() order!: ServiceOrder;
  @Input() itemId: number | null = null;
  @Input() readOnly = false;
  @Input() allowInventoryActions = true;
  @ViewChild('editor') editor?: ElementRef<HTMLElement>;
  private opener?: HTMLElement;
  private focusTimer?: ReturnType<typeof setTimeout>;
  @Input() expanded = false;
  stockLoading = false;
  stockError = '';
  readonly uid = `materials-${crypto.randomUUID()}`;
  selectedItemId: number | null = null;
  state: MaterialState | null = null;
  loading = false;
  busy = false;
  error = '';
  success = '';
  issueLine: MaterialQuoteLine | null = null;
  returnLine: MaterialLine | null = null;
  reviewSerial: MaterialSerial | null = null;
  serials: MaterialSerial[] = [];
  lots: { id: number; lotCode: string }[] = [];
  selectedSerials: number[] = [];
  lotId: number | null = null;
  quantity = 1;
  reason = '';
  reviewCondition: 'USABLE' | 'UNUSABLE' | '' = '';
  private reads = new Subscription();
  private action?: Subscription;
  private generation = 0;
  private retry: { signature: string; key: string } | null = null;
  constructor(
    private readonly api: ServiceOrderMaterialsService,
    private readonly current: CurrentUserService,
  ) {}
  get items(): ServiceOrderItem[] {
    return this.order?.items ?? [];
  }
  get isWarrantyOrder(): boolean {
    return this.order?.serviceType === ServiceType.WARRANTY_SERVICE;
  }
  get canManage() {
    return (
      this.allowInventoryActions &&
      !this.readOnly &&
      this.current.hasPermission('inventory-manage.manage')
    );
  }
  get canReconcile() {
    return !this.readOnly && this.current.hasPermission('service-order.update');
  }
  get products() {
    return this.state?.version?.lines.filter((line) => line.type === 'PRODUCT') ?? [];
  }
  get reconciled() {
    return (
      !!this.state?.reconciliation?.valid &&
      Number(this.state.reconciliation.versionId) === Number(this.state.version?.id)
    );
  }
  get frozen() {
    return (
      !!this.state?.lines.some((line) => line.saleId) ||
      !!this.items.find((item) => Number(item.id) === Number(this.selectedItemId))?.deliveredAt
    );
  }
  get hasMaterials() {
    return !!this.products.length || !!this.state?.lines.length;
  }
  get productProgress() {
    const grouped = new Map<
      number,
      { line: MaterialQuoteLine; authorized: number; issued: number; pending: number }
    >();
    for (const line of this.products) {
      const key = Number(line.productId);
      const row = grouped.get(key) ?? { line, authorized: 0, issued: 0, pending: 0 };
      row.authorized += Number(line.quantity);
      grouped.set(key, row);
    }
    return [...grouped.values()].map((row) => {
      row.issued = (this.state?.lines ?? [])
        .filter((line) => Number(line.productId) === Number(row.line.productId))
        .reduce((sum, line) => sum + this.outstanding(line), 0);
      row.pending = Math.max(0, Number((row.authorized - row.issued).toFixed(4)));
      return row;
    });
  }
  get issueRemaining() {
    return (
      this.productProgress.find(
        (row) => Number(row.line.productId) === Number(this.issueLine?.productId),
      )?.pending ?? 0
    );
  }
  get pendingReviews() {
    return this.state?.serials.filter((serial) => serial.condition === 'UNDER_REVIEW') ?? [];
  }
  get activeLines() {
    return this.state?.lines.filter((line) => this.outstanding(line) > 0) ?? [];
  }
  get returnedLines() {
    return this.state?.lines.filter((line) => Number(line.returnedQuantity) > 0) ?? [];
  }
  get reconciliationBlock() {
    if (!this.state?.version) return 'Aprueba una cotización para gestionar los materiales.';
    if (this.state.technicalStatus !== 'EN_EJECUCION')
      return 'Inicia el servicio del equipo para confirmar los materiales utilizados. El estado debe ser En servicio.';
    const rows = this.productProgress;
    const extra = this.state.lines.some(
      (line) =>
        this.outstanding(line) > 0 &&
        !rows.some((row) => Number(row.line.productId) === Number(line.productId)),
    );
    if (extra || rows.some((row) => row.issued - row.authorized > 0.00001))
      return 'Los materiales entregados no coinciden con la cotización vigente. Regulariza la cotización antes de confirmar.';
    if (rows.some((row) => row.pending > 0.00001))
      return 'Faltan productos por entregar. Completa las cantidades aprobadas antes de confirmar el uso.';
    return '';
  }
  get statusLabel() {
    if (!this.state?.version)
      return this.isWarrantyOrder ? 'Gestión por garantía' : 'Sin cotización aprobada';
    if (!this.hasMaterials) return 'No requiere materiales';
    if (this.frozen) return 'Registro cerrado';
    if (this.reconciled) return 'Uso confirmado';
    return this.reconciliationBlock ? 'Entrega pendiente' : 'Por confirmar uso';
  }
  serialCode(id: number) {
    return (
      this.state?.serials.find((serial) => Number(serial.id) === Number(id))?.serialCode ??
      `Serie #${id}`
    );
  }
  returnedSerial(lineId: number) {
    return (
      this.state?.lines.find((line) => Number(line.id) === Number(lineId))?.serialCode ??
      'Pieza sin serie'
    );
  }
  returnRecord(lineId: number) {
    return this.state?.returns.find((entry) => Number(entry.deliveryLineId) === Number(lineId));
  }
  deliveryDate(line: MaterialLine) {
    return this.state?.deliveries.find(
      (delivery) => Number(delivery.id) === Number(line.deliveryId),
    )?.createdAt;
  }
  private focusEditor(event?: Event) {
    this.opener = event?.currentTarget as HTMLElement;
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => this.editor?.nativeElement.focus(), 0);
  }
  ngOnChanges() {
    this.selectedItemId = Number(this.itemId ?? this.items[0]?.id) || null;
    this.reset();
    if (this.expanded) this.load();
  }
  ngOnDestroy() {
    this.reads.unsubscribe();
    this.action?.unsubscribe();
    clearTimeout(this.focusTimer);
  }
  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded) this.load();
  }
  selectItem() {
    this.reset();
    this.load();
  }
  private reset() {
    this.generation++;
    this.reads.unsubscribe();
    this.reads = new Subscription();
    this.state = null;
    this.issueLine = null;
    this.returnLine = null;
    this.reviewSerial = null;
    this.error = '';
    this.success = '';
    this.loading = false;
    this.stockLoading = false;
    this.stockError = '';
  }
  load() {
    if (!this.selectedItemId || !this.order) return;
    this.loading = true;
    this.error = '';
    this.closeForm(false);
    const generation = ++this.generation;
    this.reads.add(
      this.api.read(Number(this.order.id), Number(this.selectedItemId)).subscribe({
        next: (state) => {
          if (generation === this.generation) {
            this.state = state;
            this.loading = false;
          }
        },
        error: (err) => {
          if (generation === this.generation) {
            this.error = this.message(err);
            this.loading = false;
          }
        },
      }),
    );
  }
  outstanding(line: MaterialLine) {
    return Number(line.quantity) - Number(line.returnedQuantity);
  }
  name(line: MaterialLine) {
    return (
      this.products.find((product) => Number(product.productId) === Number(line.productId))
        ?.catalogNameSnapshot ?? `Producto ${line.productId}`
    );
  }
  condition(line: MaterialLine) {
    return this.state?.serials.find((serial) => Number(serial.id) === Number(line.serialId));
  }
  conditionLabel(condition: string) {
    return (
      { USABLE: 'Utilizable', UNDER_REVIEW: 'En revisión', UNUSABLE: 'Inutilizable' }[condition] ??
      condition
    );
  }
  openIssue(line: MaterialQuoteLine, event?: Event) {
    this.issueLine = line;
    this.returnLine = null;
    this.reviewSerial = null;
    this.selectedSerials = [];
    this.serials = [];
    this.lots = [];
    this.quantity = Math.min(1, this.issueRemaining);
    this.lotId = null;
    this.error = '';
    this.success = '';
    this.focusEditor(event);
    this.loadStock();
  }
  loadStock() {
    const line = this.issueLine;
    if (!line) return;
    this.stockLoading = true;
    this.stockError = '';
    const generation = this.generation;
    this.reads.add(
      this.api
        .available(Number(this.order.id), Number(this.selectedItemId), line.productId)
        .subscribe({
          next: (result) => {
            if (generation === this.generation && this.issueLine === line) {
              this.serials = result.serials;
              this.lots = result.lots;
              this.stockLoading = false;
            }
          },
          error: (err) => {
            if (generation === this.generation && this.issueLine === line) {
              this.stockLoading = false;
              this.stockError = this.message(err);
            }
          },
        }),
    );
  }
  submitIssue() {
    if (!this.issueLine || !this.state?.version) return;
    if (this.stockLoading || this.stockError) return;
    const serialized = this.issueLine.product?.isSerialized;
    const amount = serialized ? this.selectedSerials.length : Number(this.quantity);
    if (!Number.isFinite(amount) || amount <= 0 || amount > this.issueRemaining) {
      this.error = `Selecciona una cantidad válida. Puedes entregar hasta ${this.issueRemaining}.`;
      return;
    }
    if (serialized && !this.selectedSerials.length) {
      this.error = 'Selecciona las series físicas que se entregan.';
      return;
    }
    this.perform(
      'deliveries',
      {
        versionId: Number(this.state.version.id),
        lines: [
          {
            commercialLineId: Number(this.issueLine.id),
            quantity: serialized ? this.selectedSerials.length : this.quantity,
            ...(serialized ? { serialIds: this.selectedSerials.map(Number) } : {}),
            ...(this.lotId ? { lotId: Number(this.lotId) } : {}),
          },
        ],
      },
      'Entrega registrada.',
    );
  }
  openReturn(line: MaterialLine, event?: Event) {
    this.returnLine = line;
    this.issueLine = null;
    this.reviewSerial = null;
    this.reason = '';
    this.error = '';
    this.success = '';
    this.focusEditor(event);
  }
  submitReturn() {
    if (!this.returnLine) return;
    if (!this.reason.trim()) {
      this.error = 'Describe la falla de fábrica reportada.';
      return;
    }
    this.perform(
      'returns',
      {
        deliveryLineId: Number(this.returnLine.id),
        quantity: 1,
        faulty: true,
        reason: this.reason.trim(),
      },
      'Pieza recibida por falla de fábrica; pendiente de revisión.',
    );
  }
  openReview(serial: MaterialSerial, event?: Event) {
    this.reviewSerial = serial;
    this.returnLine = null;
    this.issueLine = null;
    this.reason = '';
    this.reviewCondition = '';
    this.error = '';
    this.success = '';
    this.focusEditor(event);
  }
  submitReview() {
    if (!this.reviewSerial) return;
    if (!this.reviewCondition) {
      this.error = 'Selecciona el resultado de la revisión.';
      return;
    }
    if (!this.reason.trim()) {
      this.error = 'Indica el resultado de la revisión.';
      return;
    }
    this.perform(
      `serials/${this.reviewSerial.id}/review`,
      { condition: this.reviewCondition, reason: this.reason.trim() },
      'Revisión registrada.',
    );
  }
  reconcile() {
    if (this.reconciliationBlock) {
      this.error = this.reconciliationBlock;
      return;
    }
    if (this.state?.version)
      this.perform(
        'reconcile',
        { versionId: Number(this.state.version.id) },
        'Materiales utilizados confirmados.',
      );
  }
  closeForm(restoreFocus = true) {
    this.issueLine = null;
    this.returnLine = null;
    this.reviewSerial = null;
    if (restoreFocus) this.opener?.focus();
  }
  private perform(action: string, data: object, success: string) {
    if (this.busy) return;
    const orderId = Number(this.order.id),
      itemId = Number(this.selectedItemId);
    const signature = JSON.stringify({ orderId, itemId, action, data });
    if (this.retry?.signature !== signature) this.retry = { signature, key: crypto.randomUUID() };
    this.busy = true;
    this.error = '';
    this.success = '';
    const generation = this.generation;
    this.action = this.api
      .act(orderId, itemId, action, { ...data, requestKey: this.retry.key })
      .subscribe({
        next: () => {
          this.busy = false;
          this.retry = null;
          if (generation === this.generation) {
            this.closeForm();
            this.success = success;
            this.load();
          }
        },
        error: (err) => {
          this.busy = false;
          if (generation === this.generation) this.error = this.message(err);
        },
      });
  }
  private message(err: { error?: { message?: string | string[] } }) {
    const message = err?.error?.message;
    return Array.isArray(message)
      ? message.join(' · ')
      : message || 'No se pudo completar la operación. Puedes reintentar.';
  }
}
