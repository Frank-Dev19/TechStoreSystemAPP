// src/app/pages/pricing/pricing.ts
import { Component, OnInit } from '@angular/core';

import {
  PriceList,
  PriceListType,
  CategoryLite,
  ProductLite,
  ProductPriceRow,
  DiscountRuleUi,
  DiscountRule,
  ComboUi,
  ComboItemUi,
  ComboTypeUi,
  DiscountTypeUi,
  BestPriceResultUi,
  Toast,
  ToastType,
  SavePriceListDto,
  SaveProductPriceDto,
  SaveDiscountRuleDto,
  SaveComboDto,
  ProductPriceBackend,
  BestPriceResponse,
  PriceCoverageStats,
  MissingPriceItem,
  SimulationResult,
  SimulationQuery,
  BatchSimulationQuery

} from '../../models/pricing/pricing.models';

import { PriceListsApiService } from '../../services/pricing/price-lists-api.service';
import { ProductPricesApiService } from '../../services/pricing/product-prices-api.service';
import { DiscountRulesApiService } from '../../services/pricing/discount-rules-api.service';
import { CombosApiService } from '../../services/pricing/combos-api.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { SimulationApiService } from '../../services/pricing/simulation2-api.service';


@Component({
  selector: 'app-pricing',
  standalone: false,
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss'
})
export class Pricing implements OnInit {

  // ============================================
  // TABS
  // ============================================
  activeTab = 'priceListTab';

  // ============================================
  // STATE & FORMS
  // ============================================
  showPriceListForm = false;
  showProductPriceForm = false;
  showDiscountRuleForm = false;
  showComboForm = false;

  editingPriceList: PriceList | null = null;
  editingProductPrice: ProductPriceRow | null = null;
  editingDiscountRule: DiscountRuleUi | null = null;
  editingCombo: ComboUi | null = null;

  // Cobertura de precios por lista
  priceCoverage: PriceCoverageStats | null = null;
  missingPriceProducts: MissingPriceItem[] = [];
  productPriceShowOnly: 'all' | 'priced' | 'unpriced' = 'all';


  // DATA
  priceLists: PriceList[] = [];
  categories: CategoryLite[] = []; // si luego quieres filtrar por categoría
  products: ProductLite[] = [];
  productPrices: ProductPriceRow[] = [];
  discountRules: DiscountRuleUi[] = [];
  combos: ComboUi[] = [];
  allCombos: ComboUi[] = [];  // Todos los combos (para búsqueda global)
  currentPageCombos: ComboUi[] = [];  // Combos de la página actual

  // ============================================
  // NUEVAS PROPIEDADES PARA AUTOCOMPLETE DE COMBOS
  // ============================================
  comboProductSearch = '';
  comboProductSuggestions: ProductLite[] = [];
  selectedComboProduct: ProductLite | null = null;
  comboItemQty = 1; // Cantidad por defecto

  // SIMULADOR
  simulatorProduct: ProductLite | null = null;
  simulatorQty = 1;
  simulatorResult: BestPriceResultUi | null = null;

  // FILTERS & SEARCH
  priceListSearchText = '';
  priceListTypeFilter: '' | PriceListType = '';
  showOnlyActivePriceLists = false;

  productPriceSearchText = '';
  selectedPriceListForProducts: PriceList | null = null;
  selectedProductForPrice: ProductLite | null = null;

  discountRuleSearchText = '';
  discountFilterProductId: number | null = null;
  discountFilterCategoryId: number | null = null;
  discountActiveFilter: '' | 'active' | 'inactive' = '';

  comboSearchText = '';
  comboActiveFilter: '' | 'active' | 'inactive' = ''; // Filtro de estado

  currentPage = 1;
  totalPages = 1;
  limit = 10;  // Límites de la paginación, por ejemplo, 10 combos por página.


  comboSearchSuggestions: ComboUi[] = [];

  // Pricing class
  selectedPriceListForPriceForm: PriceList | null = null;

  discountCardView = 'grid'; // 'grid' o 'list' para alternar vista si quieres

  productPriceFilterProductId: number | null = null;


  allDiscountRules: DiscountRuleUi[] = [];  // Todos los descuentos (para búsqueda global)
  currentDiscountRulesPage = 1;  // Página actual de descuentos
  discountRulesTotalPages = 1;  // Total de páginas de descuentos
  discountRulesLimit = 10;  // Límite por página




  // ============================================
  // NUEVAS PROPIEDADES PARA AUTOCOMPLETE DE DESCUENTOS
  // ============================================

  // Para los filtros de la pestaña de descuentos
  discountFilterProductSearch = '';
  discountProductSuggestions: ProductLite[] = [];
  selectedDiscountProduct: ProductLite | null = null;

  // Para el modal de descuentos
  modalProductSearch = '';
  modalProductSuggestions: ProductLite[] = [];
  selectedModalProduct: ProductLite | null = null;


  // Para el simulador
  simulatorProductSearch = '';
  simulatorProductSuggestions: ProductLite[] = [];


  // Modo del simulador
  simulatorMode: 'simple' | 'advanced' | 'audit' = 'simple';

  // Simulador avanzado
  simulationProductSearch = '';
  simulationSuggestions: any[] = [];
  simulationQty = 1;
  simulationPriceList = 'RETAIL';
  simulationDate = '';
  simulationPermissions = '';
  includeCombos = true;
  includeTechnicalDetails = false;

  // Pruebas en lote
  batchTestAllQuantities = false;
  batchTestAllPriceLists = false;
  batchTestConsistency = false;
  runningBatchTests = false;
  batchResults: SimulationResult[] = [];

  // Resultados
  simulationResult: SimulationResult | null = null;



  applyProductPriceFilters(): void {
    // La tabla ya se filtra reactivo, así que este método puede quedarse vacío.
    // Lo dejamos por UX (el usuario siente que “dispara” la búsqueda).
  }

  resetProductPriceFilters(): void {
    this.productPriceSearchText = '';
    this.productPriceFilterProductId = null;
  }

  applyDiscountFilters(): void {
    this.currentDiscountRulesPage = 1;

    // Recargar TODOS los descuentos con los filtros aplicados
    this.loadAllDiscountRules();
  }

  changeDiscountPage(page: number): void {
    if (page < 1 || page > this.discountRulesTotalPages) return;
    this.currentDiscountRulesPage = page;
    // No necesitamos recargar del backend porque todo está en allDiscountRules
  }

  resetDiscountFilters(): void {
    this.discountRuleSearchText = '';
    this.discountFilterProductSearch = '';
    this.discountFilterProductId = null;
    this.selectedDiscountProduct = null;
    this.discountProductSuggestions = [];
    this.discountActiveFilter = '';
    this.currentDiscountRulesPage = 1;

    // Recargar TODOS los descuentos sin filtros
    this.loadAllDiscountRules();
  }

  // TOASTS
  toasts: Toast[] = [];
  private toastCounter = 0;

  // ============================================
  // FORMS (igual que antes, solo tipados)
  // ============================================
  newPriceListForm: {
    code: string;
    name: string;
    description: string;
    type: PriceListType;
    isDefault: boolean;
    // activeFrom: string;
    // activeTo: string;
  } = {
      code: '',
      name: '',
      description: '',
      type: 'RETAIL',
      isDefault: false,
      // activeFrom: '',
      // activeTo: '',
    };

  newProductPriceForm: {
    productId: number;
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
    // validFrom: string;
    // validTo: string;
  } = {
      productId: 0,
      minQty: 1,
      maxQty: null,
      unitPrice: 0,
      // validFrom: '',
      // validTo: '',
    };

