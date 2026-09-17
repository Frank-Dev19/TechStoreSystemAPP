import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BaseService } from '../../services/base.service';
import { CurrentUserService } from '../../services/current-user.service';

type DeliveryType = 'ORDER' | 'MANUAL' | '';
interface TechnicianOption {
  id: number;
  name: string;
  canReceiveManual: boolean;
}
interface ProductOption {
  id: number;
  name: string;
  sku: string;
  isSerialized: boolean;
  managesExpiration: boolean;
  baseUnit?: { name: string; abbreviation: string };
}
interface DeliveryOptions {
  product: {
    id: number;
    name: string;
    sku: string;
    isSerialized: boolean;
    managesExpiration: boolean;
    unit: string;
  };
  availableQuantity: number;
  lots: { id: number; lotCode: string; availableQuantity: number }[];
  serials: { id: number; serialCode: string; lotId: number | null }[];
}
export interface DeliveryRow {
  id: number;
  type: 'ORDER' | 'MANUAL';
  createdAt: string;
  notes: string | null;
  orderId: number | null;
  orderCode: string | null;
  itemId: number | null;
  itemCode: string | null;
  brand: string | null;
  model: string | null;
  technicianId: number;
  technicianName: string;
  issuerName: string;
  status: string;
  lines: {
    id: number;
    productName: string;
    quantity: number;
    returnedQuantity: number;
    serialCode: string | null;
    saleId: number | null;
  }[];
}

