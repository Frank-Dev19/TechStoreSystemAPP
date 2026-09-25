import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { BaseService } from '../../services/base.service';
import { CurrentUserService } from '../../services/current-user.service';

type DispatchTab = 'ORDER' | 'INTERNAL_SUPPLY' | 'WARRANTY_REPLACEMENT' | 'HISTORY';
interface DispatchSummary { order: number; internal: number; warranty: number; total: number; }
interface DispatchRow {
  id: number; type: string; status: string; technicianId: number; technicianName: string;
  productId: number; productName: string; productSku: string; quantity: number; reason?: string;
  serviceOrderId?: number; serviceOrderItemId?: number; orderCode?: string; itemCode?: string;
  isSerialized?: boolean; managesExpiration?: boolean; createdAt: string;
}
interface DeliveryRow {
  id: number; type: string; createdAt: string; notes: string | null; orderId: number | null;
  orderCode: string | null; technicianName: string; issuerName: string; status: string;
  lines: { id: number; productName: string; quantity: number; serialCode: string | null }[];
}
interface DeliveryOptions {
  product: { id: number; name: string; sku: string; isSerialized: boolean; managesExpiration: boolean; unit: string };
  availableQuantity: number;
  lots: { id: number; lotCode: string; availableQuantity: number }[];
  serials: { id: number; serialCode: string; lotId: number | null }[];
}

@Component({
  selector: 'app-internal-deliveries',
  standalone: false,
  templateUrl: './internal-deliveries.html',
  styleUrls: ['./internal-deliveries.scss'],
})
export class InternalDeliveries implements OnInit, OnDestroy {
  activeTab: DispatchTab = 'ORDER';
  readonly limit = 20;
  page = 1;
  total = 0;
  rows: DispatchRow[] = [];
  history: DeliveryRow[] = [];
  summary: DispatchSummary = { order: 0, internal: 0, warranty: 0, total: 0 };
  loading = false;
  error = '';
  noticeOpen = false;
  actionRow: DispatchRow | null = null;
  options: DeliveryOptions | null = null;
  optionsLoading = false;
  lotId: number | null = null;
  serialIds: number[] = [];
  resolutionNote = '';
  actionError = '';
  saving = false;
  private readonly subscriptions = new Subscription();

  constructor(private readonly base: BaseService, private readonly current: CurrentUserService) {}

  ngOnInit(): void {
    this.load();
    this.loadSummary();
    this.subscriptions.add(timer(30000, 30000).subscribe(() => this.loadSummary()));
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
  get pages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }
  get canFulfill(): boolean { return this.current.hasPermission('dispatches.fulfill'); }
  get selectedLotAvailable(): number {
    return this.options?.lots.find((lot) => Number(lot.id) === Number(this.lotId))?.availableQuantity
      ?? this.options?.availableQuantity ?? 0;
  }
  get actionInvalid(): boolean {
    if (!this.actionRow || !this.options) return true;
    if (this.options.product.isSerialized) return this.serialIds.length !== Number(this.actionRow.quantity);
    if (this.options.product.managesExpiration && !this.lotId) return true;
    return Number(this.actionRow.quantity) > this.selectedLotAvailable;
  }

  setTab(tab: DispatchTab): void {
    this.activeTab = tab;
    this.page = 1;
    this.noticeOpen = false;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    if (this.activeTab === 'HISTORY') {
      this.subscriptions.add(this.base.get<{ data: DeliveryRow[]; total: number }>(
        '/service-order-material-deliveries',
        { params: { page: this.page, limit: this.limit }, withLoader: false },
      ).subscribe({
        next: (result) => { this.history = result.data; this.total = result.total; this.loading = false; },
        error: () => { this.error = 'No se pudo cargar el historial de despachos.'; this.loading = false; },
      }));
      return;
    }
    this.subscriptions.add(this.base.get<{ data: DispatchRow[]; total: number }>(
      '/dispatches/queue',
      { params: { type: this.activeTab, status: 'PENDING', page: this.page, limit: this.limit }, withLoader: false },
    ).subscribe({
      next: (result) => { this.rows = result.data; this.total = result.total; this.loading = false; },
      error: () => { this.error = 'No se pudo cargar la cola de despachos.'; this.loading = false; },
    }));
  }