  newDiscountRuleForm: {
    name: string;
    description: string;
    discountType: DiscountTypeUi;
    amount: number;
    minQty: number | null;
    priority: number;
    autoApply: boolean;
    isExclusive: boolean;
    productId: number | null;
    priceListId: number | null;
    startsAt: string | null;
    endsAt: string | null;
  } = {
      name: '',
      description: '',
      discountType: 'PERCENT',
      amount: 0,
      minQty: null,
      priority: 1,
      autoApply: false,
      isExclusive: false,
      productId: null,
      priceListId: null,
      startsAt: null,
      endsAt: null,
    };


  newComboForm: {
    code: string;
    name: string;
    description: string;
    comboType: ComboTypeUi;
    comboPrice: number | null;
    discountPercent: number | null;
    autoApply: boolean;
    startsAt: string | null;
    endsAt: string | null;
  } = {
      code: '',
      name: '',
      description: '',
      comboType: 'FIXED_PRICE',
      comboPrice: 0,
      discountPercent: 0,
      autoApply: false,
      startsAt: null,
      endsAt: null,
    };


  newComboItems: ComboItemUi[] = [];

  // ============================================
  // CONSTRUCTOR
  // ============================================
  constructor(
    private priceListsApi: PriceListsApiService,
    private productPricesApi: ProductPricesApiService,
    private discountRulesApi: DiscountRulesApiService,
    private combosApi: CombosApiService,
    private pricingQueryApi: PricingQueryApiService,
    private productsApi: PricingProductsApiService,
    private simulationApi: SimulationApiService,
  ) { }

  // ============================================
  // INIT
  // ============================================
  ngOnInit(): void {
    this.loadInitialData();
    this.loadCombos();
    this.loadAllDiscountRules();
  }

  private loadInitialData(): void {
    this.loadPriceLists();
    this.loadProducts();
    this.loadAllDiscountRules(); // Primero cargar todos
    this.loadCurrentPageDiscountRules(); // Luego cargar página actual
    this.loadDiscountRules();
    this.loadCombos();
  }



  private loadPriceLists(): void {
    this.priceListsApi.list().subscribe({
      next: (data) => {
        this.priceLists = data;
        if (!this.selectedPriceListForProducts && this.priceLists.length) {
          this.selectedPriceListForProducts =
            this.priceLists.find((pl) => pl.isDefault) ?? this.priceLists[0];
          this.loadProductPricesForSelectedList();
          this.loadPriceCoverageForSelectedList();  // 👈 NUEVO
        }
      },
      error: () => this.showToast('error', 'Error al cargar listas de precios'),
    });
  }


  private loadProducts(): void {
    this.productsApi.list().subscribe({
      next: (data) => {
        this.products = data.map((p) => this.productsApi.mapToProductLite(p));
      },
      error: () => this.showToast('error', 'Error al cargar productos'),
    });
  }

  private loadProductPricesForSelectedList(): void {
    if (!this.selectedPriceListForProducts) {
      this.productPrices = [];
      return;
    }

    this.productPricesApi
      .listByPriceList(this.selectedPriceListForProducts.id, true)
      .subscribe({
        next: (rows) => {
          this.productPrices = rows.map((r) => this.mapProductPriceBackendToRow(r));
        },
        error: () => this.showToast('error', 'Error al cargar precios de productos'),
      });
  }

  private loadDiscountRules(): void {
    // Cargar TODOS los descuentos para búsqueda global
    this.loadAllDiscountRules();

    // Cargar descuentos de la página actual
    this.loadCurrentPageDiscountRules();
  }


  private loadAllDiscountRules(): void {
    this.discountRulesApi.listAll({
      active_only: this.discountActiveFilter === 'active',
      product_id: this.discountFilterProductId,
      auto_check: true,
    }).subscribe({
      next: (response: any) => {  // 👈 Usar 'any' temporalmente
        console.log('📊 Full response:', response);

        // Extraer los datos de la respuesta paginada
        const rows = response.data || response || [];

        console.log(`📊 Extracted ${rows.length} discount rules`);

        this.allDiscountRules = rows.map((dr: any) => this.enrichDiscountRule(dr));
        console.log('✅ allDiscountRules loaded:', this.allDiscountRules.length);

        // Forzar actualización de la vista
        setTimeout(() => {
          // Actualizar también discountRules con los primeros X items
          const start = (this.currentDiscountRulesPage - 1) * this.discountRulesLimit;
          this.discountRules = [...this.allDiscountRules.slice(start, start + this.discountRulesLimit)];
          this.discountRulesTotalPages = Math.ceil(this.allDiscountRules.length / this.discountRulesLimit);
        }, 0);
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.showToast('error', 'Error al cargar descuentos');
      },
    });
  }

  private loadCurrentPageDiscountRules(): void {
    // Cargar solo la página actual para mostrar
    this.discountRulesApi.listPaginated({
      active_only: this.discountActiveFilter === 'active',
      product_id: this.discountFilterProductId,
      page: this.currentDiscountRulesPage,
      limit: this.discountRulesLimit,
      auto_check: true,
      // Agregar búsqueda por nombre si existe
      search: this.discountRuleSearchText || undefined,
    }).subscribe({
      next: (response) => {
        this.discountRules = response.data.map(dr => this.enrichDiscountRule(dr));
        this.discountRulesTotalPages = response.pagination.totalPages;
      },
      error: () => this.showToast('error', 'Error al cargar página de descuentos'),
    });
  }


  // Nuevo método para enriquecer datos
  private enrichDiscountRule(dr: DiscountRule): DiscountRuleUi {
    const enriched: DiscountRuleUi = {
      ...dr,
      productName: this.getProductNameById(dr.productId),
      categoryName: this.getCategoryNameById(dr.categoryId),
      priceListName: this.getPriceListNameById(dr.priceListId),
      priceListCode: this.getPriceListCodeById(dr.priceListId),
    };
    return enriched;
  }

  // Métodos helper para obtener nombres
  private getProductNameById(id?: number | null): string | null {
    if (!id) return null;
    const product = this.products.find(p => p.id === id);
    return product ? product.name : `ID ${id}`;
  }

  private getCategoryNameById(id?: number | null): string | null {
    if (!id) return null;
    const category = this.categories.find(c => c.id === id);
    return category ? category.name : `ID ${id}`;
  }

  private getPriceListNameById(id?: number | null): string | null {
    if (!id) return null;
    const priceList = this.priceLists.find(pl => pl.id === id);
    return priceList ? priceList.name : `ID ${id}`;
  }

  private getPriceListCodeById(id?: number | null): string | null {
    if (!id) return null;
    const priceList = this.priceLists.find(pl => pl.id === id);
    return priceList ? priceList.code : `ID ${id}`;
  }


  loadCombos(): void {
    // Cargar TODOS los combos para búsqueda global
    this.loadAllCombos();

    // Cargar combos de la página actual
    this.loadCurrentPageCombos();
  }


  private loadAllCombos(): void {
    // Cargar TODOS los combos sin paginación CON validación automática
    this.combosApi.listAll(`${this.comboActiveFilter || ''}${this.comboActiveFilter ? '&' : '?'}auto_check=true`).subscribe({
      next: (data) => {
        this.allCombos = data.map(combo => this.mapComboBackendToUi(combo));
        // Actualizar sugerencias de autocomplete
        this.updateComboSearchSuggestions();
      },
      error: () => this.showToast('error', 'Error al cargar todos los combos'),
    });
  }