@Component({
  selector: 'app-internal-deliveries',
  standalone: false,
  templateUrl: './internal-deliveries.html',
  styleUrls: ['./internal-deliveries.scss'],
})
export class InternalDeliveries implements OnInit, OnDestroy {
  technicianId: number | null = null;
  deliveryType: DeliveryType = '';
  from = '';
  to = '';
  page = 1;
  readonly limit = 20;
  rows: DeliveryRow[] = [];
  technicians: TechnicianOption[] = [];
  products: ProductOption[] = [];
  total = 0;
  loading = false;
  error = '';
  technicianError = '';
  expandedId: number | null = null;
  editorOpen = false;
  saving = false;
  editorError = '';
  editorSuccess = '';
  manualTechnicianId: number | null = null;
  productId: number | null = null;
  quantity = 1;
  lotId: number | null = null;
  serialIds: number[] = [];
  notes = '';
  options: DeliveryOptions | null = null;
  optionsLoading = false;
  optionsError = '';
  private request?: Subscription;
  private optionsRequest?: Subscription;
  private subscriptions = new Subscription();
  readonly labels: Record<string, string> = {
    PENDING: 'Por confirmar uso',
    CONFIRMED: 'Uso confirmado',
    SOLD: 'Vinculada a venta',
    RETURNED: 'Recibida por falla',
    IN_CUSTODY: 'En custodia del técnico',
  };
  constructor(
    private readonly base: BaseService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly current: CurrentUserService,
  ) {}
  ngOnInit() {
    this.loadTechnicians();
    if (this.canCreate) this.loadProducts();
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.technicianId =
          Number(params.get('technicianId')) > 0 ? Number(params.get('technicianId')) : null;
        const type = params.get('type');
        this.deliveryType = type === 'ORDER' || type === 'MANUAL' ? type : '';
        this.from = params.get('from') || '';
        this.to = params.get('to') || '';
        this.page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
        this.load();
      }),
    );
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
    this.optionsRequest?.unsubscribe();
    this.subscriptions.unsubscribe();
  }
  get canCreate() {
    return this.current.hasPermission('inventory-manage.manage');
  }
  get pages() {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }
  get invalidRange() {
    return !!this.from && !!this.to && this.from > this.to;
  }
  get selectedProduct() {
    return this.products.find((product) => Number(product.id) === Number(this.productId)) ?? null;
  }
  get manualTechnicians() {
    return this.technicians.filter((technician) => technician.canReceiveManual);
  }
  get selectedLotAvailable() {
    return (
      this.options?.lots.find((lot) => Number(lot.id) === Number(this.lotId))?.availableQuantity ??
      this.options?.availableQuantity ??
      0
    );
  }
  get requestedQuantity() {
    return this.selectedProduct?.isSerialized ? this.serialIds.length : Number(this.quantity);
  }
  get manualInvalid() {
    if (!this.manualTechnicianId || !this.productId || !this.options) return true;
    if (this.selectedProduct?.isSerialized) return !this.serialIds.length;
    if (
      !Number.isFinite(Number(this.quantity)) ||
      Number(this.quantity) <= 0 ||
      Number(this.quantity) > this.selectedLotAvailable
    )
      return true;
    return !!this.options.lots.length && !this.lotId;
  }
  loadTechnicians() {
    this.technicianError = '';
    this.subscriptions.add(
      this.base
        .get<TechnicianOption[]>('/service-order-material-deliveries/technicians', {
          withLoader: false,
        })
        .subscribe({
          next: (values) => (this.technicians = values),
          error: () => (this.technicianError = 'No se pudo cargar la lista de técnicos.'),
        }),
    );
  }
  loadProducts() {
    this.subscriptions.add(
      this.base
        .get<ProductOption[]>('/inventory/catalogs/products/all', { withLoader: false })
        .subscribe({
          next: (values) => (this.products = values),
          error: () => (this.editorError = 'No se pudo cargar el catálogo de productos.'),
        }),
    );
  }
  productChanged() {
    this.optionsRequest?.unsubscribe();
    this.options = null;
    this.optionsError = '';
    this.serialIds = [];
    this.lotId = null;
    if (!this.productId) return;
    this.optionsLoading = true;
    this.optionsRequest = this.base
      .get<DeliveryOptions>(`/service-order-material-deliveries/manual/options/${this.productId}`, {
        withLoader: false,
      })
      .subscribe({
        next: (value) => {
          this.options = value;
          this.optionsLoading = false;
          if (value.lots.length === 1) this.lotId = value.lots[0].id;
        },
        error: () => {
          this.optionsLoading = false;
          this.optionsError = 'No se pudo consultar la disponibilidad del producto.';
        },
      });
  }
  serialsChanged() {
    if (!this.serialIds.length || !this.options) {
      this.lotId = null;
      return;
    }
    const selected = this.options.serials.filter((serial) => this.serialIds.includes(serial.id));
    const lots = new Set(selected.map((serial) => serial.lotId ?? null));
    if (lots.size > 1) {
      this.serialIds = [];
      this.lotId = null;
      this.optionsError = 'Selecciona series del mismo lote.';
      return;
    }
    this.optionsError = '';
    this.lotId = selected[0]?.lotId ?? null;
  }
  toggleEditor() {
    this.editorOpen = !this.editorOpen;
    this.editorError = '';
    this.editorSuccess = '';
    if (!this.editorOpen) this.resetEditor();
  }
  resetEditor() {
    this.manualTechnicianId = null;
    this.productId = null;
    this.quantity = 1;
    this.lotId = null;
    this.serialIds = [];
    this.notes = '';
    this.options = null;
    this.optionsError = '';
  }
  saveManual() {
    if (this.manualInvalid || this.saving) {
      this.editorError = 'Completa técnico, producto y cantidad disponible.';
      return;
    }
    this.saving = true;
    this.editorError = '';
    this.editorSuccess = '';
    const line: Record<string, unknown> = {
      productId: this.productId,
      quantity: this.requestedQuantity,
    };
    if (this.lotId) line['lotId'] = this.lotId;
    if (this.selectedProduct?.isSerialized) line['serialIds'] = this.serialIds;
    this.base
      .post<{ deliveryId: number; code: string }>(
        '/service-order-material-deliveries/manual',
        {
          requestKey: crypto.randomUUID(),
          technicianId: this.manualTechnicianId,
          notes: this.notes.trim() || undefined,
          lines: [line],
        },
        { withLoader: false },
      )
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.editorSuccess = `${result.code} registrada correctamente.`;
          this.resetEditor();
          this.load();
        },
        error: (err) => {
          this.saving = false;
          const message = err?.error?.message;
          this.editorError = Array.isArray(message)
            ? message.join(' · ')
            : message || 'No se pudo registrar la entrega.';
        },
      });
  }
  search() {
    if (!this.invalidRange) this.navigate(1);
  }
  clear() {
    this.technicianId = null;
    this.deliveryType = '';
    this.from = '';
    this.to = '';
    this.navigate(1);
  }
  navigate(page: number) {
    const queryParams = {
      technicianId: this.technicianId || undefined,
      type: this.deliveryType || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
      page,
    };
    this.router.navigate([], { relativeTo: this.route, queryParams });
    if (
      this.page === page &&
      String(this.route.snapshot.queryParamMap.get('technicianId') || '') ===
        String(this.technicianId || '') &&
      (this.route.snapshot.queryParamMap.get('type') || '') === this.deliveryType &&
      (this.route.snapshot.queryParamMap.get('from') || '') === this.from &&
      (this.route.snapshot.queryParamMap.get('to') || '') === this.to
    )
      this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.error = '';
    this.expandedId = null;
    if (this.invalidRange) {
      this.rows = [];
      this.total = 0;
      this.loading = false;
      this.error = 'La fecha Desde no puede ser posterior a Hasta.';
      return;
    }
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page, limit: this.limit };
    if (this.technicianId) params['technicianId'] = this.technicianId;
    if (this.deliveryType) params['type'] = this.deliveryType;
    if (this.from) params['from'] = this.from;
    if (this.to) params['to'] = this.to;
    this.request = this.base
      .get<{ data: DeliveryRow[]; total: number }>('/service-order-material-deliveries', {
        params,
        withLoader: false,
      })
      .subscribe({
        next: (result) => {
          this.rows = result.data;
          this.total = result.total;
          this.loading = false;
        },
        error: () => {
          this.rows = [];
          this.total = 0;
          this.loading = false;
          this.error = 'No pudimos cargar las entregas. Vuelve a intentarlo.';
        },
      });
  }
}