  loadSummary(): void {
    this.subscriptions.add(this.base.get<DispatchSummary>('/dispatches/summary', { withLoader: false })
      .subscribe({ next: (value) => (this.summary = value) }));
  }

  navigate(page: number): void { this.page = Math.max(1, Math.min(this.pages, page)); this.load(); }

  openFulfillment(row: DispatchRow): void {
    this.actionRow = row;
    this.options = null;
    this.lotId = null;
    this.serialIds = [];
    this.resolutionNote = '';
    this.actionError = '';
    this.optionsLoading = true;
    this.subscriptions.add(this.base.get<DeliveryOptions>(`/dispatches/options/${row.productId}`, { withLoader: false })
      .subscribe({
        next: (value) => {
          this.options = value;
          this.optionsLoading = false;
          if (value.lots.length === 1) this.lotId = value.lots[0].id;
        },
        error: () => { this.optionsLoading = false; this.actionError = 'No se pudo consultar el stock disponible.'; },
      }));
  }

  closeFulfillment(): void { if (!this.saving) this.actionRow = null; }
  serialsChanged(): void {
    if (!this.options || !this.serialIds.length) { this.lotId = null; return; }
    const selected = this.options.serials.filter((serial) => this.serialIds.includes(serial.id));
    const lots = new Set(selected.map((serial) => serial.lotId));
    if (lots.size > 1) {
      this.serialIds = [];
      this.lotId = null;
      this.actionError = 'Selecciona series pertenecientes al mismo lote.';
    } else {
      this.actionError = '';
      this.lotId = selected[0]?.lotId ?? null;
    }
  }

  fulfill(): void {
    if (!this.actionRow || this.actionInvalid || this.saving) return;
    this.saving = true;
    const body: Record<string, unknown> = { requestKey: crypto.randomUUID() };
    if (this.lotId) body['lotId'] = this.lotId;
    if (this.serialIds.length) body['serialIds'] = this.serialIds;
    if (this.resolutionNote.trim()) body['note'] = this.resolutionNote.trim();
    this.subscriptions.add(this.base.post(`/dispatches/requests/${this.actionRow.id}/fulfill`, body, { withLoader: false })
      .subscribe({
        next: () => { this.saving = false; this.actionRow = null; this.load(); this.loadSummary(); },
        error: (err) => {
          this.saving = false;
          const message = err?.error?.message;
          this.actionError = Array.isArray(message) ? message.join(' · ') : message || 'No se pudo confirmar el despacho.';
        },
      }));
  }

  reject(row: DispatchRow): void {
    const reason = window.prompt('Motivo del rechazo de la solicitud:');
    if (!reason?.trim()) return;
    this.subscriptions.add(this.base.post(`/dispatches/requests/${row.id}/reject`, { reason: reason.trim() }, { withLoader: false })
      .subscribe({ next: () => { this.load(); this.loadSummary(); } }));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.actionRow) this.closeFulfillment(); else this.noticeOpen = false; }

  tabCount(tab: DispatchTab): number {
    if (tab === 'ORDER') return this.summary.order;
    if (tab === 'INTERNAL_SUPPLY') return this.summary.internal;
    if (tab === 'WARRANTY_REPLACEMENT') return this.summary.warranty;
    return 0;
  }

  typeLabel(type: string): string {
    return ({ ORDER: 'Material de orden', MANUAL: 'Entrega interna', INTERNAL_REQUEST: 'Insumo interno', WARRANTY_REPLACEMENT: 'Reemplazo por garantía' } as Record<string, string>)[type] || type;
  }
}
