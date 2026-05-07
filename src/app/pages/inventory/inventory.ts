import { Component, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Subscription, timer } from 'rxjs';

// ===== Modelos (usamos los que ya creaste en /models) =====
import { Product } from '../../models/catalog/product';
import { Category } from '../../models/catalog/category';
import { Unit } from '../../models/catalog/unit';
import { Stock } from '../../models/inventory/stock';
import { Movement } from '../../models/inventory/movement';
import { Count } from '../../models/inventory/count';
import { CountSnapshot } from '../../models/inventory/count-snapshot';
import { CountEntry } from '../../models/inventory/count-entry';
import { SuppliersApiService } from '../../services/suppliers-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { SupplierResponse } from '../../models/suppliers-response';
import { DocumentTypeResponse } from '../../models/document-types/document-types-response';

// ===== Servicios (los que ya construimos) =====
import { CurrentUserService } from '../../services/current-user.service';
import { ImportProductRow, ImportProductsResult, ProductsService } from '../../services/inventory/products.service';
import { CatalogsService } from '../../services/inventory/catalogs.service';
import { StockService, StockFilters } from '../../services/inventory/stock.service';
import { KardexService, KardexFilters } from '../../services/inventory/kardex.service';
import { CountsHttpService } from '../../services/inventory/counts.service';
import { MovementsService } from '../../services/inventory/movements.service';
import { LotsService } from '../../services/inventory/lots.service';
import { SerialsService } from '../../services/inventory/serials.service';
//import { MovementsService } from '../../services/inventory/movements.service';

//importaciones para el pdf y excel
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';

// ===== Util =====
type ToastType = 'success' | 'error' | 'warning' | 'info';
type OperationProductSearchMode = 'entry' | 'exit' | 'adjustment';

@Component({
  selector: 'app-inventory',
  standalone: false,
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss',
})
export class Inventory implements OnInit, OnDestroy {

  public Math = Math;
  // -----------------------------
  // UI STATE
  // -----------------------------
  activeTab: string = 'operations';
  activeOperation: string = 'entry';

  // Helper properties for template type checking
  get isOperationsTab(): boolean { return this.activeTab === 'operations'; }
  get isStockTab(): boolean { return this.activeTab === 'stock'; }
  get isCountsTab(): boolean { return this.activeTab === 'counts'; }
  get isKardexTab(): boolean { return this.activeTab === 'kardex'; }
  get isProductsTab(): boolean { return this.activeTab === 'products'; }
  get isCatalogsTab(): boolean { return this.activeTab === 'catalogs'; }
  isLocked = false;
  lockReason = '';
  selectedProductAdjustment: Product | null = null;

  // Buscadores
  searchStock = '';
  searchProduct = '';
  searchCategory = '';
  searchUnit = '';

  // Filtros Productos
  productFilter = {
    search: '',
    categoryId: null as number | null,
    page: 1,
    limit: 20
  };
  productTotal = 0;
  productLoading = false;

  // Filtros Categorías (Tabla)
  pagedCategories: Category[] = [];
  categoryFilter = { search: '', page: 1, limit: 20 };
  categoryTotal = 0;
  categoryLoading = false;

  // Filtros Unidades (Tabla)
  pagedUnits: Unit[] = [];
  unitFilter = { search: '', page: 1, limit: 20 };
  unitTotal = 0;
  unitLoading = false;

  // Autocomplete Categoría
  categorySearchText = '';
  filteredCategories: { id: number; name: string }[] = [];
  showCategoryDropdown = false;

  private readonly operationProductSearchMinChars = 2;
  private readonly operationProductSearchLimit = 20;
  private readonly operationProductSearchDebounceMs = 300;
  private readonly operationProductSearchCache = new Map<string, Product[]>();
  private readonly operationProductSearchSubscriptions: Partial<Record<OperationProductSearchMode, Subscription>> = {};
  private readonly operationProductSearchRequestVersion: Record<OperationProductSearchMode, number> = {
    entry: 0,
    exit: 0,
    adjustment: 0,
  };

  // Buscadores para Stock
  stockFilters: StockFilters = {
    search: '',
    category_id: null,
    updated_from: '',
    updated_to: '',
    expiration_status: 'ALL',
    page: 1,
    limit: 20
  };
  pagedStock: any[] = [];
  stockTotal = 0;
  stockLoading = false;
  datePresetStock = 'all';
  stockMetrics: any = {
    totalValue: 0,
    productsInStock: 0,
    lowStockCount: 0,
    expiringLotsCount: 0
  };

  expandedStockProducts: Set<number> = new Set();
  // Filtros Kardex
  kardexFilters: KardexFilters = {
    dateFrom: '',
    dateTo: '',
    product_id: null,
    reason_code: null,
    page: 1,
    limit: 20
  };
  pagedKardex: Movement[] = [];
  kardexTotal = 0;
  kardexLoading = false;
  datePresetKardex = 'last30days';

  // -----------------------------
  // FORM STATE
  // -----------------------------
  entryForm = {
    product_id: null as number | null,
    qty: 0,
    unit_cost: 0,
    lot_code: '',
    expiration_date: '',
    serials: '',
    notes: '',
    supplier_id: null as number | null,
  };

  // --- ENTRADA (seriales) ---
  entrySerialInput = '';
  entrySerialCodes: string[] = [];

  // --- SALIDA (seriales) ---
  availableSerialsForExit: { id: number; serial_code: string; lot_id?: number | null }[] = [];
  exitSelectedSerialIds: number[] = [];
  exitAutoSelect = true; // <-- NUEVO: modo auto activado por defecto

  // --- AJUSTE (seriales) ---
  adjSerialInput = '';
  adjSerialCodes: string[] = [];          // para qty > 0
  adjSelectedSerialIds: number[] = [];    // para qty < 0

  // --- KARDEX (modal seriales) ---
  showMovementSerialsModal = false;
  currentMovementProductManagesExpiration = false;
  currentMovementSerials: Array<{ serial_id: number; serial_code: string; lot_id: number | null; lot_code?: string | null; supplier_name?: string | null }> = [];

  // --- CONTEO (seriales) ---
  countEntrySerialInput = '';
  countEntrySerialCodes: string[] = [];

  // --- CONTEO (seriales) - sobrantes no resueltos ---
  unresolvedSerials: Array<{ serial_code: string; product_id: number | null; lot_id: number | null; lot_code: string | null }> = [];
  showUnresolvedModal = false;

  // 👉 NUEVO: este flag decide si el modal debe mostrarse (solo si el producto requiere lote)
  requireLotsForUnresolved = false;

  exitForm = {
    product_id: null as number | null,
    qty: 0,
    reason_code: 'VENTA',
    lot_id: null as number | null,
    serial_id: null as number | null,
    notes: '',
  };

  adjustmentForm = {
    product_id: null as number | null,
    lot_id: null as number | null,   // <--- nuevo
    qty: 0,
    notes: '',
  };

  countEntryForm = {
    product_id: null as number | null,
    lot_id: null as number | null,
    qty_counted: 0,
  };

  productForm = {
    sku: '',
    name: '',
    description: '',
    brand: '',
    category_id: null as number | null,
    unit_id: null as number | null,
    is_serialized: false,
    manages_expiration: false,
    min_stock: 0,
    max_stock: 0,
    reorder_point: 0,
  };

  showImportProductsModal = false;
  importProductsFileName = '';
  importProductsRows: ImportProductRow[] = [];
  importProductsErrors: string[] = [];
  importProductsResult: ImportProductsResult | null = null;
  importProductsLoading = false;
  importProductsForm = {
    category_id: null as number | null,
    unit_id: null as number | null,
    is_serialized: true,
    manages_expiration: false,
    min_stock: 0,
    max_stock: 0,
    reorder_point: 0,
    duplicateMode: 'skip' as 'skip' | 'update',
  };

  categoryForm = {
    name: '',
    description: '',
  };

  unitForm = {
    name: '',
    abbreviation: '',
  };

  showSupplierModal = false;
  supplierForm = {
    company_id: 1, // o el que aplique
    document_type_id: null as number | null,
    document_number: '',
    name: '',
    commercial_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  };

  // -----------------------------
  // DATOS CARGADOS
  // -----------------------------
  products: Product[] = [];
  categories: Category[] = [];
  units: Unit[] = [];
  stock: Stock[] = [];
  kardex: Movement[] = [];
  counts: Count[] = [];
  suppliers: SupplierResponse[] = [];
  documentTypes: DocumentTypeResponse[] = [];

  // Mapas rápidos
  private productMap = new Map<number, Product>();
  private categoryMap = new Map<number, Category>();
  // (Si en el futuro expones lots, rellena estos métodos; por ahora mostramos '-')
  // private lotMap = new Map<number, { lot_code: string; expiration_date: string | null }>();
  private lotIdMap = new Map<number, { lot_code: string; expiration_date: string | null }>();


  // Conteo seleccionado
  selectedCount: Count | null = null;

  // Snapshots / entradas del conteo seleccionado
  currentCountSnapshots: CountSnapshot[] = [];
  currentCountEntries: CountEntry[] = [];

  // Producto seleccionado por formulario
  selectedProductEntry: Product | null = null;
  selectedProductExit: Product | null = null;
  selectedCountProduct: Product | null = null;

  // Auxiliares para salida (si luego agregas servicios de lotes/seriales, alínealo aquí)
  availableLotsForExit: { id: number; lot_code: string; expiration_date: string | null; qty_on_hand: number }[] = [];
  //availableSerialsForExit: { id: number; serial_code: string }[] = [];

  // Diferencias (REVIEW)
  differences: Array<{
    product_id: number;
    lot_id: number | null;
    qty_system: number;
    qty_counted: number;
    difference: number;
    avg_cost: number;
    value_difference: number;
  }> = [];

  differenceSummary = { surplus: 0, shortage: 0, net: 0 };

  // Modales Catálogos
  showProductModal = false;
  showCategoryModal = false;
  showUnitModal = false;
  editingProduct: Product | null = null;
  editingCategory: Category | null = null;
  editingUnit: Unit | null = null;

  // Toasts
  toasts: { type: ToastType; message: string }[] = [];


  //Primer chield
  @ViewChild('reviewSection') reviewSectionRef!: ElementRef;

  // === refs de inputs (para devolver foco tras agregar) ===
  @ViewChild('entrySerialField') entrySerialField!: ElementRef<HTMLInputElement>;
  @ViewChild('adjSerialField') adjSerialField!: ElementRef<HTMLInputElement>;
  @ViewChild('countSerialField') countSerialField!: ElementRef<HTMLInputElement>;

  constructor(
    private productsSvc: ProductsService,
    private catalogsSvc: CatalogsService,
    private stockSvc: StockService,
    private kardexSvc: KardexService,
    private countsSvc: CountsHttpService,
    private movementSvc: MovementsService,
    private lotsSvc: LotsService,
    private serialsSvc: SerialsService,
    private currentUser: CurrentUserService,
    private suppliersApi: SuppliersApiService,
    private docTypesApi: DocumentTypesApiService,
  ) { }