  private loadCurrentPageCombos(): void {
    // Cargar solo la página actual para mostrar CON validación automática
    this.combosApi.list({
      page: this.currentPage,
      limit: this.limit,
      activeOnly: this.comboActiveFilter || '',
      autoCheck: true
    }).subscribe({
      next: (response) => {
        this.currentPageCombos = response.data.map(combo => this.mapComboBackendToUi(combo));
        this.totalPages = response.pagination.totalPages;
      },
      error: () => this.showToast('error', 'Error al cargar página de combos'),
    });
  }



  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadCurrentPageCombos(); // Solo recarga la página actual
  }


  resetComboFilters(): void {
    this.comboSearchText = '';
    this.comboSearchSuggestions = [];
    this.comboActiveFilter = '';
    this.currentPage = 1;

    // Recargar TODOS los combos sin filtros
    this.loadAllCombos();
    this.loadCurrentPageCombos();
  }


  // helper: mapear ProductPriceBackend -> ProductPriceRow (lo que usa el HTML)
  private mapProductPriceBackendToRow(r: ProductPriceBackend): ProductPriceRow {
    return {
      id: r.id,
      productId: r.productId,
      productName: r.product?.name ?? `ID ${r.productId}`,
      priceListId: r.priceListId,
      priceListCode: r.priceList?.code ?? '',
      unitPrice: Number(r.unitPrice),
      currencyCode: r.currencyCode,
      minQty: Number(r.minQty),
      maxQty: r.maxQty != null ? Number(r.maxQty) : null,
      // validFrom: r.validFrom ?? null,
      // validTo: r.validTo ?? null,
      isActive: r.isActive,
    };
  }


  // helper: mapear combo del backend (con items.product) -> ComboUi
  private mapComboBackendToUi(raw: any): ComboUi {
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      description: raw.description ?? null,
      comboType: raw.comboType,
      comboPrice: raw.comboPrice ?? null,
      discountPercent: raw.discountPercent ?? null,
      autoApply: !!raw.autoApply,
      requiresPermission: raw.requiresPermission ?? null,
      startsAt: raw.startsAt ?? null,
      endsAt: raw.endsAt ?? null,
      isActive: !!raw.isActive,
      items: (raw.items ?? []).map((it: any) => ({
        productId: it.productId,
        productName: it.product?.name ?? `ID ${it.productId}`,
        qty: it.qty,
      })),
    };
  }

  // ============================================
  // TAB NAVIGATION
  // ============================================

  selectTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'productPriceTab') {
      this.loadProductPricesForSelectedList();
      this.loadPriceCoverageForSelectedList();   // 👈 NUEVO
    }
  }


  // ============================================
  // PRICE LISTS TAB
  // ============================================

  get filteredPriceLists(): PriceList[] {
    return this.priceLists.filter((pl) => {
      const matchesSearch =
        pl.code.toLowerCase().includes(this.priceListSearchText.toLowerCase()) ||
        pl.name.toLowerCase().includes(this.priceListSearchText.toLowerCase());
      const matchesType = !this.priceListTypeFilter || pl.type === this.priceListTypeFilter;
      const matchesActive = !this.showOnlyActivePriceLists || pl.isActive;
      return matchesSearch && matchesType && matchesActive;
    });
  }

  onChangeSelectedPriceListForProducts(): void {
    this.loadProductPricesForSelectedList();
    this.loadPriceCoverageForSelectedList();   // 👈 NUEVO
    this.productPriceShowOnly = 'all';         // opcional, para resetear vista
  }


  openPriceListForm(priceList?: PriceList): void {
    if (priceList) {
      this.editingPriceList = priceList;
      this.newPriceListForm = {
        code: priceList.code,
        name: priceList.name,
        description: priceList.description ?? '',
        type: priceList.type,
        isDefault: !!priceList.isDefault,
        // activeFrom: this.toDateInputValue(priceList.activeFrom),
        // activeTo: this.toDateInputValue(priceList.activeTo),
      };
    } else {
      this.editingPriceList = null;
      this.newPriceListForm = {
        code: '',
        name: '',
        description: '',
        type: 'RETAIL',
        isDefault: false,
        // activeFrom: '',
        // activeTo: '',
      };
    }
    this.showPriceListForm = true;
  }

  savePriceList(): void {
    if (!this.newPriceListForm.code || !this.newPriceListForm.name) {
      this.showToast('error', 'Código y nombre son requeridos');
      return;
    }

    const payload: SavePriceListDto = {
      code: this.newPriceListForm.code,
      name: this.newPriceListForm.name,
      description: this.newPriceListForm.description || undefined,
      type: this.newPriceListForm.type,
      is_default: !!this.newPriceListForm.isDefault,
      // active_from: this.newPriceListForm.activeFrom === '' ? undefined : this.newPriceListForm.activeFrom,
      // active_to: this.newPriceListForm.activeTo === '' ? undefined : this.newPriceListForm.activeTo,
      is_active: true,
    };

    if (this.editingPriceList) {
      this.priceListsApi.update(this.editingPriceList.id, payload).subscribe({
        next: () => {
          this.showToast('success', 'Lista de precios actualizada');
          this.showPriceListForm = false;
          this.editingPriceList = null;
          this.loadPriceLists();
        },
        error: () => this.showToast('error', 'Error al actualizar lista de precios'),
      });
    } else {
      this.priceListsApi.create(payload).subscribe({
        next: () => {
          this.showToast('success', 'Lista de precios creada');
          this.showPriceListForm = false;
          this.loadPriceLists();
        },
        error: () => this.showToast('error', 'Error al crear lista de precios'),
      });
    }
  }

  closePriceListForm(): void {
    this.showPriceListForm = false;
    this.editingPriceList = null;
  }

  togglePriceListActive(priceList: PriceList): void {
    const newStatus = !priceList.isActive;
    this.priceListsApi
      .update(priceList.id, { is_active: newStatus, is_default: newStatus ? priceList.isDefault : false })
      .subscribe({
        next: (updated) => {
          priceList.isActive = updated.isActive;
          priceList.isDefault = updated.isDefault;
          this.showToast('success', `Lista de precios ${updated.isActive ? 'activada' : 'desactivada'}`);
        },
        error: () => this.showToast('error', 'No se pudo cambiar el estado de la lista'),
      });
  }

  // ============================================
  // PRODUCT PRICES TAB
  // ============================================

  get filteredProductPrices(): ProductPriceRow[] {
    if (this.productPriceShowOnly === 'unpriced') {
      // cuando estás viendo solo faltantes, no mostramos filas de precios
      return [];
    }

    return this.productPrices.filter((pp) => {
      const matchesList =
        !this.selectedPriceListForProducts ||
        pp.priceListId === this.selectedPriceListForProducts.id;

      let search = (this.productPriceSearchText || '').toLowerCase().trim();
      if (search.includes('(')) {
        search = search.split('(')[0].trim();
      }

      const matchesSearch =
        !search ||
        pp.productName.toLowerCase().includes(search);

      const matchesProduct =
        !this.productPriceFilterProductId ||
        pp.productId === this.productPriceFilterProductId;

      return matchesList && matchesSearch && matchesProduct;
    });
  }

  get filteredMissingPriceProducts(): MissingPriceItem[] {
    if (this.productPriceShowOnly === 'priced') {
      return [];
    }

    let term = (this.productPriceSearchText || '').toLowerCase().trim();
    if (term.includes('(')) {
      term = term.split('(')[0].trim();
    }

    return this.missingPriceProducts.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term);

      const matchesProduct =
        !this.productPriceFilterProductId ||
        p.productId === this.productPriceFilterProductId;

      return matchesSearch && matchesProduct;
    });
  }

  setProductPriceShowOnly(mode: 'all' | 'priced' | 'unpriced'): void {
    this.productPriceShowOnly = mode;
  }


  openProductPriceForm(productPrice?: ProductPriceRow): void {
    if (productPrice) {
      this.editingProductPrice = productPrice;

      this.newProductPriceForm = {
        productId: productPrice.productId,
        minQty: Number(productPrice.minQty),
        maxQty: productPrice.maxQty != null ? Number(productPrice.maxQty) : null,
        unitPrice: Number(productPrice.unitPrice),
        // validFrom: this.toDateInputValue(productPrice.validFrom) ?? '',
        // validTo: this.toDateInputValue(productPrice.validTo) ?? '',
      };

      this.selectedProductForPrice =
        this.products.find((p) => p.id === productPrice.productId) ?? null;

      this.selectedPriceListForPriceForm =
        this.priceLists.find((pl) => pl.id === productPrice.priceListId) ?? null;

    } else {
      this.editingProductPrice = null;
      this.newProductPriceForm = {
        productId: 0,
        minQty: 1,
        maxQty: null,
        unitPrice: 0,
        // validFrom: '',
        // validTo: '',
      };
      // si vienes desde "Agregar Precio" no habrá producto seleccionado
      // lo dejamos en null
      // this.selectedProductForPrice se setea desde fuera si es el caso
      this.selectedPriceListForPriceForm =
        this.selectedPriceListForProducts ??
        this.priceLists.find((pl) => pl.isDefault) ??
        this.priceLists[0] ??
        null;
    }

    // sincronizar el texto del input con el producto seleccionado (si lo hay)
    if (this.selectedProductForPrice) {
      this.productPriceProductSearch =
        `${this.selectedProductForPrice.name} (${this.selectedProductForPrice.sku})`;
    } else {
      this.productPriceProductSearch = '';
    }

    this.showProductPriceForm = true;
  }


  // mp: fila de missingProductPrices (puedes tiparlo con tu interfaz si ya la creaste)
  onAssignMissingPrice(mp: MissingPriceItem): void {
    this.selectedProductForPrice =
      this.products.find(p => p.id === mp.productId) ?? null;

    if (this.selectedProductForPrice) {
      this.productPriceProductSearch =
        `${this.selectedProductForPrice.name} (${this.selectedProductForPrice.sku})`;
    } else {
      this.productPriceProductSearch = '';
    }

    this.openProductPriceForm();
  }



  saveProductPrice(): void {
    if (
      !this.selectedProductForPrice ||
      !this.selectedPriceListForPriceForm ||
      this.newProductPriceForm.unitPrice <= 0
    ) {
      this.showToast('error', 'Producto, lista de precios y precio son requeridos');
      return;
    }

    const unitPrice = Number(this.newProductPriceForm.unitPrice);
    const minQty = Number(this.newProductPriceForm.minQty ?? 0);
    const maxQty =
      this.newProductPriceForm.maxQty !== null && this.newProductPriceForm.maxQty !== undefined
        ? Number(this.newProductPriceForm.maxQty)
        : undefined;

    const payload: SaveProductPriceDto = {
      product_id: this.selectedProductForPrice.id,
      price_list_id: this.selectedPriceListForPriceForm.id,
      unit_price: unitPrice,
      currency_code: 'PEN',
      min_qty: minQty,
      max_qty: maxQty,
      // valid_from: this.newProductPriceForm.validFrom || undefined,
      // valid_to: this.newProductPriceForm.validTo || undefined,
      is_active: true,
    };

    if (this.editingProductPrice) {
      this.productPricesApi.update(this.editingProductPrice.id, payload).subscribe({
        next: () => {
          this.showToast('success', 'Precio actualizado');
          this.showProductPriceForm = false;
          this.editingProductPrice = null;
          this.loadProductPricesForSelectedList();
          this.loadPriceCoverageForSelectedList();
        },
        error: () => this.showToast('error', 'Error al actualizar el precio'),
      });
    } else {
      this.productPricesApi.create(payload).subscribe({
        next: () => {
          this.showToast('success', 'Precio creado');
          this.showProductPriceForm = false;
          this.loadProductPricesForSelectedList();
          this.loadPriceCoverageForSelectedList();
        },
        error: () => this.showToast('error', 'Error al crear el precio'),
      });
    }
  }


  closeProductPriceForm(): void {
    this.showProductPriceForm = false;
    this.editingProductPrice = null;
    this.selectedProductForPrice = null;
    this.productPriceProductSearch = '';
  }

  // ============================================
  // DISCOUNT RULES TAB
  // ============================================

  get filteredDiscountRules(): DiscountRuleUi[] {
    console.log('🔍 allDiscountRules length:', this.allDiscountRules.length);
    console.log('🔍 filteredDiscountRules called');

    // Usar TODOS los descuentos para búsqueda global
    let filtered = this.allDiscountRules;

    // Aplicar filtro de búsqueda de texto
    if (this.discountRuleSearchText && this.discountRuleSearchText.trim() !== '') {
      const searchTerm = this.discountRuleSearchText.toLowerCase().trim();
      filtered = filtered.filter(dr => {
        const matchesName = dr.name.toLowerCase().includes(searchTerm);
        const matchesDescription = dr.description?.toLowerCase().includes(searchTerm) || false;
        return matchesName || matchesDescription;
      });
    }

    // Aplicar filtro de estado
    if (this.discountActiveFilter === 'active') {
      filtered = filtered.filter(dr => dr.isActive);
    } else if (this.discountActiveFilter === 'inactive') {
      filtered = filtered.filter(dr => !dr.isActive);
    }

    // Aplicar filtro de producto
    if (this.discountFilterProductId) {
      filtered = filtered.filter(dr => dr.productId === this.discountFilterProductId);
    }

    // Calcular paginación local
    const startIndex = (this.currentDiscountRulesPage - 1) * this.discountRulesLimit;
    const endIndex = startIndex + this.discountRulesLimit;

    // Actualizar total de páginas
    this.discountRulesTotalPages = Math.ceil(filtered.length / this.discountRulesLimit);

    // Devolver solo la página actual
    return filtered.slice(startIndex, endIndex);
  }

  getDiscountScope(dr: DiscountRuleUi): { type: string; name: string; icon: string; description: string } {
    if (dr.productId && dr.productName) {
      return {
        type: 'producto',
        name: dr.productName,
        icon: 'fas fa-box',
        description: dr.priceListId
          ? `Solo lista: ${dr.priceListName || dr.priceListCode || 'ID ' + dr.priceListId}`
          : 'Todas las listas de precios'
      };
    }

    if (dr.categoryId && dr.categoryName) {
      return {
        type: 'categoría',
        name: dr.categoryName,
        icon: 'fas fa-folder',
        description: dr.priceListId
          ? `Solo lista: ${dr.priceListName || dr.priceListCode || 'ID ' + dr.priceListId}`
          : 'Todas las listas de precios'
      };
    }

    if (dr.priceListId && dr.priceListName) {
      return {
        type: 'lista',
        name: dr.priceListName || '',
        icon: 'fas fa-list',
        description: `Solo para: ${dr.priceListCode || 'ID ' + dr.priceListId}`
      };
    }

    return {
      type: 'general',
      name: 'Aplicación general',
      icon: 'fas fa-globe',
      description: 'Todas las listas de precios'
    };
  }

  openDiscountRuleForm(discountRule?: DiscountRuleUi): void {
    if (discountRule) {
      this.editingDiscountRule = discountRule;
      this.newDiscountRuleForm = {
        name: discountRule.name,
        description: discountRule.description ?? '',
        discountType: discountRule.discountType,
        amount: discountRule.amount,
        minQty: discountRule.minQty ?? null,
        priority: discountRule.priority,
        autoApply: discountRule.autoApply,
        isExclusive: discountRule.isExclusive,
        productId: discountRule.productId ?? null,
        // 👇 IMPORTANTE: Asegurar que priceListId sea null si es undefined
        priceListId: discountRule.priceListId ?? null,
        startsAt: this.toDateInputValue(discountRule.startsAt),
        endsAt: this.toDateInputValue(discountRule.endsAt),
      };

      // Si hay un producto asociado, configurar la búsqueda en el modal
      if (discountRule.productId && discountRule.productName) {
        const product = this.products.find(p => p.id === discountRule.productId);
        if (product) {
          this.selectedModalProduct = product;
          this.modalProductSearch = `${product.name} (${product.sku})`;
        }
      } else {
        this.selectedModalProduct = null;
        this.modalProductSearch = '';
      }
    } else {
      this.editingDiscountRule = null;
      this.newDiscountRuleForm = {
        name: '',
        description: '',
        discountType: 'PERCENT',
        amount: 0,
        minQty: null,
        priority: 1,
        autoApply: false,
        isExclusive: false,
        productId: null,
        priceListId: null,  // 👈 Por defecto: null (todas las listas)
        startsAt: null,
        endsAt: null,
      };

      // Resetear la búsqueda del modal
      this.selectedModalProduct = null;
      this.modalProductSearch = '';
      this.modalProductSuggestions = [];
    }

    // Resetear sugerencias del modal
    this.modalProductSuggestions = [];

    this.showDiscountRuleForm = true;
  }

  saveDiscountRule(): void {
    if (!this.newDiscountRuleForm.name || this.newDiscountRuleForm.amount <= 0) {
      this.showToast('error', 'Nombre y monto de descuento son requeridos');
      return;
    }

    const amount = Number(this.newDiscountRuleForm.amount);
    const minQty = this.newDiscountRuleForm.minQty !== null
      ? Number(this.newDiscountRuleForm.minQty)
      : undefined;

    // 👇 CONSTRUCCIÓN DEL PAYLOAD CORRECTA
    const payload: SaveDiscountRuleDto = {
      name: this.newDiscountRuleForm.name,
      description: this.newDiscountRuleForm.description || undefined,
      discount_type: this.newDiscountRuleForm.discountType,
      amount,
      min_qty: minQty,
      priority: this.newDiscountRuleForm.priority,
      auto_apply: !!this.newDiscountRuleForm.autoApply,
      is_exclusive: !!this.newDiscountRuleForm.isExclusive,
      product_id: this.newDiscountRuleForm.productId ?? undefined,
      // 👇 CAMBIO CRÍTICO: ENVIAR null EXPLÍCITAMENTE
      price_list_id: this.newDiscountRuleForm.priceListId, // <-- ¡SIN el ??
      starts_at: this.newDiscountRuleForm.startsAt || undefined,
      ends_at: this.newDiscountRuleForm.endsAt || undefined,
      is_active: true,
    };

    if (this.editingDiscountRule) {
      this.discountRulesApi.update(this.editingDiscountRule.id, payload).subscribe({
        next: () => {
          this.showToast('success', 'Regla de descuento actualizada');
          this.showDiscountRuleForm = false;
          this.editingDiscountRule = null;
          this.loadDiscountRules();
        },
        error: () => this.showToast('error', 'Error al actualizar regla de descuento'),
      });
    } else {
      this.discountRulesApi.create(payload).subscribe({
        next: () => {
          this.showToast('success', 'Regla de descuento creada');
          this.showDiscountRuleForm = false;
          this.loadDiscountRules();
        },
        error: () => this.showToast('error', 'Error al crear regla de descuento'),
      });
    }
  }


  closeDiscountRuleForm(): void {
    this.showDiscountRuleForm = false;
    this.editingDiscountRule = null;

    // Limpiar la búsqueda del modal
    this.selectedModalProduct = null;
    this.modalProductSearch = '';
    this.modalProductSuggestions = [];
  }


  // ============================================
  // MÉTODOS PARA AUTOCOMPLETE DE DESCUENTOS
  // ============================================

  // Método para buscar productos en los filtros
  onDiscountProductSearch(): void {
    if (!this.discountFilterProductSearch || this.discountFilterProductSearch.trim() === '') {
      this.discountProductSuggestions = [];
      this.selectedDiscountProduct = null;
      return;
    }

    const searchTerm = this.discountFilterProductSearch.toLowerCase().trim();

    this.discountProductSuggestions = this.products
      .filter(product => {
        const matchesName = product.name.toLowerCase().includes(searchTerm);
        const matchesSku = product.sku.toLowerCase().includes(searchTerm);
        return matchesName || matchesSku;
      })
      .slice(0, 10); // Mostrar máximo 10 sugerencias
  }

  // Método para seleccionar producto en los filtros
  onSelectDiscountProductFilter(product: ProductLite): void {
    this.selectedDiscountProduct = product;
    this.discountFilterProductSearch = `${product.name} (${product.sku})`;
    this.discountFilterProductId = product.id;
    this.discountProductSuggestions = [];

    // Aplicar filtros automáticamente
    this.applyDiscountFilters();
  }

  // Método para buscar productos en el modal
  onModalProductSearch(): void {
    if (!this.modalProductSearch || this.modalProductSearch.trim() === '') {
      this.modalProductSuggestions = [];
      this.selectedModalProduct = null;
      return;
    }

    const searchTerm = this.modalProductSearch.toLowerCase().trim();

    this.modalProductSuggestions = this.products
      .filter(product => {
        const matchesName = product.name.toLowerCase().includes(searchTerm);
        const matchesSku = product.sku.toLowerCase().includes(searchTerm);
        return matchesName || matchesSku;
      })
      .slice(0, 10); // Mostrar máximo 10 sugerencias
  }

  // Método para seleccionar producto en el modal
  onSelectModalProduct(product: ProductLite): void {
    this.selectedModalProduct = product;
    this.modalProductSearch = `${product.name} (${product.sku})`;
    this.newDiscountRuleForm.productId = product.id;
    this.modalProductSuggestions = [];
  }




  // ============================================
  // COMBOS TAB
  // ============================================

  //filteredCombos: ComboUi[] = [];

  get filteredCombos(): ComboUi[] {
    // Usar TODOS los combos para búsqueda global
    console.log('🔍 Combos length:', this.allCombos.length);
    console.log('🔍 filteredCombos called');
    let filtered = this.allCombos; // <- ¡IMPORTANTE! Cambia esto

    // Aplicar filtro de búsqueda de texto
    if (this.comboSearchText && this.comboSearchText.trim() !== '') {
      const searchTerm = this.comboSearchText.toLowerCase().trim();
      filtered = filtered.filter(combo => {
        const matchesName = combo.name.toLowerCase().includes(searchTerm);
        const matchesCode = combo.code.toLowerCase().includes(searchTerm);
        return matchesName || matchesCode;
      });
    }

    // Aplicar filtro de estado
    if (this.comboActiveFilter === 'active') {
      filtered = filtered.filter(combo => combo.isActive);
    } else if (this.comboActiveFilter === 'inactive') {
      filtered = filtered.filter(combo => !combo.isActive);
    }

    // Calcular paginación local basada en los resultados filtrados
    const startIndex = (this.currentPage - 1) * this.limit;
    const endIndex = startIndex + this.limit;

    // Actualizar totalPages basado en filtered.length
    this.totalPages = Math.ceil(filtered.length / this.limit);

    // Ajustar currentPage si es necesario
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
      this.loadCurrentPageCombos();
    }

    // Devolver solo los combos de la página actual
    return filtered.slice(startIndex, endIndex);
  }


  // Método para buscar productos cuando se escribe
  onComboProductSearch(): void {
    if (!this.comboProductSearch || this.comboProductSearch.trim() === '') {
      this.comboProductSuggestions = [];
      this.selectedComboProduct = null;
      return;
    }

    const searchTerm = this.comboProductSearch.toLowerCase().trim();

    this.comboProductSuggestions = this.products
      .filter(product => {
        const matchesName = product.name.toLowerCase().includes(searchTerm);
        const matchesSku = product.sku.toLowerCase().includes(searchTerm);
        return matchesName || matchesSku;
      })
      .slice(0, 10); // Mostrar máximo 10 sugerencias
  }

  // Método para seleccionar un producto del autocomplete
  onSelectComboProduct(product: ProductLite): void {
    this.selectedComboProduct = product;
    this.comboProductSearch = `${product.name} (${product.sku})`;
    this.comboProductSuggestions = [];

    // Enfocar el campo de cantidad
    setTimeout(() => {
      const qtyInput = document.querySelector('.qty-input input') as HTMLInputElement;
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 50);
  }

  // Método para agregar producto al combo desde la búsqueda
  addComboItemFromSearch(): void {
    if (!this.selectedComboProduct || this.comboItemQty <= 0) {
      this.showToast('error', 'Selecciona un producto y especifica una cantidad válida');
      return;
    }

    // Verificar si el producto ya está en la lista
    const alreadyAdded = this.newComboItems.some(
      item => item.productId === this.selectedComboProduct!.id
    );

    if (alreadyAdded) {
      this.showToast('warning', 'Este producto ya está en el combo');
      return;
    }

    // Agregar a la lista
    this.newComboItems.push({
      productId: this.selectedComboProduct.id,
      productName: this.selectedComboProduct.name,
      qty: this.comboItemQty,
    });

    // Resetear la búsqueda
    this.comboProductSearch = '';
    this.selectedComboProduct = null;
    this.comboProductSuggestions = [];
    this.comboItemQty = 1;
  }


  openComboForm(combo?: ComboUi): void {
    if (combo) {
      this.editingCombo = combo;
      this.newComboForm = {
        code: combo.code,
        name: combo.name,
        description: combo.description ?? '',
        comboType: combo.comboType,
        comboPrice: combo.comboPrice ? Number(combo.comboPrice) : 0,
        discountPercent: combo.discountPercent ? Number(combo.discountPercent) : 0,
        autoApply: combo.autoApply,
        startsAt: this.toDateInputValue(combo.startsAt),
        endsAt: this.toDateInputValue(combo.endsAt),
      };
      this.newComboItems = [...combo.items];
    } else {
      this.editingCombo = null;
      this.newComboForm = {
        code: '',
        name: '',
        description: '',
        comboType: 'FIXED_PRICE',
        comboPrice: 0,
        discountPercent: 0,
        autoApply: false,
        startsAt: null,
        endsAt: null,
      };
      this.newComboItems = [];
    }

    // RESETEAR LA BÚSQUEDA DE PRODUCTOS
    this.comboProductSearch = '';
    this.selectedComboProduct = null;
    this.comboProductSuggestions = [];
    this.comboItemQty = 1;

    this.showComboForm = true;
  }


  addComboItem(): void {
    if (this.selectedProductForPrice) {
      this.newComboItems.push({
        productId: this.selectedProductForPrice.id,
        productName: this.selectedProductForPrice.name,
        qty: 1,
      });
    }
  }

  removeComboItem(idx: number): void {
    this.newComboItems.splice(idx, 1);
  }

  saveCombo(): void {
    if (!this.newComboForm.code || !this.newComboForm.name || this.newComboItems.length === 0) {
      this.showToast('error', 'Código, nombre e items son requeridos');
      return;
    }

    // CONVERTIR comboPrice y discountPercent a números
    const comboPrice = this.newComboForm.comboType === 'FIXED_PRICE'
      ? Number(this.newComboForm.comboPrice)  // <-- Convertir explícitamente
      : undefined;

    const discountPercent = this.newComboForm.comboType === 'PERCENT'
      ? Number(this.newComboForm.discountPercent)  // <-- Convertir explícitamente
      : undefined;

    // Validar que sean números válidos
    if (this.newComboForm.comboType === 'FIXED_PRICE' && isNaN(comboPrice!)) {
      this.showToast('error', 'El precio del combo debe ser un número válido');
      return;
    }

    if (this.newComboForm.comboType === 'PERCENT' && isNaN(discountPercent!)) {
      this.showToast('error', 'El porcentaje de descuento debe ser un número válido');
      return;
    }

    const payload: SaveComboDto = {
      code: this.newComboForm.code,
      name: this.newComboForm.name,
      description: this.newComboForm.description || undefined,
      combo_type: this.newComboForm.comboType,
      combo_price: comboPrice,  // <-- Usar la variable convertida
      discount_percent: discountPercent,  // <-- Usar la variable convertida
      auto_apply: this.newComboForm.autoApply,
      starts_at: this.newComboForm.startsAt || undefined,
      ends_at: this.newComboForm.endsAt || undefined,
      //is_active: true,
      items: this.newComboItems.map((it) => ({
        product_id: it.productId,
        qty: Number(it.qty),  // <-- También convertir qty por si acaso
      })),
    };

    const obs = this.editingCombo
      ? this.combosApi.update(this.editingCombo.id, payload)
      : this.combosApi.create(payload);

    obs.subscribe({
      next: () => {
        this.showToast('success', this.editingCombo ? 'Combo actualizado' : 'Combo creado');
        this.showComboForm = false;
        this.editingCombo = null;
        this.newComboItems = [];

        // Recargar ambos conjuntos de datos
        this.loadAllCombos();
        this.loadCurrentPageCombos();
      },
      error: () => this.showToast('error', 'Error al guardar combo'),
    });
  }

  closeComboForm(): void {
    this.showComboForm = false;
    this.editingCombo = null;
    this.newComboItems = [];

    // Limpiar la búsqueda
    this.comboProductSearch = '';
    this.selectedComboProduct = null;
    this.comboProductSuggestions = [];
    this.comboItemQty = 1;
  }

  // ============================================
  // PRICE SIMULATOR TAB
  // ============================================

  // calculateBestPrice(): void {
  //   if (!this.simulatorProduct || this.simulatorQty <= 0) {
  //     this.showToast('error', 'Selecciona producto y cantidad');
  //     return;
  //   }

  //   this.pricingQueryApi
  //     .getBestPrice(this.simulatorProduct.id, this.simulatorQty)
  //     .subscribe({
  //       next: (resp: BestPriceResponse) => {
  //         this.simulatorResult = {
  //           productId: resp.productId,
  //           productSku: this.simulatorProduct!.sku,
  //           productName: this.simulatorProduct!.name,
  //           qty: resp.qty,
  //           applied: resp.applied,
  //           options: resp.options,
  //         };
  //         this.showToast('success', 'Mejor precio calculado');
  //       },
  //       error: () => this.showToast('error', 'Error al calcular el mejor precio'),
  //     });
  // }


  productPriceProductSearch = '';

  onSelectProductFromSearch(): void {
    const match = this.products.find(p =>
      `${p.name} (${p.sku})`.toLowerCase() === this.productPriceProductSearch.toLowerCase()
    );
    this.selectedProductForPrice = match ?? null;
  }

  toggleDiscountRuleActive(dr: DiscountRuleUi): void {
    const newStatus = !dr.isActive;
    this.discountRulesApi.update(dr.id, { is_active: newStatus }).subscribe({
      next: (updated) => {
        dr.isActive = updated.isActive;
        this.showToast(
          'success',
          `Regla ${updated.isActive ? 'activada' : 'desactivada'}`,
        );
      },
      error: () => this.showToast('error', 'No se pudo cambiar el estado'),
    });
  }

  toggleComboActive(combo: ComboUi): void {
    const newStatus = !combo.isActive;
    this.combosApi.update(combo.id, { is_active: newStatus }).subscribe({
      next: (updated) => {
        combo.isActive = updated.isActive;
        this.showToast('success', `Combo ${updated.isActive ? 'activado' : 'desactivado'}`);

        // Recargar ambos conjuntos de datos
        this.loadAllCombos();
        this.loadCurrentPageCombos();
      },
      error: () => this.showToast('error', 'No se pudo cambiar el estado del combo'),
    });
  }


  // Métodos para el simulador
  onSimulatorProductSearch(): void {
    if (!this.simulatorProductSearch || this.simulatorProductSearch.trim() === '') {
      this.simulatorProductSuggestions = [];
      return;
    }

    const searchTerm = this.simulatorProductSearch.toLowerCase().trim();

    this.simulatorProductSuggestions = this.products
      .filter(product => {
        const matchesName = product.name.toLowerCase().includes(searchTerm);
        const matchesSku = product.sku.toLowerCase().includes(searchTerm);
        return matchesName || matchesSku;
      })
      .slice(0, 10);
  }

  onSelectSimulatorProduct(product: ProductLite): void {
    this.simulatorProduct = product;
    this.simulatorProductSearch = `${product.name} (${product.sku})`;
    this.simulatorProductSuggestions = [];
  }



  private toDateInputValue(date: string | null): string {
    if (!date) return '';

    try {
      // Parsear la fecha desde el string
      const utcDate = new Date(date);

      // Devolver solo la fecha (YYYY-MM-DD) 
      // El backend la interpretará como inicio del día UTC
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn('Error formateando fecha:', date, error);
      const parts = date.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      return '';
    }
  }

  formatDateForDisplay(dateString: string | null, format: string = 'dd/MM/yyyy'): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);

      // Asegurar que interpretamos la fecha como UTC
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      // Crear fecha local sin ajustes de zona horaria
      const localDate = new Date(year, month, day);

      if (format === 'dd/MM/yyyy') {
        const dayStr = String(localDate.getDate()).padStart(2, '0');
        const monthStr = String(localDate.getMonth() + 1).padStart(2, '0');
        const yearStr = localDate.getFullYear();
        return `${dayStr}/${monthStr}/${yearStr}`;
      } else if (format === 'yyyy-MM-dd') {
        const dayStr = String(localDate.getDate()).padStart(2, '0');
        const monthStr = String(localDate.getMonth() + 1).padStart(2, '0');
        const yearStr = localDate.getFullYear();
        return `${yearStr}-${monthStr}-${dayStr}`;
      }

      return dateString;
    } catch (error) {
      console.warn('Error formateando fecha para display:', dateString, error);
      return dateString || '';
    }
  }


  // Sugerencias para el filtro "Buscar Producto"
  get productPriceSuggestions(): ProductLite[] {
    const term = (this.productPriceSearchText || '').toLowerCase().trim();
    if (!term) return [];

    return this.products
      .filter((p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }

  onSelectProductPriceFilter(p: ProductLite): void {
    // texto que queda en el input
    this.productPriceSearchText = `${p.name} (${p.sku})`;
    // filtro exacto por ID si quieres restringir la tabla a ese producto
    this.productPriceFilterProductId = p.id;
  }


  private loadPriceCoverageForSelectedList(): void {
    if (!this.selectedPriceListForProducts) {
      this.priceCoverage = null;
      this.missingPriceProducts = [];
      return;
    }

    this.productPricesApi
      .getCoverageByPriceList(this.selectedPriceListForProducts.id)
      .subscribe({
        next: (stats) => {
          this.priceCoverage = stats;
          this.missingPriceProducts = stats.items ?? [];
        },
        error: () => {
          this.priceCoverage = null;
          this.missingPriceProducts = [];
          this.showToast('error', 'Error al cargar cobertura de precios');
        },
      });
  }


  onComboSearchChange(): void {
    // Limpiar sugerencias si el campo está vacío
    if (!this.comboSearchText || this.comboSearchText.trim() === '') {
      this.comboSearchSuggestions = [];
      return;
    }

    const searchTerm = this.comboSearchText.toLowerCase().trim();

    // Filtrar TODOS los combos para sugerencias
    this.comboSearchSuggestions = this.allCombos.filter(combo => {
      const matchesName = combo.name.toLowerCase().includes(searchTerm);
      const matchesCode = combo.code.toLowerCase().includes(searchTerm);
      return matchesName || matchesCode;
    }).slice(0, 8); // Limitar a 8 sugerencias máximo
  }

  private updateComboSearchSuggestions(): void {
    if (!this.comboSearchText || this.comboSearchText.trim() === '') {
      this.comboSearchSuggestions = [];
      return;
    }

    this.onComboSearchChange(); // Recalcular sugerencias con todos los combos
  }

  onSelectComboSearchFilter(combo: ComboUi): void {
    this.comboSearchText = combo.name;
    this.comboSearchSuggestions = [];

    // Resetear a página 1 cuando se selecciona un combo
    this.currentPage = 1;

    // No necesitas recargar, el getter filteredCombos ya filtra
  }


  // En pricing.ts
  private isDiscountActiveBasedOnDates(discount: DiscountRuleUi): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Si tiene fecha de inicio y es futura
    if (discount.startsAt) {
      const startDate = new Date(discount.startsAt);
      startDate.setHours(0, 0, 0, 0);

      if (startDate > today) {
        return false;
      }
    }

    // Si tiene fecha de fin y ya pasó
    if (discount.endsAt) {
      const endDate = new Date(discount.endsAt);
      endDate.setHours(0, 0, 0, 0);

      if (endDate < today) {
        return false;
      }
    }

    return discount.isActive;
  }

  // Usar en la vista para mostrar estado correcto
  getDiscountStatus(dr: DiscountRuleUi): { isActive: boolean, statusText: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dr.startsAt) {
      const startDate = new Date(dr.startsAt);
      startDate.setHours(0, 0, 0, 0);

      if (startDate > today) {
        return {
          isActive: false,
          statusText: `Programado (inicia ${this.formatDateForDisplay(dr.startsAt)})`
        };
      }
    }

    if (dr.endsAt) {
      const endDate = new Date(dr.endsAt);
      endDate.setHours(0, 0, 0, 0);

      if (endDate < today) {
        return {
          isActive: false,
          statusText: 'Expirado'
        };
      }
    }

    return {
      isActive: dr.isActive,
      statusText: dr.isActive ? 'Activo' : 'Inactivo'
    };
  }


  private isComboActiveBasedOnDates(combo: ComboUi): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Si tiene fecha de inicio y es futura
    if (combo.startsAt) {
      const startDate = new Date(combo.startsAt);
      startDate.setHours(0, 0, 0, 0);

      if (startDate > today) {
        return false;
      }
    }

    // Si tiene fecha de fin y ya pasó
    if (combo.endsAt) {
      const endDate = new Date(combo.endsAt);
      endDate.setHours(0, 0, 0, 0);

      if (endDate < today) {
        return false;
      }
    }

    return combo.isActive;
  }

  getComboStatus(combo: ComboUi): { isActive: boolean, statusText: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (combo.startsAt) {
      const startDate = new Date(combo.startsAt);
      startDate.setHours(0, 0, 0, 0);

      if (startDate > today) {
        return {
          isActive: false,
          statusText: `Programado (inicia ${this.formatDateForDisplay(combo.startsAt)})`
        };
      }
    }

    if (combo.endsAt) {
      const endDate = new Date(combo.endsAt);
      endDate.setHours(0, 0, 0, 0);

      if (endDate < today) {
        return {
          isActive: false,
          statusText: 'Expirado'
        };
      }
    }

    return {
      isActive: combo.isActive,
      statusText: combo.isActive ? 'Activo' : 'Inactivo'
    };
  }


  setSimulatorMode(mode: 'simple' | 'advanced' | 'audit'): void {
    this.simulatorMode = mode;
    if (mode === 'simple') {
      this.includeTechnicalDetails = false;
    } else if (mode === 'advanced') {
      this.includeTechnicalDetails = true;
    }
  }

  // Simulación simple (mejorar la existente)
  calculateBestPrice(): void {
    if (!this.simulatorProduct || this.simulatorQty <= 0) {
      this.showToast('error', 'Selecciona producto y cantidad');
      return;
    }

    const query: SimulationQuery = {
      product_id: this.simulatorProduct.id,
      qty: this.simulatorQty,
      include_combos: true,
      include_technical_details: false,
      mode: 'simple',
    };

    this.simulationApi.simulate(query).subscribe({
      next: (result) => {
        this.simulationResult = result;
        this.showToast('success', 'Simulación completada');
      },
      error: (err) => {
        console.error('Error en simulación:', err);
        this.showToast('error', 'Error al calcular precio');
      },
    });
  }

  // Simulación avanzada
  runAdvancedSimulation(): void {
    if (!this.simulationProductSearch.trim()) {
      this.showToast('error', 'Selecciona un producto');
      return;
    }

    // Determinar si es producto o combo
    const isCombo = this.simulationProductSearch.includes('[');
    let productId: number | undefined;
    let comboId: number | undefined;

    if (isCombo) {
      const match = this.allCombos.find(c =>
        this.simulationProductSearch.includes(c.code) ||
        this.simulationProductSearch.includes(c.name)
      );
      if (match) comboId = match.id;
    } else {
      const match = this.products.find(p =>
        this.simulationProductSearch.includes(p.sku) ||
        this.simulationProductSearch.includes(p.name)
      );
      if (match) productId = match.id;
    }

    if (!productId && !comboId) {
      this.showToast('error', 'No se encontró el producto/combo');
      return;
    }

    const query: SimulationQuery = {
      product_id: productId,
      combo_id: comboId,
      qty: this.simulationQty,
      price_list_code: this.simulationPriceList || undefined,
      date: this.simulationDate || undefined,
      user_permissions: this.simulationPermissions
        ? this.simulationPermissions.split(',').map(p => p.trim())
        : undefined,
      include_combos: this.includeCombos,
      include_technical_details: this.includeTechnicalDetails,
      mode: 'advanced',
    };

    this.simulationApi.simulate(query).subscribe({
      next: (result) => {
        this.simulationResult = result;
        this.showToast('success', 'Simulación avanzada completada');
      },
      error: (err) => {
        console.error('Error en simulación avanzada:', err);
        this.showToast('error', 'Error al calcular precio');
      },
    });
  }

  // Búsqueda de productos/combos para simulador avanzado
  onSimulationSearch(): void {
    if (!this.simulationProductSearch.trim()) {
      this.simulationSuggestions = [];
      return;
    }

    const term = this.simulationProductSearch.toLowerCase().trim();

    // Buscar productos
    const productMatches = this.products
      .filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      )
      .map(p => ({
        type: 'product',
        id: p.id,
        name: p.name,
        code: p.sku,
        sku: p.sku
      }));

    // Buscar combos
    const comboMatches = this.allCombos
      .filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term)
      )
      .map(c => ({
        type: 'combo',
        id: c.id,
        name: c.name,
        code: c.code,
        sku: c.code
      }));

    this.simulationSuggestions = [...productMatches, ...comboMatches].slice(0, 10);
  }

  onSelectSimulationItem(item: any): void {
    if (item.type === 'product') {
      this.simulationProductSearch = `${item.name} (${item.sku})`;
    } else {
      this.simulationProductSearch = `${item.name} [${item.code}]`;
    }
    this.simulationSuggestions = [];
  }

  // Auditoría - Pruebas en lote
  async runBatchTests(): Promise<void> {
    this.runningBatchTests = true;
    this.batchResults = [];

    try {
      // Obtener IDs de productos (limitamos a 5 para pruebas)
      const productIds = this.products.slice(0, 5).map(p => p.id);

      // Definir cantidades a probar
      const quantities = [1, 5, 10, 20, 50];

      // Obtener códigos de listas de precios
      const priceListCodes = this.priceLists.slice(0, 3).map(pl => pl.code);

      const query: BatchSimulationQuery = {
        product_ids: productIds,
        quantities: quantities,
        price_list_codes: priceListCodes,
      };

      this.simulationApi.batchSimulate(query).subscribe({
        next: (results) => {
          this.batchResults = results;
          this.runningBatchTests = false;
          this.showToast('success', `Pruebas completadas: ${results.length} simulaciones`);
        },
        error: (err) => {
          console.error('Error en pruebas en lote:', err);
          this.runningBatchTests = false;
          this.showToast('error', 'Error en pruebas en lote');
        },
      });
    } catch (error) {
      this.runningBatchTests = false;
      this.showToast('error', 'Error al ejecutar pruebas');
    }
  }

  // Descargar reporte de auditoría
  downloadAuditReport(format: 'csv'): void {
    if (this.batchResults.length === 0) {
      this.showToast('warning', 'Primero ejecuta las pruebas en lote');
      return;
    }

    // Obtener parámetros de las pruebas ejecutadas
    const productIds = [...new Set(this.batchResults.map(r => r.productId).filter(Boolean))] as number[];
    const quantities = [...new Set(this.batchResults.map(r => r.qty))];
    const priceListCodes = [...new Set(this.batchResults.map(r => r.selectedOption?.priceListCode).filter(Boolean))] as string[];

    const query: BatchSimulationQuery = {
      product_ids: productIds,
      quantities: quantities,
      price_list_codes: priceListCodes,
    };

    this.simulationApi.downloadAuditReport(query).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria-precios-${new Date().getTime()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('success', 'Reporte descargado exitosamente');
      },
      error: (err) => {
        console.error('Error al descargar reporte:', err);
        this.showToast('error', 'Error al descargar reporte');
      },
    });
  }

  // Helpers para el template
  getTotalComboSavings(result: SimulationResult): number {
    if (!result.priceBreakdown.combos.applied.length) return 0;
    return result.priceBreakdown.combos.applied.reduce((sum, combo) =>
      sum + (combo.savings || 0), 0
    );
  }

  getCorrectRulesCount(): number {
    if (!this.batchResults) return 0;
    return this.batchResults.reduce((count, result) =>
      count + result.priceBreakdown.discounts.details.filter(d => d.applied).length, 0
    );
  }

  getOverlappingCombosCount(): number {
    if (!this.batchResults) return 0;
    return this.batchResults.reduce((count, result) =>
      count + (result.priceBreakdown.combos.applied.length > 1 ? 1 : 0), 0
    );
  }

  getProblematicRulesCount(): number {
    if (!this.batchResults) return 0;
    return this.batchResults.reduce((count, result) =>
      count + result.validationIssues.filter(i => i.type === 'ERROR').length, 0
    );
  }

  // Ejemplos predefinidos
  loadExample(type: 'config' | 'training' | 'troubleshoot'): void {
    switch (type) {
      case 'config':
        if (this.products.length > 0) {
          this.simulationProductSearch = `${this.products[0].name} (${this.products[0].sku})`;
        }
        this.simulationQty = 10;
        this.simulationDate = '2024-12-15';
        this.includeCombos = true;
        this.includeTechnicalDetails = true;
        break;
      case 'training':
        if (this.products.length > 1) {
          this.simulationProductSearch = `${this.products[1].name} (${this.products[1].sku})`;
        }
        this.simulationQty = 20;
        this.simulationPriceList = 'WHOLESALE';
        this.includeCombos = true;
        break;
      case 'troubleshoot':
        if (this.products.length > 2) {
          this.simulationProductSearch = `${this.products[2].name} (${this.products[2].sku})`;
        }
        this.simulationQty = 5;
        this.simulationPermissions = 'apply_special_discount';
        this.includeTechnicalDetails = true;
        break;
    }
    this.showToast('info', 'Ejemplo cargado. Haz clic en "Calcular y Analizar"');
  }



  // ============================================
  // HELPER METHODS PARA TEMPLATES
  // ============================================

  getAppliedDiscountsCount(result: SimulationResult): number {
    if (!result?.priceBreakdown?.discounts?.details) return 0;
    return result.priceBreakdown.discounts.details.filter(d => d.applied).length;
  }

  hasValidationErrors(result: SimulationResult): boolean {
    if (!result?.validationIssues) return false;
    return result.validationIssues.filter(i => i.type === 'ERROR').length > 0;
  }

  getValidationErrorsCount(result: SimulationResult): number {
    if (!result?.validationIssues) return 0;
    return result.validationIssues.filter(i => i.type === 'ERROR').length;
  }


  // ============================================
  // TOASTS
  // ============================================

  showToast(type: ToastType, message: string): void {
    const toast: Toast = { id: this.toastCounter++, type, message };
    this.toasts.push(toast);

    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== toast.id);
    }, 3000);
  }

  getToastIcon(type: ToastType): string {
    const icons: { [key: string]: string } = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
    };
    return icons[type] || 'fas fa-info-circle';
  }


}