  // =========================================================
  // INIT
  // =========================================================
  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadProducts(),
      this.loadCategories(),
      this.loadUnits(),
      this.loadPagedCategories(),
      this.loadPagedUnits(),
      this.loadStock(),
      this.loadKardex(),
      this.loadCounts(),
      this.loadSuppliers(),
      this.loadDocumentTypes(),
    ]);
  }

  ngOnDestroy(): void {
    this.cancelOperationProductSearch('entry');
    this.cancelOperationProductSearch('exit');
    this.cancelOperationProductSearch('adjustment');
  }

  //Usuario aCtual
  private get currentUserName(): string {
    return this.currentUser.value?.name || 'Usuario Front';
  }

  // =========================================================
  // LOADERS
  // =========================================================
  private async loadSuppliers() {
    try {
      const user = this.currentUser.value as any;
      const companyId = user?.companyId || user?.company_id || 1;
      const res = await this.suppliersApi.findAll({ limit: 1000, companyId }).toPromise();
      this.suppliers = res?.data ?? [];
    } catch { this.suppliers = []; }
  }

  private async loadDocumentTypes() {
    try {
      const res = await this.docTypesApi.findAll({ limit: 100 }).toPromise();
      this.documentTypes = res?.data ?? [];
    } catch { this.documentTypes = []; }
  }

  private async loadProducts() {
    try {
      this.productLoading = true;
      const filter = {
        search: this.productFilter.search || undefined,
        categoryId: this.productFilter.categoryId || undefined,
        page: this.productFilter.page,
        limit: this.productFilter.limit
      };
      const res = await this.productsSvc.listWithFilter(filter).toPromise();
      this.products = res?.data ?? [];
      this.productTotal = res?.total ?? 0;
      this.productMap.clear();
      this.products.forEach((p) => this.productMap.set(p.id, p));
    } catch {
      this.showToast('error', 'No se pudieron cargar productos');
    } finally {
      this.productLoading = false;
    }
  }

  async applyProductFilters() {
    this.productFilter.page = 1;
    await this.loadProducts();
  }

  async clearProductFilters() {
    this.productFilter = { search: '', categoryId: null, page: 1, limit: 20 };
    this.categorySearchText = '';
    this.filteredCategories = [];
    this.showCategoryDropdown = false;
    await this.loadProducts();
  }

  // Autocomplete Categoría
  onCategorySearch(): void {
    const search = (this.categorySearchText || '').trim().toLowerCase();
    if (!search) {
      this.filteredCategories = [];
      this.showCategoryDropdown = false;
      return;
    }
    this.filteredCategories = this.categories
      .filter(c => c.name.toLowerCase().includes(search))
      .slice(0, 15);
    this.showCategoryDropdown = this.filteredCategories.length > 0;
  }

  selectCategory(category: { id: number; name: string }): void {
    this.productFilter.categoryId = category.id;
    this.categorySearchText = category.name;
    this.showCategoryDropdown = false;
    this.applyProductFilters();
  }

  onCategoryFocus(): void {
    if (this.filteredCategories.length > 0) {
      this.showCategoryDropdown = true;
    }
  }

  onCategoryBlur(): void {
    setTimeout(() => {
      this.showCategoryDropdown = false;
    }, 200);
  }

  clearCategorySelection(): void {
    this.productFilter.categoryId = null;
    this.categorySearchText = '';
    this.filteredCategories = [];
    this.showCategoryDropdown = false;
  }

  async goToProductPage(page: number) {
    this.productFilter.page = page;
    await this.loadProducts();
  }

  async refreshProducts() {
    await this.loadProducts();
  }

  get productTotalPages(): number {
    return Math.ceil(this.productTotal / this.productFilter.limit);
  }

  private async loadCategories() {
    try {
      this.categories = await this.catalogsSvc.listCategories().toPromise() || [];
      this.categoryMap.clear();
      this.categories.forEach((c) => this.categoryMap.set(c.id, c));
    } catch {
      this.showToast('error', 'No se pudieron cargar categorías (referencia)');
    }
  }

  // ---- Paginación de Categorías ----
  private async loadPagedCategories() {
    try {
      this.categoryLoading = true;
      const res = await this.catalogsSvc.listCategoriesWithFilter(this.categoryFilter).toPromise();
      this.pagedCategories = res?.data ?? [];
      this.categoryTotal = res?.total ?? 0;
    } catch {
      this.showToast('error', 'No se pudieron cargar categorías paginadas');
    } finally {
      this.categoryLoading = false;
    }
  }

  async applyCategoryFilters() {
    this.categoryFilter.page = 1;
    await this.loadPagedCategories();
  }

  async clearCategoryFilters() {
    this.categoryFilter = { search: '', page: 1, limit: 20 };
    await this.loadPagedCategories();
  }

  async goToCategoryPage(page: number) {
    this.categoryFilter.page = page;
    await this.loadPagedCategories();
  }

  async refreshCategories() {
    await this.loadPagedCategories();
  }

  get categoryTotalPages(): number {
    return Math.ceil(this.categoryTotal / this.categoryFilter.limit);
  }

  private async loadUnits() {
    try {
      this.units = await this.catalogsSvc.listUnits().toPromise() || [];
    } catch {
      this.showToast('error', 'No se pudieron cargar unidades (referencia)');
    }
  }

  // ---- Paginación de Unidades ----
  private async loadPagedUnits() {
    try {
      this.unitLoading = true;
      const res = await this.catalogsSvc.listUnitsWithFilter(this.unitFilter).toPromise();
      this.pagedUnits = res?.data ?? [];
      this.unitTotal = res?.total ?? 0;
    } catch {
      this.showToast('error', 'No se pudieron cargar unidades paginadas');
    } finally {
      this.unitLoading = false;
    }
  }

  async applyUnitFilters() {
    this.unitFilter.page = 1;
    await this.loadPagedUnits();
  }

  async clearUnitFilters() {
    this.unitFilter = { search: '', page: 1, limit: 20 };
    await this.loadPagedUnits();
  }

  async goToUnitPage(page: number) {
    this.unitFilter.page = page;
    await this.loadPagedUnits();
  }

  async refreshUnits() {
    await this.loadPagedUnits();
  }

  get unitTotalPages(): number {
    return Math.ceil(this.unitTotal / this.unitFilter.limit);
  }

  private async loadStock() {
    try {
      this.stockLoading = true;
      const res = await this.stockSvc.listPaged(this.stockFilters).toPromise();
      this.pagedStock = res?.data ?? [];
      this.stockTotal = res?.total ?? 0;

      // La pre-carga de lotes no es necesaria porque ya están adjuntos al backend en la respuesta
    } catch {
      this.showToast('error', 'No se pudo cargar el stock');
    } finally {
      this.stockLoading = false;
    }
  }

  async loadStockMetrics() {
    try {
      // Load metrics WITHOUT low_stock filter so counts always reflect all data
      const metricsFilters = { ...this.stockFilters };
      delete metricsFilters.low_stock;
      delete metricsFilters.page;
      delete metricsFilters.limit;
      this.stockMetrics = await this.stockSvc.getMetrics(metricsFilters).toPromise();
    } catch {
      console.error('Error cargando métricas de stock');
    }
  }

  // --- Métricas clickables ---
  activeMetricFilter: string | null = null;

  onMetricClick(metric: string) {
    if (this.activeMetricFilter === metric) {
      // Toggle off: quitar filtro
      this.activeMetricFilter = null;
      this.stockFilters.low_stock = undefined;
      this.stockFilters.expiration_status = 'ALL';
    } else {
      this.activeMetricFilter = metric;
      if (metric === 'lowStock') {
        this.stockFilters.low_stock = 'true';
        this.stockFilters.expiration_status = 'ALL';
      } else if (metric === 'expiring') {
        this.stockFilters.low_stock = undefined;
        this.stockFilters.expiration_status = 'NEXT_30';
      }
    }
    this.stockFilters.page = 1;
    this.loadStock();
  }

  // --- Autocomplete Categorías Stock ---
  stockCategorySearchText: string = '';
  showStockCategoryDropdown: boolean = false;
  filteredStockCategories: any[] = [];

  onStockCategorySearch() {
    this.showStockCategoryDropdown = true;
    const search = this.stockCategorySearchText.toLowerCase();
    this.filteredStockCategories = this.categories.filter(c => c.name.toLowerCase().includes(search));
  }

  onStockCategoryFocus() {
    this.showStockCategoryDropdown = true;
    if (!this.stockCategorySearchText) {
      this.filteredStockCategories = [...this.categories];
    }
  }

  onStockCategoryBlur() {
    setTimeout(() => {
      this.showStockCategoryDropdown = false;
    }, 200);
  }

  selectStockCategory(cat: any) {
    this.stockCategorySearchText = cat.name;
    this.stockFilters.category_id = cat.id;
    this.showStockCategoryDropdown = false;
    this.applyStockFilters();
  }

  clearStockCategorySelection() {
    this.stockCategorySearchText = '';
    this.stockFilters.category_id = null;
    this.filteredStockCategories = [...this.categories];
    this.applyStockFilters();
  }

  toggleStockRow(productId: number) {
    if (this.expandedStockProducts.has(productId)) {
      this.expandedStockProducts.delete(productId);
    } else {
      this.expandedStockProducts.add(productId);
    }
  }

  onDatePresetStockChange(preset: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (preset === 'today') {
      this.stockFilters.updated_from = today.toISOString().split('T')[0];
      this.stockFilters.updated_to = end.toISOString().split('T')[0];
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      this.stockFilters.updated_from = y.toISOString().split('T')[0];
      this.stockFilters.updated_to = y.toISOString().split('T')[0];
    } else if (preset === 'last7days') {
      const s = new Date(today);
      s.setDate(s.getDate() - 7);
      this.stockFilters.updated_from = s.toISOString().split('T')[0];
      this.stockFilters.updated_to = end.toISOString().split('T')[0];
    } else if (preset === 'last30days') {
      const s = new Date(today);
      s.setDate(s.getDate() - 30);
      this.stockFilters.updated_from = s.toISOString().split('T')[0];
      this.stockFilters.updated_to = end.toISOString().split('T')[0];
    } else if (preset === 'all') {
      this.stockFilters.updated_from = '';
      this.stockFilters.updated_to = '';
    }

    if (preset !== 'custom') {
      this.applyStockFilters();
    }
  }

  async applyStockFilters() {
    this.stockFilters.page = 1;
    await this.loadStock();
    await this.loadStockMetrics();
  }

  async clearStockFilters() {
    this.datePresetStock = 'all';
    this.stockCategorySearchText = '';
    this.activeMetricFilter = null;
    this.stockFilters = {
      search: '',
      category_id: null,
      updated_from: '',
      updated_to: '',
      expiration_status: 'ALL',
      low_stock: undefined,
      page: 1,
      limit: 20
    };
    await this.loadStock();
    await this.loadStockMetrics();
  }

  async goToStockPage(page: number) {
    this.stockFilters.page = page;
    await this.loadStock();
  }

  async refreshStock() {
    await this.loadStock();
    await this.loadStockMetrics();
  }

  get stockTotalPages(): number {
    return Math.ceil(this.stockTotal / (this.stockFilters.limit || 20));
  }


  async loadKardex() {
    try {
      this.kardexLoading = true;
      const res = await this.kardexSvc.list(this.kardexFilters).toPromise();
      this.pagedKardex = res?.data ?? [];
      this.kardexTotal = res?.total ?? 0;
    } catch {
      this.showToast('error', 'No se pudo cargar el kardex');
    } finally {
      this.kardexLoading = false;
    }
  }

  private async loadCounts() {
    try {
      this.counts = await this.countsSvc.list().toPromise();
    } catch {
      this.showToast('error', 'No se pudieron cargar los conteos');
    }
  }

  // =========================================================
  // OPERACIONES - SELECTOR Y AUTOCOMPLETE
  // =========================================================

  // --- Autocomplete Producto para Entrada ---
  entryProductSearchText: string = '';
  showEntryProductDropdown: boolean = false;
  filteredEntryProducts: any[] = [];
  entryProductSearchLoading = false;

  onEntryProductSearch() {
    this.showEntryProductDropdown = true;
    this.scheduleOperationProductSearch('entry', this.entryProductSearchText);
  }
  onEntryProductFocus() {
    this.showEntryProductDropdown = true;
    if (this.hasMinOperationProductSearchChars(this.entryProductSearchText)) {
      this.scheduleOperationProductSearch('entry', this.entryProductSearchText);
    }
  }
  onEntryProductBlur() {
    setTimeout(() => { this.showEntryProductDropdown = false; }, 200);
  }
  async selectEntryProduct(product: any) {
    this.cancelOperationProductSearch('entry');
    this.setOperationProductSearchLoading('entry', false);
    this.entryProductSearchText = product.sku + ' - ' + product.name;
    this.entryForm.product_id = product.id;
    this.selectedProductEntry = product;
    this.showEntryProductDropdown = false;

    try {
      const stockInfo = await this.stockSvc.getCurrentStock(product.id).toPromise();
      this.selectedProductEntry!.stock_qty = stockInfo?.total_qty ?? 0;
      this.selectedProductEntry!.avg_cost = stockInfo?.avg_cost ?? 0;
    } catch {
      this.selectedProductEntry!.stock_qty = 0;
      this.selectedProductEntry!.avg_cost = 0;
    }

    this.onProductChangeEntry();
  }
  clearEntryProductSelection() {
    this.cancelOperationProductSearch('entry');
    this.entryProductSearchText = '';
    this.entryForm.product_id = null;
    this.selectedProductEntry = null;
    this.filteredEntryProducts = [];
    this.showEntryProductDropdown = false;
  }

  // --- Autocomplete Producto para Salida ---
  exitProductSearchText: string = '';
  showExitProductDropdown: boolean = false;
  filteredExitProducts: any[] = [];
  exitProductSearchLoading = false;

  onExitProductSearch() {
    this.showExitProductDropdown = true;
    this.scheduleOperationProductSearch('exit', this.exitProductSearchText);
  }
  onExitProductFocus() {
    this.showExitProductDropdown = true;
    if (this.hasMinOperationProductSearchChars(this.exitProductSearchText)) {
      this.scheduleOperationProductSearch('exit', this.exitProductSearchText);
    }
  }
  onExitProductBlur() {
    setTimeout(() => { this.showExitProductDropdown = false; }, 200);
  }
  async selectExitProduct(product: any) {
    this.cancelOperationProductSearch('exit');
    this.setOperationProductSearchLoading('exit', false);
    this.exitProductSearchText = product.sku + ' - ' + product.name;
    this.exitForm.product_id = product.id;
    this.selectedProductExit = product;
    this.showExitProductDropdown = false;

    try {
      const stockInfo = await this.stockSvc.getCurrentStock(product.id).toPromise();
      this.selectedProductExit!.stock_qty = stockInfo?.total_qty ?? 0;
      this.selectedProductExit!.avg_cost = stockInfo?.avg_cost ?? 0;
    } catch {
      this.selectedProductExit!.stock_qty = 0;
      this.selectedProductExit!.avg_cost = 0;
    }

    this.onProductChangeExit();
  }
  clearExitProductSelection() {
    this.cancelOperationProductSearch('exit');
    this.exitProductSearchText = '';
    this.exitForm.product_id = null;
    this.selectedProductExit = null;
    this.availableLotsForExit = [];
    this.availableSerialsForExit = [];
    this.filteredExitProducts = [];
    this.showExitProductDropdown = false;
  }

  // --- Autocomplete Producto para Ajuste ---
  adjProductSearchText: string = '';
  showAdjProductDropdown: boolean = false;
  filteredAdjProducts: any[] = [];
  adjProductSearchLoading = false;

  onAdjProductSearch() {
    this.showAdjProductDropdown = true;
    this.scheduleOperationProductSearch('adjustment', this.adjProductSearchText);
  }
  onAdjProductFocus(): void {
    this.showAdjProductDropdown = true;
    if (this.hasMinOperationProductSearchChars(this.adjProductSearchText)) {
      this.scheduleOperationProductSearch('adjustment', this.adjProductSearchText);
    }
  }
  onAdjProductBlur(): void {
    setTimeout(() => { this.showAdjProductDropdown = false; }, 200);
  }
  async selectAdjProduct(product: any) {
    this.cancelOperationProductSearch('adjustment');
    this.setOperationProductSearchLoading('adjustment', false);
    this.adjProductSearchText = product.sku + ' - ' + product.name;
    this.adjustmentForm.product_id = product.id;
    this.selectedProductAdjustment = product;
    this.showAdjProductDropdown = false;

    try {
      const stockInfo = await this.stockSvc.getCurrentStock(product.id).toPromise();
      this.selectedProductAdjustment!.stock_qty = stockInfo?.total_qty ?? 0;
      this.selectedProductAdjustment!.avg_cost = stockInfo?.avg_cost ?? 0;
    } catch {
      this.selectedProductAdjustment!.stock_qty = 0;
      this.selectedProductAdjustment!.avg_cost = 0;
    }

    this.onProductChangeAdjustment();
  }
  clearAdjProductSelection() {
    this.cancelOperationProductSearch('adjustment');
    this.adjProductSearchText = '';
    this.adjustmentForm.product_id = null;
    this.selectedProductAdjustment = null;
    this.filteredAdjProducts = [];
    this.showAdjProductDropdown = false;
  }

  private scheduleOperationProductSearch(mode: OperationProductSearchMode, searchText: string): void {
    const normalizedQuery = this.normalizeOperationProductSearchQuery(searchText);
    this.cancelOperationProductSearch(mode);

    if (!this.hasMinOperationProductSearchChars(normalizedQuery)) {
      this.setOperationProductSearchLoading(mode, false);
      this.setOperationFilteredProducts(mode, []);
      return;
    }

    const cachedProducts = this.operationProductSearchCache.get(normalizedQuery);
    if (cachedProducts) {
      this.setOperationProductSearchLoading(mode, false);
      this.setOperationFilteredProducts(mode, cachedProducts);
      return;
    }

    this.setOperationProductSearchLoading(mode, true);
    const requestVersion = ++this.operationProductSearchRequestVersion[mode];

    this.operationProductSearchSubscriptions[mode] = timer(this.operationProductSearchDebounceMs).subscribe(async () => {
      try {
        const response = await this.productsSvc.listWithFilter({
          search: normalizedQuery,
          page: 1,
          limit: this.operationProductSearchLimit,
        }).toPromise();
        const products = response?.data ?? [];

        this.operationProductSearchCache.set(normalizedQuery, products);
        this.storeProductsInMap(products);

        if (this.operationProductSearchRequestVersion[mode] !== requestVersion) return;
        this.setOperationFilteredProducts(mode, products);
      } catch {
        if (this.operationProductSearchRequestVersion[mode] !== requestVersion) return;
        this.setOperationFilteredProducts(mode, []);
        this.showToast('error', 'No se pudieron buscar productos');
      } finally {
        if (this.operationProductSearchRequestVersion[mode] === requestVersion) {
          this.setOperationProductSearchLoading(mode, false);
        }
      }
    });
  }

  private cancelOperationProductSearch(mode: OperationProductSearchMode): void {
    this.operationProductSearchRequestVersion[mode]++;
    this.operationProductSearchSubscriptions[mode]?.unsubscribe();
    delete this.operationProductSearchSubscriptions[mode];
    this.setOperationProductSearchLoading(mode, false);
  }

  private normalizeOperationProductSearchQuery(query: string): string {
    return (query || '').trim().toLowerCase();
  }

  hasMinOperationProductSearchChars(searchText: string): boolean {
    return this.normalizeOperationProductSearchQuery(searchText).length >= this.operationProductSearchMinChars;
  }

  private setOperationFilteredProducts(mode: OperationProductSearchMode, products: Product[]): void {
    const nextProducts = [...products];

    if (mode === 'entry') this.filteredEntryProducts = nextProducts;
    if (mode === 'exit') this.filteredExitProducts = nextProducts;
    if (mode === 'adjustment') this.filteredAdjProducts = nextProducts;
  }

  private setOperationProductSearchLoading(mode: OperationProductSearchMode, loading: boolean): void {
    if (mode === 'entry') this.entryProductSearchLoading = loading;
    if (mode === 'exit') this.exitProductSearchLoading = loading;
    if (mode === 'adjustment') this.adjProductSearchLoading = loading;
  }

  private storeProductsInMap(products: Product[]): void {
    products.forEach((product) => this.productMap.set(product.id, product));
  }

  // --- Contexto del producto seleccionado ---
  getProductContextInfo(productId: number | null): any {
    if (!productId) return null;
    const product = this.productMap.get(productId);
    if (!product) return null;
    // Find stock info from pagedStock
    const stockItem = this.pagedStock.find(s => s.product_id === productId);
    return {
      name: product.name,
      sku: product.sku,
      category: this.getCategoryName(product.category_id),
      isSerialized: product.is_serialized,
      managesExpiration: product.manages_expiration,
      stockQty: stockItem?.total_qty ?? 0,
      avgCost: stockItem?.avg_cost ?? 0,
      totalCost: stockItem?.total_cost ?? 0,
      lotsCount: stockItem?.lots?.length ?? 0
    };
  }

  // =========================================================
  // OPERACIONES - ENTRADA
  // =========================================================
  onProductChangeEntry(): void {
    // Decoupled: Product is already set by selectEntryProduct
  }

  async registerEntry(): Promise<void> {
    if (!this.entryForm.product_id || this.entryForm.qty <= 0 || this.entryForm.unit_cost <= 0) {
      this.showToast('error', 'Complete todos los campos requeridos');
      return;
    }
    const p = this.getProductBySku(this.entryForm.product_id);
    if (!p) return;

    if (p.manages_expiration && (!this.entryForm.lot_code || !this.entryForm.expiration_date)) {
      this.showToast('error', 'Debe ingresar lote y fecha de vencimiento');
      return;
    }
    if (p.is_serialized && this.entrySerialCodes.length !== Number(this.entryForm.qty)) {
      this.showToast('error', `Debes agregar exactamente ${this.entryForm.qty} serial(es)`);
      return;
    }

    try {
      let lotId: number | null = null;
      if (p.manages_expiration) {
        const lot = await this.lotsSvc.create({
          product_id: this.entryForm.product_id!,
          lot_code: this.entryForm.lot_code!,
          expiration_date: this.entryForm.expiration_date!,
          supplier_id: Number(this.entryForm.supplier_id) ?? undefined,
        }).toPromise();
        lotId = lot.id;
        const list = this.lotsByProduct.get(p.id) ?? [];
        const norm = { id: lot.id, lot_code: lot.lot_code, expiration_date: lot.expiration_date ?? null };
        this.lotsByProduct.set(p.id, [norm, ...list]);
        this.lotIdMap.set(lot.id, norm);
      }

      await this.movementSvc.entry({
        product_id: this.entryForm.product_id!,
        qty: this.entryForm.qty,
        unit_cost: this.entryForm.unit_cost,
        lot_id: lotId ?? undefined,
        supplier_id: Number(this.entryForm.supplier_id) ?? undefined,
        notes: this.entryForm.notes || undefined,
        serial_codes: p.is_serialized ? this.entrySerialCodes : undefined,
        user_created: this.currentUserName
      }).toPromise();

      await Promise.all([this.loadStock(), this.loadKardex()]);
      this.showToast('success', 'Entrada registrada');
      this.resetEntryForm();
      this.entrySerialCodes = [];
    } catch (e: any) {
      this.showToast('error', e?.error?.message || 'No se pudo registrar la entrada');
    }
  }


  private resetEntryForm() {
    this.entryForm = {
      product_id: null,
      qty: 0,
      unit_cost: 0,
      lot_code: '',
      expiration_date: '',
      serials: '',
      notes: '',
      supplier_id: null
    };
    this.selectedProductEntry = null;
  }

  // =========================================================
  // OPERACIONES - SALIDA
  // =========================================================
  async onProductChangeExit(): Promise<void> {
    // Decoupled: Product is already set by selectExitProduct
    this.availableLotsForExit = [];
    this.availableSerialsForExit = [];
    this.exitSelectedSerialIds = [];
    this.exitForm.lot_id = null;

    // Reinicia el modo auto al cambiar de producto
    this.exitAutoSelect = true;

    if (this.selectedProductExit?.manages_expiration) {
      await this.ensureLotsForProduct(this.selectedProductExit.id);
      const fefo = this.getLotsWithStockFEFO(this.selectedProductExit.id);
      this.availableLotsForExit = fefo.map(l => ({ id: l.id, lot_code: l.lot_code, expiration_date: l.expiration_date, qty_on_hand: l.qty_on_hand }));
      this.exitForm.lot_id = this.availableLotsForExit[0]?.id ?? null;
    }

    await this.loadAvailableSerialsForExit();
    this.maybeAutoPickExitSerials(); // <-- aquí
  }

  async loadAvailableSerialsForExit(): Promise<void> {
    this.availableSerialsForExit = [];
    this.exitSelectedSerialIds = [];
    const p = this.selectedProductExit;
    if (!p || !p.is_serialized) return;

    try {
      // ⬇️ Trae TODOS los seriales en stock del producto (sin filtrar por lote).
      const rows = await this.serialsSvc.list({
        product_id: p.id,
        status: 'IN_STOCK'
      }).toPromise();

      this.availableSerialsForExit = (rows ?? []).map(r => ({
        id: r.id,
        serial_code: r.serial_code,
        lot_id: r.lot_id ?? null,
      }));

      // Si maneja vencimiento, ordena por expiración (FEFO) para que la autoselección sea coherente.
      if (p.manages_expiration) {
        await this.ensureLotsForProduct(p.id);
        this.availableSerialsForExit.sort((a, b) => {
          const ea = a.lot_id ? this.lotIdMap.get(a.lot_id)?.expiration_date : null;
          const eb = b.lot_id ? this.lotIdMap.get(b.lot_id)?.expiration_date : null;
          const da = ea ? this.toUtcDateOnly(ea)!.getTime() : Number.POSITIVE_INFINITY;
          const db = eb ? this.toUtcDateOnly(eb)!.getTime() : Number.POSITIVE_INFINITY;
          return da - db;
        });
      }

      // Modo auto: seleccionar N
      this.maybeAutoPickExitSerials();
    } catch {
      this.showToast('error', 'No se pudieron cargar los seriales disponibles');
    }
  }


  async registerExit(): Promise<void> {
    if (!this.exitForm.product_id || this.exitForm.qty <= 0) {
      this.showToast('error', 'Complete todos los campos requeridos');
      return;
    }
    const p = this.getProductBySku(this.exitForm.product_id);
    if (!p) return;

    try {

      if (p.is_serialized) {
        if (this.exitSelectedSerialIds.length !== Number(this.exitForm.qty)) {
          this.showToast('error', `Debes seleccionar exactamente ${this.exitForm.qty} serial(es)`);
          return;
        }
        // Si maneja vencimiento, puedes además validar que los seleccionados pertenezcan al lote elegido (opcional)
      }
      // 1) Asegura lotes y arma la cola FEFO
      if (p.manages_expiration) {
        await this.ensureLotsForProduct(p.id);
        const fefo = this.getLotsWithStockFEFO(p.id);

        if (fefo.length === 0) {
          this.showToast('error', 'No hay lotes disponibles con stock');
          return;
        }

        // Prioriza el lote elegido por el usuario (si hay)
        let ordered = [...fefo];
        if (this.exitForm.lot_id) {
          const idx = ordered.findIndex(l => l.id === this.exitForm.lot_id);
          if (idx > 0) {
            const first = ordered.splice(idx, 1)[0];
            ordered.unshift(first);
          }
        }

        // Validación seriales (misma que ya haces arriba)
        if (p.is_serialized) {
          if (this.exitSelectedSerialIds.length !== Number(this.exitForm.qty)) {
            this.showToast('error', `Debes seleccionar exactamente ${this.exitForm.qty} serial(es)`);
            return;
          }
        }

        // Agrupa los seriales seleccionados por lote para repartirlos en cada salida parcial
        const selectedByLot = new Map<number, number[]>();
        if (p.is_serialized) {
          for (const sid of this.exitSelectedSerialIds) {
            const s = this.availableSerialsForExit.find(x => x.id === sid);
            const lotId = s?.lot_id ?? null;
            if (lotId == null) continue; // por seguridad
            const arr = selectedByLot.get(lotId) ?? [];
            arr.push(sid);
            selectedByLot.set(lotId, arr);
          }
        }
        // 3) Capacidad total y cantidad a despachar
        let remaining = this.exitForm.qty;
        const totalAvailable = ordered.reduce((a, l) => a + l.qty_on_hand, 0);
        if (totalAvailable <= 0) {
          this.showToast('error', 'No hay stock disponible por lotes');
          return;
        }
        // 4) Descuenta en varios lotes sin permitir negativos
        for (const l of ordered) {
          if (remaining <= 0) break;

          const take = Math.min(remaining, l.qty_on_hand);
          if (take <= 0) continue;

          // Toma los seriales de ESTE lote (si el producto es serializado)
          const serialIdsForLot = p.is_serialized
            ? (selectedByLot.get(l.id) ?? []).slice(0, take)
            : undefined;

          // Si el producto es serializado, asegúrate de mandar exactamente 'take' seriales
          if (p.is_serialized && (!serialIdsForLot || serialIdsForLot.length !== take)) {
            this.showToast('error', `La selección de seriales no coincide con el reparto por lote (${l.lot_code}).`);
            return;
          }

          await this.movementSvc.exit({
            product_id: this.exitForm.product_id!,
            qty: take,
            reason_code: this.exitForm.reason_code,
            lot_id: l.id,
            serial_ids: serialIdsForLot,          // ⬅️ AHORA SÍ SE ENVÍA
            notes: this.exitForm.notes || undefined,
            user_created: this.currentUserName
          }).toPromise();

          // “Consume” los seriales usados de ese lote
          if (p.is_serialized && serialIdsForLot) {
            const rest = (selectedByLot.get(l.id) ?? []).slice(serialIdsForLot.length);
            selectedByLot.set(l.id, rest);
          }

          remaining -= take;
        }
        // 5) Aviso si no alcanzó
        if (remaining > 0) {
          this.showToast('warning', `Stock insuficiente por lotes. Faltó despachar ${remaining}.`);
        }
      } else {
        // Producto sin vencimiento: salida normal
        await this.movementSvc.exit({
          product_id: this.exitForm.product_id!,
          qty: this.exitForm.qty,
          reason_code: this.exitForm.reason_code,
          serial_ids: p.is_serialized ? this.exitSelectedSerialIds : undefined,
          notes: this.exitForm.notes || undefined,
          user_created: this.currentUserName
        }).toPromise();
      }

      await Promise.all([this.loadStock(), this.loadKardex()]);
      this.showToast('success', 'Salida registrada');
      this.resetExitForm();
    } catch (e: any) {
      this.showToast('error', e?.error?.message || 'No se pudo registrar la salida');
    }
  }


  private resetExitForm() {
    this.exitForm = {
      product_id: null,
      qty: 0,
      reason_code: 'VENTA',
      lot_id: null,
      serial_id: null,
      notes: '',
    };
    this.selectedProductExit = null;
    this.availableLotsForExit = [];
    this.availableSerialsForExit = [];
  }

  // =========================================================
  // OPERACIONES - AJUSTE
  // =========================================================
  async registerAdjustment(): Promise<void> {
    if (!this.adjustmentForm.product_id || this.adjustmentForm.qty === 0 || !this.adjustmentForm.notes.trim()) {
      this.showToast('error', 'Complete todos los campos requeridos');
      return;
    }
    const p = this.getProductBySku(this.adjustmentForm.product_id);
    if (!p) return;

    if (p.manages_expiration && !this.adjustmentForm.lot_id) {
      this.showToast('error', 'Debe seleccionar el lote para el ajuste');
      return;
    }

    // Validaciones seriales
    if (p.is_serialized) {
      const q = Number(this.adjustmentForm.qty);
      if (q > 0 && this.adjSerialCodes.length !== q) {
        this.showToast('error', `Debes agregar exactamente ${q} serial(es) para el ajuste positivo`);
        return;
      }
      if (q < 0 && this.adjSelectedSerialIds.length !== Math.abs(q)) {
        this.showToast('error', `Debes seleccionar exactamente ${Math.abs(q)} serial(es) para el ajuste negativo`);
        return;
      }
    }

    try {
      await this.movementSvc.adjustment({
        product_id: this.adjustmentForm.product_id!,
        qty: this.adjustmentForm.qty,
        reason_code: 'AJUSTE_INV',
        lot_id: this.adjustmentForm.lot_id ?? undefined,
        notes: this.adjustmentForm.notes || undefined,
        serial_codes: p.is_serialized && this.adjustmentForm.qty > 0 ? this.adjSerialCodes : undefined,
        serial_ids: p.is_serialized && this.adjustmentForm.qty < 0 ? this.adjSelectedSerialIds : undefined,
        user_created: this.currentUserName
      }).toPromise();

      await Promise.all([this.loadStock(), this.loadKardex()]);
      this.showToast('success', 'Ajuste registrado');
      this.resetAdjustmentForm();
      this.adjSerialCodes = [];
      this.adjSelectedSerialIds = [];
    } catch (e: any) {
      this.showToast('error', e?.error?.message || 'No se pudo registrar el ajuste');
    }
  }


  private resetAdjustmentForm() {
    this.adjustmentForm = { product_id: null, lot_id: null, qty: 0, notes: '' };
    this.selectedProductAdjustment = null;
  }


  // =========================================================
  // STOCK (tabla)
  // =========================================================
  get filteredStock(): any[] {
    return this.pagedStock;
  }

  isLowStock(item: any): boolean {
    const min = item.product?.reorder_point || 0;
    return item.total_qty <= min;
  }

  isExpiringSoon(item: any): boolean {
    if (!item.lots || item.lots.length === 0) return false;
    const now = new Date();
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);

    return item.lots.some((l: any) => {
      if (!l.lot || !l.lot.expirationDate) return false;
      if (l.qty_on_hand <= 0) return false;
      const exp = new Date(l.lot.expirationDate);
      return exp <= next30;
    });
  }

  // =========================================================
  // LOCK / UNLOCK (solo UI)
  // =========================================================
  lockInventory(): void {
    if (confirm('¿Detener el almacén para conteo? Esto bloqueará todas las operaciones.')) {
      this.isLocked = true;
      this.lockReason = 'Detenido para conteo cíclico';
      this.showToast('warning', 'Almacén detenido.');
    }
  }

  unlockInventory(): void {
    if (confirm('¿Reactivar el almacén?')) {
      this.isLocked = false;
      this.lockReason = '';
      this.showToast('success', 'Almacén reactivado.');
    }
  }

  // =========================================================
  // CONTEOS
  // =========================================================
  getStepIndex(status?: string): number {
    if (!status) return -1;
    const map: Record<string, number> = { DRAFT: 0, FROZEN: 1, COUNTING: 2, REVIEW: 3, POSTED: 4 };
    return map[status] ?? -1;
  }

  async createDraftCount(): Promise<void> {
    try {
      const c = await this.countsSvc.create({ description: 'Conteo cíclico', createdBy: this.currentUserName }).toPromise();
      this.counts.unshift(c);
      this.selectCount(c);
      this.showToast('success', 'Conteo creado (Borrador). Ahora puedes congelarlo.');
    } catch {
      this.showToast('error', 'No se pudo crear el conteo');
    }
  }

  async freezeSelectedCount(): Promise<void> {
    if (!this.selectedCount) return;
    if (this.selectedCount.status !== 'DRAFT') {
      this.showToast('error', 'Solo puedes congelar un conteo en Borrador');
      return;
    }
    if (!confirm('¿Congelar el conteo? Se tomará snapshot y se bloqueará el almacén.')) return;

    try {
      const updated = await this.countsSvc.freeze(this.selectedCount.id).toPromise();
      // Bloqueamos almacén a nivel UI
      this.isLocked = true;
      this.lockReason = 'Detenido para conteo cíclico';
      await this.refreshCount(updated);
      this.showToast('success', 'Conteo congelado.');
    } catch {
      this.showToast('error', 'No se pudo congelar el conteo');
    }
  }

  async startCounting(): Promise<void> {
    if (!this.selectedCount || this.selectedCount.status !== 'FROZEN') {
      this.showToast('error', 'Seleccione un conteo congelado');
      return;
    }
    try {
      const updated = await this.countsSvc.start(this.selectedCount.id).toPromise();
      await this.refreshCount(updated);
      this.showToast('success', 'Conteo iniciado');
    } catch {
      this.showToast('error', 'No se pudo iniciar el conteo');
    }
  }

  async reviewDifferences(): Promise<void> {
    if (!this.selectedCount || this.selectedCount.status !== 'COUNTING') {
      this.showToast('error', 'El conteo debe estar en proceso');
      return;
    }
    try {
      const updated = await this.countsSvc.review(this.selectedCount.id).toPromise();
      await this.refreshCount(updated);               // recarga cabecera + snaps/entries
      await this.loadPersistedDifferences(updated.id); // lee lo persistido
      this.showToast('info', 'Diferencias calculadas y guardadas');
    } catch (e: any) {
      // Si ya estaba en REVIEW, de todas formas carga lo persistido
      await this.reloadCountData(this.selectedCount!.id);
      await this.loadPersistedDifferences(this.selectedCount!.id);
      this.showToast('info', 'El conteo ya estaba en revisión');
    }
  }



  async postAdjustments(): Promise<void> {
    if (!this.selectedCount || this.selectedCount.status !== 'REVIEW') {
      this.showToast('error', 'El conteo debe estar en revisión');
      return;
    }
    if (!confirm('¿Publicar los ajustes?')) return;

    try {
      const updated = await this.countsSvc.post(this.selectedCount.id).toPromise();
      await Promise.all([this.refreshCount(updated), this.loadStock(), this.loadKardex()]);
      this.isLocked = false;
      this.showToast('success', 'Ajustes publicados');
    } catch {
      this.showToast('error', 'No se pudieron publicar los ajustes');
    }
  }

  async cancelCount(): Promise<void> {
    if (!this.selectedCount) return;
    if (!confirm('¿Cancelar este conteo?')) return;

    try {
      const updated = await this.countsSvc.cancel(this.selectedCount.id).toPromise();
      await this.refreshCount(updated);
      this.isLocked = false;
      this.showToast('info', 'Conteo cancelado');
    } catch {
      this.showToast('error', 'No se pudo cancelar el conteo');
    }
  }

  async selectCount(c: Count): Promise<void> {
    this.selectedCount = c;
    this.serialDiffsCache.clear(); // invalidate cache al cambiar de conteo
    await this.reloadCountData(c.id);
  }

  private async refreshCount(updated: Count) {
    // Actualiza lista y selección
    const idx = this.counts.findIndex((x) => x.id === updated.id);
    if (idx >= 0) this.counts[idx] = updated;
    this.selectedCount = updated;
    await this.reloadCountData(updated.id);
  }

  private async reloadCountData(id: number) {
    try {
      const fresh = await this.countsSvc.get(id).toPromise();
      this.selectedCount = fresh;

      this.currentCountSnapshots = await this.countsSvc.getSnapshots(id).toPromise();
      this.currentCountEntries = await this.countsSvc.getEntries(id).toPromise();

      if (this.selectedCount?.status === 'REVIEW') {
        await this.loadPersistedDifferences(id);
      } else {
        this.differences = [];
        this.differenceSummary = { surplus: 0, shortage: 0, net: 0 };
      }
    } catch {
      this.currentCountSnapshots = this.currentCountSnapshots ?? [];
      this.currentCountEntries = this.currentCountEntries ?? [];
    }
  }


  // onCountProductChange(): void {
  //   this.selectedCountProduct = this.countEntryForm.product_id
  //     ? this.productMap.get(this.countEntryForm.product_id) ?? null
  //     : null;
  // }

  async onCountProductChange(): Promise<void> {
    this.selectedCountProduct = this.countEntryForm.product_id
      ? this.productMap.get(this.countEntryForm.product_id) ?? null
      : null;

    if (this.selectedCountProduct?.manages_expiration) {
      await this.ensureLotsForProduct(this.selectedCountProduct.id);
    }
    this.countEntryForm.lot_id = null;

    // reset seriales de conteo al cambiar producto
    this.countEntrySerialCodes = [];
    this.countEntrySerialInput = '';
  }




  async addCountEntry(): Promise<void> {
    if (!this.selectedCount || !this.countEntryForm.product_id) {
      this.showToast('error', 'Complete los campos requeridos'); return;
    }
    const p = this.productMap.get(this.countEntryForm.product_id);
    const qty = Number(this.countEntryForm.qty_counted || 0);

    // 🔁 NUEVO: si es serializado y el usuario ingresó seriales,
    // desviamos al flujo "smart" (resolver por servicio y agrupar por lote).
    if (p?.is_serialized && this.countEntrySerialCodes.length > 0) {
      await this.resolveSerialsBeforeAdd();
      return;
    }

    // (comportamiento previo, mantiene tu validación cuando se usa qty sin seriales)
    if (p?.is_serialized && qty > 0 && this.countEntrySerialCodes.length !== qty) {
      this.showToast('error', `Debes agregar exactamente ${qty} serial(es)`); return;
    }

    try {
      await this.countsSvc.addEntry(this.selectedCount.id, {
        product_id: this.countEntryForm.product_id,
        lot_id: this.countEntryForm.lot_id ?? null,
        qty_counted: qty,
        user: this.currentUserName,
        serial_codes: p?.is_serialized ? this.countEntrySerialCodes : undefined, // ← se mantiene por compatibilidad
      }).toPromise();

      await this.reloadCountData(this.selectedCount.id);
      this.resetCountEntryForm();
      this.countEntrySerialCodes = [];
      this.showToast('success', 'Conteo agregado');
    } catch {
      this.showToast('error', 'No se pudo agregar la entrada');
    }
  }



  /**
 * 1) Pregunta al backend por cada serial (existe/no existe y lote).
 * 2) Si existen: los agrupa por lote y llama addEntry por lote.
 * 3) Si no existen: los guarda como "sobrantes" para que asignes lote manual luego.
 */
  private async resolveSerialsBeforeAdd(): Promise<void> {
    const codes = this.countEntrySerialCodes || [];
    if (!codes.length) return;
    if (!this.selectedCount || !this.countEntryForm.product_id) return;

    // producto actual
    const p = this.productMap.get(this.countEntryForm.product_id);
    const pid = this.countEntryForm.product_id;
    const managesLots = !!p?.manages_expiration;   // ← tiene lotes/fecha
    const isSerialized = !!p?.is_serialized;

    try {
      const res = await this.serialsSvc.resolve(codes).toPromise();

      const known = (res ?? []).filter(s => s.exists && (s.lot_id != null || !managesLots));
      const unknown = (res ?? []).filter(s => !s.exists || (managesLots && s.lot_id == null));

      // 1) Agregar los CONOCIDOS
      if (known.length > 0) {
        if (managesLots) {
          // agrupar por lote si maneja vencimiento
          await this.ensureLotsForProduct(pid);
          const byLot = known.reduce((acc, s) => {
            const lid = (s.lot_id ?? null) as number | null;
            const key = String(lid ?? 'null');
            (acc[key] ||= []).push(s.serial_code);
            return acc;
          }, {} as Record<string, string[]>);

          for (const [lotKey, serials] of Object.entries(byLot)) {
            const lotId = lotKey === 'null' ? null : Number(lotKey);
            await this.countsSvc.addEntry(this.selectedCount!.id, {
              product_id: pid,
              lot_id: lotId,
              qty_counted: serials.length,
              user: this.currentUserName,
              serial_codes: serials,
            }).toPromise();
          }
        } else {
          // no maneja vencimiento: todo al mismo lote null
          const serials = known.map(k => k.serial_code);
          await this.countsSvc.addEntry(this.selectedCount!.id, {
            product_id: pid,
            lot_id: null,
            qty_counted: serials.length,
            user: this.currentUserName,
            serial_codes: serials,
          }).toPromise();
        }
      }

      // 2) ¿Qué hacemos con los DESCONOCIDOS?
      if (unknown.length > 0) {
        if (isSerialized && managesLots) {
          // 🔸 SOLO aquí pedimos asignar lote (modal)
          this.requireLotsForUnresolved = true;
          this.unresolvedSerials = unknown.map(u => ({
            serial_code: u.serial_code,
            product_id: pid,
            lot_id: null,
            lot_code: null,
          }));
          await this.ensureLotsForProduct(pid);
          this.showUnresolvedModal = true;
          this.showToast('warning', `Se detectaron ${unknown.length} serial(es) sin lote. Asigna un lote para continuar.`);
        } else if (isSerialized && !managesLots) {
          // ✔ serializado SIN lotes: los agregamos directo con lot_id null
          const serials = unknown.map(u => u.serial_code);
          await this.countsSvc.addEntry(this.selectedCount!.id, {
            product_id: pid,
            lot_id: null,
            qty_counted: serials.length,
            user: this.currentUserName,
            serial_codes: serials,
          }).toPromise();
          this.showToast('info', `Se agregaron ${serials.length} serial(es) sin lote (producto sin vencimiento).`);
        } else {
          // no serializado (con o sin lotes): este flujo no debería activarse, pero por seguridad
          const qty = unknown.length;
          await this.countsSvc.addEntry(this.selectedCount!.id, {
            product_id: pid,
            lot_id: managesLots ? (this.countEntryForm.lot_id ?? null) : null,
            qty_counted: qty,
            user: this.currentUserName,
          }).toPromise();
        }
      }

      // refrescar UI y limpiar
      await this.reloadCountData(this.selectedCount!.id);
      this.countEntrySerialCodes = [];
      this.countEntrySerialInput = '';
      this.countEntryForm.qty_counted = 0;

      // Mensaje final (solo si no quedó modal abierto)
      if (!this.showUnresolvedModal) {
        this.showToast('success', 'Seriales procesados.');
      }
    } catch (e) {
      this.showToast('error', 'Error al resolver seriales');
    }
  }



  // =========================================================
  // SERIALS SOBRANTES (modal)
  // =========================================================
  async saveUnresolvedSerials(): Promise<void> {
    if (!this.selectedCount) {
      this.showToast('error', 'No hay conteo seleccionado');
      return;
    }

    if (!this.unresolvedSerials || this.unresolvedSerials.length === 0) {
      this.showToast('info', 'No hay seriales sobrantes por asignar');
      this.showUnresolvedModal = false;
      return;
    }

    // 1️⃣ Validar que todos los seriales tengan un lote asignado
    const sinLote = this.unresolvedSerials.filter(s => !s.lot_id);
    if (sinLote.length > 0) {
      this.showToast('warning', 'Asigna un lote a todos los seriales antes de continuar');
      return;
    }

    try {
      // 2️⃣ Agrupar seriales por producto y lote
      const grupos = new Map<string, { product_id: number; lot_id: number; serials: string[] }>();

      for (const s of this.unresolvedSerials) {
        const key = `${s.product_id}:${s.lot_id}`;
        if (!grupos.has(key)) {
          grupos.set(key, { product_id: s.product_id!, lot_id: s.lot_id!, serials: [] });
        }
        grupos.get(key)!.serials.push(s.serial_code);
      }

      // 3️⃣ Guardar en el conteo cada grupo
      for (const g of grupos.values()) {
        await this.countsSvc.addEntry(this.selectedCount.id, {
          product_id: g.product_id,
          lot_id: g.lot_id,
          qty_counted: g.serials.length,
          user: this.currentUserName,
          serial_codes: g.serials,
        }).toPromise();
      }

      // 4️⃣ Recargar y limpiar
      await this.reloadCountData(this.selectedCount.id);
      this.unresolvedSerials = [];
      this.showUnresolvedModal = false;
      this.showToast('success', 'Seriales sobrantes asignados y guardados');
    } catch (e: any) {
      console.error(e);
      this.showToast('error', e?.error?.message || 'No se pudieron guardar las asignaciones');
    }
  }




  deleteCountEntry(_id: number): void {
    // No tenemos endpoint DELETE de entradas; podrías implementarlo si lo necesitas.
    this.showToast('warning', 'Eliminación de entradas no implementada en backend');
  }

  private resetCountEntryForm() {
    this.countEntryForm = { product_id: null, lot_id: null, qty_counted: 0 };
    this.selectedCountProduct = null;
  }

  requiresDoubleApproval(): boolean {
    const total = this.stock.reduce((a, s) => a + Number(s.total_cost ?? 0), 0);
    const pct = total > 0 ? Math.abs(this.differenceSummary.net) / total * 100 : 0;
    return pct > 3;
  }

  getCountStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      FROZEN: 'Congelado',
      COUNTING: 'Contando',
      REVIEW: 'Revisión',
      POSTED: 'Publicado',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }

  // =========================================================
  // KARDEX
  // =========================================================
  get filteredKardex(): Movement[] {
    return this.pagedKardex;
  }

  async applyKardexFilters(): Promise<void> {
    this.kardexFilters.page = 1;
    await this.loadKardex();
    this.showToast('info', 'Filtros aplicados');
  }

  async clearKardexFilters(): Promise<void> {
    this.kardexFilters = { dateFrom: '', dateTo: '', product_id: null, reason_code: null, page: 1, limit: 20 };
    this.datePresetKardex = 'last30days';
    this.onDatePresetKardexChange(this.datePresetKardex); // This will reload
    this.showToast('info', 'Filtros limpiados');
  }

  async goToKardexPage(page: number) {
    this.kardexFilters.page = page;
    await this.loadKardex();
  }

  async refreshKardex() {
    await this.loadKardex();
  }

  get kardexTotalPages(): number {
    return Math.ceil(this.kardexTotal / (this.kardexFilters.limit || 20));
  }

  onDatePresetKardexChange(preset: string) {
    const today = new Date();
    const formatDt = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    if (preset === 'today') {
      this.kardexFilters.dateFrom = formatDt(today);
      this.kardexFilters.dateTo = formatDt(today);
      this.applyKardexFilters();
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      this.kardexFilters.dateFrom = formatDt(yesterday);
      this.kardexFilters.dateTo = formatDt(yesterday);
      this.applyKardexFilters();
    } else if (preset === 'last7days') {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      this.kardexFilters.dateFrom = formatDt(last7);
      this.kardexFilters.dateTo = formatDt(today);
      this.applyKardexFilters();
    } else if (preset === 'last30days') {
      const last30 = new Date(today);
      last30.setDate(today.getDate() - 30);
      this.kardexFilters.dateFrom = formatDt(last30);
      this.kardexFilters.dateTo = formatDt(today);
      this.applyKardexFilters();
    }
  }

  exportKardexCsv(): void {
    let csv = 'Fecha,Tipo,Motivo,Producto,Cantidad,Costo Unit.,Costo Total,Saldo Cant.,Saldo Costo,CPP\n';
    for (const m of this.pagedKardex) {
      const p = this.getProductBySku(m.product_id);
      csv += `"${new Date(m.occurred_at).toLocaleString()}","${this.getMovementTypeLabel(m.type)}","${m.reason_code}","${p?.name ?? ''}",${m.qty},${Number(m.unit_cost).toFixed(2)},${Number(m.total_cost).toFixed(2)},${m.balance_qty_post},${Number(m.balance_total_cost_post).toFixed(2)},${Number(m.balance_avg_cost_post).toFixed(2)}\n`;
    }
    this.downloadFile(csv, 'kardex-export.csv', 'text/csv');
    this.showToast('success', 'Kardex exportado');
  }

  printKardex(): void {
    window.print();
    this.showToast('info', 'Imprimiendo kardex...');
  }

  getMovementTypeLabel(type: Movement['type']): string {
    const map: Record<string, string> = { IN: 'Entrada', OUT: 'Salida', ADJ: 'Ajuste', TRANSFER: 'Transferencia' };
    return map[type] ?? type;
  }

  // MODAL KARDEX
  async openMovementSerials(mov: Movement): Promise<void> {
    try {
      this.currentMovementSerials = await this.serialsSvc.byMovement(mov.id).toPromise();
      this.currentMovementProductManagesExpiration = mov.product?.manages_expiration ?? false;
      this.showMovementSerialsModal = true;
    } catch {
      this.showToast('error', 'No se pudieron cargar seriales del movimiento');
    }
  }
  closeMovementSerials(): void {
    this.showMovementSerialsModal = false;
    this.currentMovementSerials = [];
    this.currentMovementProductManagesExpiration = false;
  }


  // =========================================================
  // CATÁLOGOS (CRUD lite en front; conecta con services reales)
  // =========================================================
  openProductModal(): void {
    this.editingProduct = null;
    this.productForm = {
      sku: '',
      name: '',
      description: '',
      brand: '',
      category_id: null,
      unit_id: null,
      is_serialized: false,
      manages_expiration: false,
      min_stock: 0,
      max_stock: 0,
      reorder_point: 0,
    };
    this.showProductModal = true;
  }

  editProduct(p: Product): void {
    this.editingProduct = p;
    this.productForm = {
      sku: p.sku,
      name: p.name,
      description: p.description ?? '',
      brand: p.brand ?? '',
      category_id: p.category_id ?? null,
      unit_id: p.unit_id ?? null,
      is_serialized: !!p.is_serialized,
      manages_expiration: !!p.manages_expiration,
      min_stock: (p as any).min_stock ?? 0,
      max_stock: (p as any).max_stock ?? 0,
      reorder_point: (p as any).reorder_point ?? 0,
    };
    this.showProductModal = true;
  }

  async saveProduct(): Promise<void> {
    const f = this.productForm;
    if (!f.sku || !f.name || !f.category_id || !f.unit_id) {
      this.showToast('error', 'Complete todos los campos requeridos');
      return;
    }

    try {
      if (this.editingProduct) {
        const updated = await this.productsSvc.update(this.editingProduct.id, f).toPromise();
        const i = this.products.findIndex((x) => x.id === updated.id);
        if (i >= 0) this.products[i] = updated;
        this.productMap.set(updated.id, updated);
        this.showToast('success', 'Producto actualizado');
      } else {
        const created = await this.productsSvc.create(f).toPromise();
        this.products.push(created);
        this.productMap.set(created.id, created);
        this.showToast('success', 'Producto creado');
      }
      this.closeProductModal();
      await this.loadProducts();
    } catch {
      this.showToast('error', 'No se pudo guardar el producto');
    }
  }

  async deleteProduct(id: number): Promise<void> {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      await this.productsSvc.delete(id).toPromise();
      this.products = this.products.filter((p) => p.id !== id);
      this.productMap.delete(id);
      this.showToast('success', 'Producto eliminado');
      await this.loadProducts();
    } catch {
      this.showToast('error', 'No se pudo eliminar el producto');
    }
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.editingProduct = null;
  }

  openImportProductsModal(): void {
    const defaultUnit = this.units.find((u) => (u.abbreviation || '').toUpperCase() === 'UND');
    this.importProductsForm = {
      category_id: null,
      unit_id: defaultUnit?.id ?? null,
      is_serialized: true,
      manages_expiration: false,
      min_stock: 0,
      max_stock: 0,
      reorder_point: 0,
      duplicateMode: 'skip',
    };
    this.importProductsFileName = '';
    this.importProductsRows = [];
    this.importProductsErrors = [];
    this.importProductsResult = null;
    this.showImportProductsModal = true;
  }

  closeImportProductsModal(): void {
    if (this.importProductsLoading) return;
    this.showImportProductsModal = false;
    this.importProductsFileName = '';
    this.importProductsRows = [];
    this.importProductsErrors = [];
    this.importProductsResult = null;
  }

  onImportProductsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.importProductsRows = [];
    this.importProductsErrors = [];
    this.importProductsResult = null;

    if (!file) return;

    this.importProductsFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
        this.parseImportProductsWorkbook(workbook);
      } catch {
        this.importProductsErrors = ['No se pudo leer el archivo Excel. Verifica que sea un .xlsx válido.'];
      }
    };
    reader.onerror = () => {
      this.importProductsErrors = ['No se pudo abrir el archivo seleccionado.'];
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  private parseImportProductsWorkbook(workbook: XLSX.WorkBook): void {
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const headerIndex = matrix.findIndex((row) => {
      const normalized = row.map((cell) => this.normalizeExcelHeader(cell));
      return normalized.includes('codigo') && normalized.includes('descripcion');
    });

    if (headerIndex < 0) {
      this.importProductsErrors = ['No se encontraron las columnas Código y Descripción.'];
      return;
    }

    const headers = matrix[headerIndex].map((cell) => this.normalizeExcelHeader(cell));
    const codeIndex = headers.indexOf('codigo');
    const descriptionIndex = headers.indexOf('descripcion');
    const brandIndex = headers.indexOf('marca');
    const rows: ImportProductRow[] = [];
    const errors: string[] = [];

    for (let i = headerIndex + 1; i < matrix.length; i++) {
      const row = matrix[i];
      const sku = String(row[codeIndex] ?? '').trim();
      const description = String(row[descriptionIndex] ?? '').trim();
      const brand = brandIndex >= 0 ? this.cleanImportedBrand(String(row[brandIndex] ?? '')) : null;

      if (!sku && !description) continue;
      if (!sku || !description) {
        errors.push(`Fila ${i + 1}: falta Código o Descripción.`);
        continue;
      }

      rows.push({
        sku,
        name: description,
        description,
        brand,
        category_id: 0,
        unit_id: 0,
        is_serialized: this.importProductsForm.is_serialized,
        manages_expiration: this.importProductsForm.manages_expiration,
        min_stock: Number(this.importProductsForm.min_stock || 0),
        max_stock: Number(this.importProductsForm.max_stock || 0),
        reorder_point: Number(this.importProductsForm.reorder_point || 0),
      });
    }

    this.importProductsRows = rows;
    this.importProductsErrors = errors;
    if (!rows.length && !errors.length) {
      this.importProductsErrors = ['El Excel no contiene productos para importar.'];
    }
  }

  async confirmImportProducts(): Promise<void> {
    if (!this.importProductsForm.category_id || !this.importProductsForm.unit_id) {
      this.showToast('error', 'Seleccione una categoría y una unidad');
      return;
    }

    if (!this.importProductsRows.length) {
      this.showToast('error', 'Seleccione un Excel con productos válidos');
      return;
    }

    const rows = this.importProductsRows.map((row) => ({
      ...row,
      category_id: this.importProductsForm.category_id!,
      unit_id: this.importProductsForm.unit_id!,
      is_serialized: this.importProductsForm.is_serialized,
      manages_expiration: this.importProductsForm.manages_expiration,
      min_stock: Number(this.importProductsForm.min_stock || 0),
      max_stock: Number(this.importProductsForm.max_stock || 0),
      reorder_point: Number(this.importProductsForm.reorder_point || 0),
    }));

    this.importProductsLoading = true;
    try {
      this.importProductsResult = await this.productsSvc
        .importProducts(rows, this.importProductsForm.duplicateMode)
        .toPromise() as ImportProductsResult;
      this.showToast('success', 'Importación procesada');
      await this.loadProducts();
      await this.loadAllProducts();
    } catch (error: any) {
      this.showToast('error', error?.error?.message || 'No se pudo importar productos');
    } finally {
      this.importProductsLoading = false;
    }
  }

  getImportPreviewRows(): ImportProductRow[] {
    return this.importProductsRows.slice(0, 10);
  }

  private normalizeExcelHeader(value: any): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, '');
  }

  private cleanImportedBrand(value: string): string | null {
    const brand = value.trim();
    if (!brand || brand === '-' || brand === '_' || brand === '__') return null;
    const upper = brand.toUpperCase();
    if (upper === 'N/A' || upper === 'NA' || upper === 'S/M') return null;
    return brand;
  }

  openCategoryModal(): void {
    this.editingCategory = null;
    this.categoryForm = { name: '', description: '' };
    this.showCategoryModal = true;
  }

  editCategory(c: Category): void {
    this.editingCategory = c;
    this.categoryForm = { name: c.name, description: c.description ?? '' };
    this.showCategoryModal = true;
  }

  async saveCategory(): Promise<void> {
    const f = this.categoryForm;
    if (!f.name) {
      this.showToast('error', 'Complete todos los campos requeridos');
      return;
    }
    try {
      if (this.editingCategory) {
        const u = await this.catalogsSvc.updateCategory(this.editingCategory.id, f).toPromise();
        const i = this.categories.findIndex((x) => x.id === u.id);
        if (i >= 0) this.categories[i] = u;
        this.categoryMap.set(u.id, u);
        this.showToast('success', 'Categoría actualizada');
      } else {
        const c = await this.catalogsSvc.createCategory(f).toPromise();
        this.categories.push(c);
        this.categoryMap.set(c.id, c);
        this.showToast('success', 'Categoría creada');
      }
      this.closeCategoryModal();
    } catch {
      this.showToast('error', 'No se pudo guardar la categoría');
    }
  }

  async deleteCategory(id: number): Promise<void> {
    if (!confirm('¿Eliminar categoría?')) return;
    try {
      await this.catalogsSvc.deleteCategory(id).toPromise();
      this.categories = this.categories.filter((c) => c.id !== id);
      this.categoryMap.delete(id);
      this.showToast('success', 'Categoría eliminada');
    } catch {
      this.showToast('error', 'No se pudo eliminar la categoría');
    }
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.editingCategory = null;
  }

  openUnitModal(): void {
    this.editingUnit = null;
    this.unitForm = { name: '', abbreviation: '' };
    this.showUnitModal = true;
  }

  editUnit(u: Unit): void {
    this.editingUnit = u;
    this.unitForm = { name: u.name, abbreviation: u.abbreviation };
    this.showUnitModal = true;
  }

  async saveUnit(): Promise<void> {
    const f = this.unitForm;
    if (!f.name || !f.abbreviation) {
      this.showToast('error', 'Complete todos los campos requeridos');
      return;
    }
    try {
      if (this.editingUnit) {
        const u = await this.catalogsSvc.updateUnit(this.editingUnit.id, f).toPromise();
        const i = this.units.findIndex((x) => x.id === u.id);
        if (i >= 0) this.units[i] = u;
        this.showToast('success', 'Unidad actualizada');
      } else {
        const u = await this.catalogsSvc.createUnit(f).toPromise();
        this.units.push(u);
        this.showToast('success', 'Unidad creada');
      }
      this.closeUnitModal();
    } catch {
      this.showToast('error', 'No se pudo guardar la unidad');
    }
  }

  async deleteUnit(id: number): Promise<void> {
    if (!confirm('¿Eliminar unidad?')) return;
    try {
      await this.catalogsSvc.deleteUnit(id).toPromise();
      this.units = this.units.filter((u) => u.id !== id);
      this.showToast('success', 'Unidad eliminada');
    } catch {
      this.showToast('error', 'No se pudo eliminar la unidad');
    }
  }

  closeUnitModal(): void {
    this.showUnitModal = false;
    this.editingUnit = null;
  }

  // =========================================================
  // HELPERS PARA EL HTML
  // =========================================================
  getProductBySku(id: number | null | undefined): Product | undefined {
    if (!id) return undefined;
    return this.productMap.get(id);
  }

  getProductStock(productId: number): number {
    return this.pagedStock.find((s) => s.product_id === productId)?.total_qty ?? 0;
  }

  getProductAvgCost(productId: number): number {
    return this.pagedStock.find((s) => s.product_id === productId)?.avg_cost ?? 0;
  }

  getUnitAbbreviation(unitId?: number | null): string {
    if (!unitId) return '-';
    return this.units.find((u) => u.id === unitId)?.abbreviation ?? '-';
  }

  getCategoryName(id?: number | null): string {
    if (!id) return '-';
    return this.categoryMap.get(id)?.name ?? '-';
  }

  // --- firma sobrecargada (Angular ve ambas como válidas)
  getLotCode(lotId: number): string;
  getLotCode(productId: number, lotId: number): string;
  getLotCode(a: number, b?: number): string {
    if (b == null) {
      // llamado con 1 arg: lotId
      const lot = this.lotIdMap.get(a);
      return lot?.lot_code ?? '-';
    } else {
      // llamado con 2 args: productId + lotId
      const lots = this.lotsByProduct.get(a) ?? [];
      const lot = lots.find(l => l.id === b);
      return lot?.lot_code ?? '-';
    }
  }

  getLotExpiration(lotId: number): Date | null;
  getLotExpiration(productId: number, lotId: number): Date | null;
  getLotExpiration(a: number, b?: number): Date | null {
    let iso: string | null | undefined;
    if (b == null) iso = this.lotIdMap.get(a)?.expiration_date ?? null;
    else iso = (this.lotsByProduct.get(a) ?? []).find(l => l.id === b)?.expiration_date ?? null;
    return this.toUtcDateOnly(iso);
  }



  // =========================================================
  // TOASTS + UTILS
  // =========================================================
  showToast(type: ToastType, message: string): void {
    const t = { type, message };
    this.toasts.push(t);
    setTimeout(() => (this.toasts = this.toasts.filter((x) => x !== t)), 3000);
  }

  getToastIcon(type: ToastType): string {
    const map: Record<ToastType, string> = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
    };
    return map[type];
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }



  //-------------------------------------------------------------
  // Cache de lotes por producto para uso en el template
  private lotsByProduct = new Map<number, Array<{ id: number; lot_code: string; expiration_date: string | null }>>();


  /**
   * Carga (y cachea) los lotes de un producto si aún no están en memoria.
   */
  private async ensureLotsForProduct(productId: number, force = false): Promise<void> {
    if (!productId) return;
    if (!force && this.lotsByProduct.has(productId)) return;

    try {
      const lots = await this.lotsSvc.listByProduct(productId).toPromise();
      const norm = (lots || []).map(l => ({
        id: l.id,
        lot_code: l.lot_code,
        expiration_date: l.expiration_date ?? null,
      }));
      this.lotsByProduct.set(productId, norm);

      // --- también indexar por lotId:
      for (const l of norm) this.lotIdMap.set(l.id, l);

    } catch {
      this.lotsByProduct.set(productId, []);
      this.showToast('error', 'No se pudieron cargar los lotes del producto');
    }
  }




  /**
   * Devuelve los lotes ya cargados para el producto (sincrónico para el template).
   * Si aún no están cargados, devuelve [] (los precargamos al cambiar de producto).
   */
  getLotsForProduct(productId: number | null): { id: number; lot_code: string; expiration_date: string | null }[] {
    if (!productId) return [];
    return this.lotsByProduct.get(productId) ?? [];
  }



  downloadCountList(): void {
    if (!this.selectedCount) {
      this.showToast('error', 'No hay conteo seleccionado');
      return;
    }

    // Si no hay snapshots cargados, avisar
    const rows = this.currentCountSnapshots || [];
    if (!rows.length) {
      this.showToast('warning', 'No hay datos del snapshot para exportar');
      return;
    }

    // Arma CSV
    let csv = 'Conteo,Fecha Snapshot,SKU,Producto,Lote,Cant. Sistema,CPP Congelado,Total Congelado\n';
    for (const s of rows) {
      const p = this.productMap.get(s.product_id);
      // intentar resolver el lot_code desde el cache (si no, '-')
      const lotCode = (() => {
        if (s.lot_id == null) return '-';
        const lots = this.lotsByProduct.get(s.product_id) ?? [];
        const lot = lots.find(l => l.id === s.lot_id);
        return lot?.lot_code ?? '-';
      })();

      const countCode = this.selectedCount.code || '';
      const snapDate = new Date(s.snapshot_date).toLocaleString(); // si tu modelo es Date string
      const sku = p?.sku ?? '';
      const name = (p?.name ?? '').replace(/"/g, '""'); // escapa comillas
      const qtySys = Number(s.qty_system).toFixed(4);
      const avg = Number(s.avg_cost_at_freeze).toFixed(4);
      const total = Number(s.total_cost_at_freeze).toFixed(4);

      csv += `"${countCode}","${snapDate}","${sku}","${name}","${lotCode}",${qtySys},${avg},${total}\n`;
    }

    this.downloadFile(csv, `count-${this.selectedCount.code || this.selectedCount.id}-snapshot.csv`, 'text/csv');
    this.showToast('success', 'Listado del conteo exportado');
  }



  /** Lotes con stock > 0 para un producto, ordenados FEFO (vencimiento más próximo primero) */
  private getLotsWithStockFEFO(productId: number): Array<{
    id: number;
    lot_code: string;
    expiration_date: string | null;
    qty_on_hand: number;
  }> {
    const lots = this.lotsByProduct.get(productId) ?? [];

    // Mapa lotId -> qty_on_hand desde la tabla de stock
    const qtyByLot = new Map<number, number>();
    for (const s of this.stock) {
      if (s.product_id === productId && s.lot_id != null) {
        qtyByLot.set(s.lot_id, Number(s.qty_on_hand ?? 0));
      }
    }

    // Une info de lotes + qty y filtra sin stock
    const enriched = lots
      .map(l => ({
        id: l.id,
        lot_code: l.lot_code,
        expiration_date: l.expiration_date ?? null,
        qty_on_hand: qtyByLot.get(l.id) ?? 0,
      }))
      .filter(x => x.qty_on_hand > 0);

    // Orden FEFO: fecha más próxima primero; nulas al final
    enriched.sort((a, b) => {
      const da = a.expiration_date ? this.toUtcDateOnly(a.expiration_date)!.getTime() : Number.POSITIVE_INFINITY;
      const db = b.expiration_date ? this.toUtcDateOnly(b.expiration_date)!.getTime() : Number.POSITIVE_INFINITY;

      return da - db;
    });

    return enriched;
  }

  private toUtcDateOnly(isoDate?: string | null): Date | null {
    if (!isoDate) return null;
    // Evita usar new Date(isoDate) directo
    return new Date(isoDate + 'T00:00:00Z');
  }

  /** Mapa lotId -> qty_on_hand para el producto dado (a partir de la tabla stock ya cargada) */
  private getQtyByLot(productId: number): Map<number, number> {
    const m = new Map<number, number>();
    for (const s of this.stock) {
      if (s.product_id === productId && s.lot_id != null) {
        m.set(s.lot_id, Number(s.qty_on_hand ?? 0));
      }
    }
    return m;
  }




  // Al cambiar el producto en Ajuste
  async onProductChangeAdjustment(): Promise<void> {
    // Decoupled: Product is already set by selectAdjProduct

    this.adjustmentForm.lot_id = null;

    if (this.selectedProductAdjustment?.manages_expiration) {
      await this.ensureLotsForProduct(this.selectedProductAdjustment.id);
    }
  }

  //HELPERS ENTRADA
  addEntrySerial(): void {
    const raw = this.entrySerialInput ?? '';
    const code = raw.replace(/[\r\n\t]+/g, '').trim();
    if (!code) return;

    if (this.entrySerialCodes.includes(code)) {
      this.showToast('warning', `Serial duplicado: ${code}`);
      this.entrySerialInput = '';
      setTimeout(() => this.entrySerialField?.nativeElement.focus(), 0);
      return;
    }

    const required = Number(this.entryForm.qty || 0);
    if (required > 0 && this.entrySerialCodes.length >= required) {
      this.showToast('warning', 'Ya alcanzaste la cantidad requerida');
      this.entrySerialInput = '';
      setTimeout(() => this.entrySerialField?.nativeElement.focus(), 0);
      return;
    }

    this.entrySerialCodes.push(code);
    this.entrySerialInput = '';
    setTimeout(() => this.entrySerialField?.nativeElement.focus(), 0);
  }

  removeEntrySerial(code: string): void {
    this.entrySerialCodes = this.entrySerialCodes.filter(c => c !== code);
  }

  remainingEntrySerials(): number {
    const required = Number(this.entryForm.qty || 0);
    return Math.max(0, required - this.entrySerialCodes.length);
  }


  //HELPERS SALIDA
  toggleExitSerial(id: number): void {
    const i = this.exitSelectedSerialIds.indexOf(id);
    if (i >= 0) this.exitSelectedSerialIds.splice(i, 1);
    else this.exitSelectedSerialIds.push(id);

    // El usuario intervino manualmente -> desactivar auto
    this.exitAutoSelect = false;
  }

  remainingExitSerials(): number {
    const required = Number(this.exitForm.qty || 0);
    return Math.max(0, required - this.exitSelectedSerialIds.length);
  }

  autoPickExitSerials(take?: number): void {
    if (!this.selectedProductExit?.is_serialized) return;

    const qty = Number(take ?? this.exitForm.qty ?? 0);
    if (!qty) { this.exitSelectedSerialIds = []; return; }

    const chosenLot = this.exitForm.lot_id ?? null;

    // 1) Seriales del lote elegido
    const preferred = this.availableSerialsForExit
      .filter(s => s.lot_id === chosenLot)
      .map(s => s.id);

    // 2) Resto (otros lotes)
    const others = this.availableSerialsForExit
      .filter(s => s.lot_id !== chosenLot)
      .map(s => s.id);

    const pool = [...preferred, ...others];
    this.exitSelectedSerialIds = pool.slice(0, qty);
  }


  clearExitSelection(): void {
    this.exitSelectedSerialIds = [];
  }

  maybeAutoPickExitSerials(): void {
    if (!this.exitAutoSelect) return;
    this.autoPickExitSerials();
  }

  onExitQtyChange(val: number): void {
    this.exitForm.qty = Number(val) || 0;
    this.maybeAutoPickExitSerials();
  }






  //HELPERS AJUSTE
  addAdjSerial(): void {
    const raw = this.adjSerialInput ?? '';
    const code = raw.replace(/[\r\n\t]+/g, '').trim();
    if (!code) return;

    if (this.adjSerialCodes.includes(code)) {
      this.showToast('warning', `Serial duplicado: ${code}`);
      this.adjSerialInput = '';
      setTimeout(() => this.adjSerialField?.nativeElement.focus(), 0);
      return;
    }

    const required = Math.max(0, Number(this.adjustmentForm.qty || 0));
    if (required > 0 && this.adjSerialCodes.length >= required) {
      this.showToast('warning', 'Ya alcanzaste la cantidad requerida');
      this.adjSerialInput = '';
      setTimeout(() => this.adjSerialField?.nativeElement.focus(), 0);
      return;
    }

    this.adjSerialCodes.push(code);
    this.adjSerialInput = '';
    setTimeout(() => this.adjSerialField?.nativeElement.focus(), 0);
  }

  removeAdjSerial(code: string): void {
    this.adjSerialCodes = this.adjSerialCodes.filter(c => c !== code);
  }

  toggleAdjSerial(id: number): void {
    const i = this.adjSelectedSerialIds.indexOf(id);
    if (i >= 0) this.adjSelectedSerialIds.splice(i, 1);
    else this.adjSelectedSerialIds.push(id);
  }

  remainingAdjSerialsAbs(): number {
    const required = Math.abs(Number(this.adjustmentForm.qty || 0));
    const picked = this.adjustmentForm.qty >= 0 ? this.adjSerialCodes.length : this.adjSelectedSerialIds.length;
    return Math.max(0, required - picked);
  }

  remainingAdjSerials(): number {
    const required = Number(this.adjustmentForm.qty || 0);
    return Math.max(0, required - this.adjSerialCodes.length);
  }


  //HELPERS DE CONTEO
  addCountEntrySerial(): void {
    const raw = this.countEntrySerialInput ?? '';
    const code = raw.replace(/[\r\n\t]+/g, '').trim();
    if (!code) return;

    if (this.countEntrySerialCodes.includes(code)) {
      this.showToast('warning', `Serial duplicado: ${code}`);
      this.countEntrySerialInput = '';
      setTimeout(() => this.countSerialField?.nativeElement.focus(), 0);
      return;
    }

    const required = Number(this.countEntryForm.qty_counted || 0);
    if (required > 0 && this.countEntrySerialCodes.length >= required) {
      this.showToast('warning', 'Ya alcanzaste la cantidad requerida');
      this.countEntrySerialInput = '';
      setTimeout(() => this.countSerialField?.nativeElement.focus(), 0);
      return;
    }

    this.countEntrySerialCodes.push(code);
    this.countEntrySerialInput = '';
    setTimeout(() => this.countSerialField?.nativeElement.focus(), 0);
  }

  removeCountEntrySerial(code: string): void {
    this.countEntrySerialCodes = this.countEntrySerialCodes.filter(c => c !== code);
  }

  remainingCountEntrySerials(): number {
    const required = Number(this.countEntryForm.qty_counted || 0);
    return Math.max(0, required - this.countEntrySerialCodes.length);
  }




  // inventory.ts (dentro de la clase)
  serialDiffsCache = new Map<string, { faltantes: string[]; sobrantes: string[]; coincidentes: string[] }>();

  showSerialDiffsModal = false;
  modalSerials = { product_id: 0, lot_id: null as number | null, faltantes: [] as string[], sobrantes: [] as string[], coincidentes: [] as string[] };


  private keyFor(pl: { product_id: number; lot_id: number | null }) {
    return `${pl.product_id}:${pl.lot_id ?? 'null'}`;
  }

  private async ensureSerialDiffsLoaded(): Promise<void> {
    if (!this.selectedCount) return;
    if (this.serialDiffsCache.size > 0) return; // ya cargado
    try {
      const rows = await this.countsSvc.getSerialDiffs(this.selectedCount.id).toPromise();
      (rows || []).forEach(d => {
        this.serialDiffsCache.set(this.keyFor(d), {
          faltantes: d.faltantes || [],
          sobrantes: d.sobrantes || [],
          coincidentes: d.coincidentes || [],
        });
      });
    } catch {
      this.showToast('error', 'No se pudieron cargar las diferencias por serial');
    }
  }


  async openSerialDiffsFor(product_id: number, lot_id: number | null) {
    await this.ensureSerialDiffsLoaded();
    const k = this.keyFor({ product_id, lot_id });
    const d = this.serialDiffsCache.get(k);
    if (!d) {
      this.showToast('info', 'No hay diferencias de seriales para esta fila');
      return;
    }
    this.modalSerials = { product_id, lot_id, ...d };
    this.showSerialDiffsModal = true;
  }

  closeSerialDiffsModal() {
    this.showSerialDiffsModal = false;
  }



  // --- STOCK (modal de seriales) ---
  showStockSerialsModal = false;
  currentStockSerials: Array<{ id: number; serial_code: string; lot_id: number | null; lot_code: string | null; supplier_name: string | null }> = [];
  modalStockCtx: { productId: number; productName: string; lotId: number | null; lotCode: string | null; productManagesExpiration: boolean } | null = null;

  async openStockSerials(item: { product_id: number; lot_id?: number | null }): Promise<void> {
    try {
      const p = this.productMap.get(item.product_id);
      const productName = p?.name ?? '';
      const lotId = item.lot_id ?? null;
      const lotCode = lotId ? this.getLotCode(item.product_id, lotId) : null;

      // Trae seriales en stock del producto (y del lote si viene en la fila)
      const rows = await this.serialsSvc.list({
        product_id: item.product_id,
        status: 'IN_STOCK',
        lot_id: lotId ?? undefined,
      }).toPromise();

      this.currentStockSerials = (rows ?? []).map(r => ({
        id: r.id,
        serial_code: r.serial_code,
        lot_id: r.lot_id ?? null,
        lot_code: (r as any).lot_code || null,
        supplier_name: (r as any).supplier_name || null,
      }));

      this.modalStockCtx = { 
        productId: item.product_id, 
        productName, 
        lotId, 
        lotCode,
        productManagesExpiration: p?.manages_expiration ?? false
      };
      this.showStockSerialsModal = true;
    } catch {
      this.showToast('error', 'No se pudieron cargar los seriales en stock');
    }
  }

  closeStockSerials(): void {
    this.showStockSerialsModal = false;
    this.currentStockSerials = [];
    this.modalStockCtx = null;
  }


  //helpers para carga diferidas
  private async loadPersistedDifferences(countId: number): Promise<void> {
    const [rows, summary] = await Promise.all([
      this.countsSvc.getDifferences(countId).toPromise(),
      this.countsSvc.getDifferenceSummary(countId).toPromise(),
    ]);

    this.differences = (rows || []).map(r => ({
      product_id: r.productId,
      lot_id: r.lotId ?? null,
      qty_system: Number(r.qtySystem),
      qty_counted: Number(r.qtyCounted),
      difference: Number(r.difference),
      avg_cost: Number(r.avgCostAtFreeze),
      value_difference: Number(r.valueDifference),
    }));

    this.differenceSummary = {
      surplus: Number(summary?.surplusValue ?? 0),
      shortage: Number(summary?.shortageValue ?? 0),
      net: Number(summary?.netValue ?? 0),
    };
  }


  //Helper para formatear la hora y que no salga 5 horas menos
  formatLocalDate(raw: string | null | undefined): string {
    if (!raw) return '-';

    // caso típico: "2025-10-27T16:52:22.000Z" o "2025-10-27T16:52:22.000"
    // 1. quitamos la Z si viene con Z para que el browser NO haga conversión de zona
    const sanitized = raw.endsWith('Z') ? raw.replace(/Z$/, '') : raw;

    // 2. creamos un Date como si fuera "local time", no UTC
    //    truco: dividir a mano en partes en vez de usar new Date() directo
    const m = sanitized.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
    );
    if (!m) return raw; // fallback

    const [_, y, mo, d, h, mi] = m;
    // armamos string "dd/MM/yyyy HH:mm"
    return `${d}/${mo}/${y} ${h}:${mi}`;
  }



  //Metodos Para esportar en Pdf y Excel la revision de conteos

  exportReviewToPdf(): void {
    if (!this.selectedCount) {
      this.showToast('error', 'No hay conteo seleccionado');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let y = 15;
    y = this.buildPdfHeader(doc, y);
    y = this.buildPdfSummary(doc, y);

    // título antes de la tabla
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detalle de Diferencias por Ítem', 15, y);
    y += 4;

    this.buildPdfDifferencesTable(doc, y);

    doc.save(`conteo-${this.selectedCount.code || this.selectedCount.id}.pdf`);
  }

  exportReviewToExcel(): void {
    if (!this.selectedCount || this.selectedCount.status !== 'REVIEW') {
      this.showToast('error', 'Solo puedes exportar cuando el conteo está en Revisión');
      return;
    }

    // --- Sheet 1: Resumen
    const resumenData = [
      ['Conteo', this.selectedCount.code || this.selectedCount.id],
      ['Sobrantes (S/)', this.differenceSummary.surplus?.toFixed(2)],
      ['Faltantes (S/)', this.differenceSummary.shortage?.toFixed(2)],
      ['Diferencia Neta (S/)', this.differenceSummary.net?.toFixed(2)],
      ['Requiere Doble Aprobación', this.requiresDoubleApproval() ? 'Sí' : 'No'],
    ];

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);

    // --- Sheet 2: Detalle Diferencias
    // armamos filas con headers bonitos
    const detalleRows: (string | number)[][] = [
      ['SKU', 'Producto', 'Lote', 'Cant. Sistema', 'Cant. Contada', 'Diferencia', 'Costo Prom.', 'Valor Diferencia']
    ];


    for (const diff of this.differences) {
      const p = this.getProductBySku(diff.product_id);
      const lotCode = diff.lot_id ? this.getLotCode(diff.product_id, diff.lot_id) : '-';

      detalleRows.push([
        p?.sku ?? '',
        p?.name ?? '',
        lotCode,
        String(diff.qty_system),
        String(diff.qty_counted),
        String(diff.difference),
        Number(diff.avg_cost).toFixed(2),
        Number(diff.value_difference).toFixed(2),
      ]);
    }


    const detalleSheet = XLSX.utils.aoa_to_sheet(detalleRows);

    // --- Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');
    XLSX.utils.book_append_sheet(wb, detalleSheet, 'Diferencias');

    const fileName = `conteo-${this.selectedCount.code || this.selectedCount.id}-revision.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.showToast('success', 'Excel generado');
  }


  private buildPdfHeader(doc: jsPDF, startY: number): number {
    // Datos base del conteo
    const countCode = this.selectedCount?.code || '';
    const statusLabel = this.getCountStatusLabel(this.selectedCount?.status || '');
    const fechaConteo = this.selectedCount?.created_at
      ? this.formatLocalDate(this.selectedCount.created_at)
      : '-';
    const responsable = this.selectedCount?.created_by || this.currentUserName;

    // Empresa: si no tienes aún en el front, puedes quemar valores temporales:
    const empresa = 'TECH STORE SYSTEM S.A.C.';
    const ruc = 'RUC: 20608226495';
    const direccion = 'Calle Alfonso Ugarte NRO. 493 - Trujillo, La Libertad';
    const telefono = 'Telf: 924215320';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(empresa, 15, startY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(ruc, 15, startY + 5);
    doc.text(direccion, 15, startY + 10);
    doc.text(telefono, 15, startY + 15);

    // Caja derecha tipo "document info"
    const boxX = 120;
    const boxY = startY;
    const boxW = 75;
    const boxH = 25;

    doc.rect(boxX, boxY, boxW, boxH); // borde del recuadro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ACTA DE CONTEO', boxX + 5, boxY + 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Conteo: ${countCode}`, boxX + 5, boxY + 14);
    doc.text(`Estado: ${statusLabel}`, boxX + 5, boxY + 19);
    doc.text(`Fecha: ${fechaConteo}`, boxX + 5, boxY + 24);

    // Bloque info operación (debajo)
    let y = boxY + boxH + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Información del Conteo', 15, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Responsable: ${responsable}`, 15, y);
    y += 4;
    doc.text(`Código Conteo: ${countCode}`, 15, y);
    y += 4;
    doc.text(`Estado Actual: ${statusLabel}`, 15, y);
    y += 4;

    return y + 4; // devolvemos la Y final para seguir dibujando
  }

  private buildPdfSummary(doc: jsPDF, startY: number): number {
    const colX = 15;
    const rowH = 8;
    const colW = 180;

    // dibujamos borde "Resumen de diferencias"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Resumen de diferencias valorizadas (S/)', colX, startY);

    // tabla simple de 3 columnas
    const headers = ['Sobrantes', 'Faltantes', 'Diferencia Neta'];
    const values = [
      `S/ ${Number(this.differenceSummary.surplus).toFixed(2)}`,
      `S/ ${Number(this.differenceSummary.shortage).toFixed(2)}`,
      `S/ ${Number(this.differenceSummary.net).toFixed(2)}`
    ];

    const cellW = colW / 3;

    // header row
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    for (let i = 0; i < 3; i++) {
      const x = colX + i * cellW;
      doc.rect(x, startY + 3, cellW, rowH);
      doc.text(headers[i], x + 2, startY + 3 + 5);
    }

    // value row
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < 3; i++) {
      const x = colX + i * cellW;
      doc.rect(x, startY + 3 + rowH, cellW, rowH);
      doc.text(values[i], x + 2, startY + 3 + rowH + 5);
    }

    return startY + 3 + rowH * 2 + 6; // nueva Y
  }

  private buildPdfDifferencesTable(doc: jsPDF, startY: number): void {
    const bodyRows = this.differences.map(diff => {
      const prod = this.getProductBySku(diff.product_id);
      return [
        prod?.sku || '',
        prod?.name || '',
        diff.lot_id ? this.getLotCode(diff.product_id, diff.lot_id) : '-',
        diff.qty_system.toString(),
        diff.qty_counted.toString(),
        (diff.difference > 0 ? '+' : '') + diff.difference.toString(),
        Number(diff.avg_cost).toFixed(2),
        (diff.value_difference > 0 ? '+' : '') + Number(diff.value_difference).toFixed(2),
      ];
    });

    (autoTable as any)(doc, {
      startY,
      head: [[
        'SKU',
        'Nombre',
        'Lote',
        'Teórico',
        'Contado',
        'Dif.',
        'Costo Prom.',
        'Val. Dif.'
      ]],
      body: bodyRows,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 0,
        fontStyle: 'bold'
      },
    });
  }


  // === handlers de Enter para cada input ===
  onEntrySerialKeydown(): void {
    this.addEntrySerial();
  }

  onAdjSerialKeydown(): void {
    this.addAdjSerial();
  }

  onCountEntrySerialKeydown(): void {
    this.addCountEntrySerial();
  }

  // =========================================================
  // MODALES PROVEEDOR (NUEVO)
  // =========================================================
  openSupplierModal() {
    this.supplierForm = {
      company_id: 1, // DEFAULT
      document_type_id: this.documentTypes.length > 0 ? this.documentTypes[0].id : null,
      document_number: '',
      name: '',
      commercial_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
    };
    this.showSupplierModal = true;
  }

  closeSupplierModal() {
    this.showSupplierModal = false;
  }

  async saveSupplier() {
    if (!this.supplierForm.name || !this.supplierForm.document_number) {
      this.showToast('error', 'El nombre y número de documento son obligatorios');
      return;
    }
    try {
      const created = await this.suppliersApi.create({
        companyId: this.supplierForm.company_id || 1, // requires number
        documentTypeId: Number(this.supplierForm.document_type_id),
        documentNumber: this.supplierForm.document_number,
        name: this.supplierForm.name,
        tradeName: this.supplierForm.commercial_name,
        email: this.supplierForm.email,
        phone: this.supplierForm.phone,
        address: this.supplierForm.address,
        city: this.supplierForm.city,
        country: this.supplierForm.country,
      }).toPromise();

      if (created) {
        this.suppliers.push(created);
        this.entryForm.supplier_id = created.id; // Auto-seleccionar
        this.showToast('success', 'Proveedor creado exitosamente');
        this.closeSupplierModal();
      }
    } catch (e: any) {
      this.showToast('error', e?.error?.message || 'Error al crear proveedor');
    }
  }

}
