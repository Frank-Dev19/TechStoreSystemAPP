// src/app/pages/pricing/pricing.ts
import { Component, OnInit } from '@angular/core';

import {
  PriceList,
  PriceListType,
  CategoryLite,
  ProductLite,
  ProductPriceRow,
  DiscountRuleUi,
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

} from '../../models/pricing/pricing.models';

import { PriceListsApiService } from '../../services/pricing/price-lists-api.service';
import { ProductPricesApiService } from '../../services/pricing/product-prices-api.service';
import { DiscountRulesApiService } from '../../services/pricing/discount-rules-api.service';
import { CombosApiService } from '../../services/pricing/combos-api.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';

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



  productPriceFilterProductId: number | null = null;

  applyProductPriceFilters(): void {
    // La tabla ya se filtra reactivo, así que este método puede quedarse vacío.
    // Lo dejamos por UX (el usuario siente que “dispara” la búsqueda).
  }

  resetProductPriceFilters(): void {
    this.productPriceSearchText = '';
    this.productPriceFilterProductId = null;
  }

  applyDiscountFilters(): void {
    // Igual que antes, todo es reactivo, el botón es UX.
  }

  resetDiscountFilters(): void {
    this.discountRuleSearchText = '';
    this.discountFilterProductId = null;
    this.discountActiveFilter = '';
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
    activeFrom: string;
    activeTo: string;
  } = {
      code: '',
      name: '',
      description: '',
      type: 'RETAIL',
      isDefault: false,
      activeFrom: '',
      activeTo: '',
    };

  newProductPriceForm: {
    productId: number;
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
    validFrom: string;
    validTo: string;
  } = {
      productId: 0,
      minQty: 1,
      maxQty: null,
      unitPrice: 0,
      validFrom: '',
      validTo: '',
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
  ) { }

  // ============================================
  // INIT
  // ============================================
  ngOnInit(): void {
    this.loadInitialData();
    this.loadCombos();
  }

  private loadInitialData(): void {
    this.loadPriceLists();
    this.loadProducts();
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
    this.discountRulesApi.list().subscribe({
      next: (rows) => {
        this.discountRules = rows;
      },
      error: () => this.showToast('error', 'Error al cargar reglas de descuento'),
    });
  }




  loadCombos(): void {
    this.combosApi.list({
      page: this.currentPage,
      limit: this.limit,
      activeOnly: this.comboActiveFilter || ''
    }).subscribe({
      next: (response) => {
        // response es de tipo PaginatedResponse<ComboUi>
        this.combos = response.data.map(combo => this.mapComboBackendToUi(combo));
        this.totalPages = response.pagination.totalPages;
      },
      error: () => this.showToast('error', 'Error al cargar combos'),
    });
  }



  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return; // Si la página es inválida, no hacer nada
    this.currentPage = page;
    this.loadCombos();
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
      validFrom: r.validFrom ?? null,
      validTo: r.validTo ?? null,
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
        activeFrom: this.toDateInputValue(priceList.activeFrom),
        activeTo: this.toDateInputValue(priceList.activeTo),
      };
    } else {
      this.editingPriceList = null;
      this.newPriceListForm = {
        code: '',
        name: '',
        description: '',
        type: 'RETAIL',
        isDefault: false,
        activeFrom: '',
        activeTo: '',
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
      active_from: this.newPriceListForm.activeFrom === '' ? undefined : this.newPriceListForm.activeFrom,
      active_to: this.newPriceListForm.activeTo === '' ? undefined : this.newPriceListForm.activeTo,
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
        validFrom: this.toDateInputValue(productPrice.validFrom) ?? '',
        validTo: this.toDateInputValue(productPrice.validTo) ?? '',
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
        validFrom: '',
        validTo: '',
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
      currency_code: 'USD',
      min_qty: minQty,
      max_qty: maxQty,
      valid_from: this.newProductPriceForm.validFrom || undefined,
      valid_to: this.newProductPriceForm.validTo || undefined,
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
    return this.discountRules.filter((dr) => {
      const matchesSearch =
        dr.name.toLowerCase().includes(this.discountRuleSearchText.toLowerCase());

      const matchesProduct =
        !this.discountFilterProductId ||
        dr.productId === this.discountFilterProductId;

      const matchesActive =
        this.discountActiveFilter === ''
          ? true
          : this.discountActiveFilter === 'active'
            ? dr.isActive
            : !dr.isActive;

      return matchesSearch && matchesProduct && matchesActive;
    });
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
        priceListId: discountRule.priceListId ?? null,
        startsAt: this.toDateInputValue(discountRule.startsAt),
        endsAt: this.toDateInputValue(discountRule.endsAt),
      };
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
        priceListId: null,
        startsAt: null,
        endsAt: null,
      };
    }
    this.showDiscountRuleForm = true;
  }


  saveDiscountRule(): void {
    if (!this.newDiscountRuleForm.name || this.newDiscountRuleForm.amount <= 0) {
      this.showToast('error', 'Nombre y monto de descuento son requeridos');
      return;
    }

    const amount = Number(this.newDiscountRuleForm.amount);
    const minQty =
      this.newDiscountRuleForm.minQty !== null && this.newDiscountRuleForm.minQty !== undefined
        ? Number(this.newDiscountRuleForm.minQty)
        : undefined;

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
      price_list_id: this.newDiscountRuleForm.priceListId ?? undefined,
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
  }

  // ============================================
  // COMBOS TAB
  // ============================================

  //filteredCombos: ComboUi[] = [];

  get filteredCombos(): ComboUi[] {
    // Primero, filtrar por texto de búsqueda
    let filtered = this.combos;

    if (this.comboSearchText && this.comboSearchText.trim() !== '') {
      const searchTerm = this.comboSearchText.toLowerCase().trim();
      filtered = filtered.filter(combo => {
        const matchesName = combo.name.toLowerCase().includes(searchTerm);
        const matchesCode = combo.code.toLowerCase().includes(searchTerm);
        return matchesName || matchesCode;
      });
    }

    // Luego filtrar por estado si hay filtro aplicado
    if (this.comboActiveFilter === 'active') {
      filtered = filtered.filter(combo => combo.isActive);
    } else if (this.comboActiveFilter === 'inactive') {
      filtered = filtered.filter(combo => !combo.isActive);
    }

    return filtered;
  }

  openComboForm(combo?: ComboUi): void {
    if (combo) {
      this.editingCombo = combo;
      this.newComboForm = {
        code: combo.code,
        name: combo.name,
        description: combo.description ?? '',
        comboType: combo.comboType,
        comboPrice: combo.comboPrice ?? 0,
        discountPercent: combo.discountPercent ?? 0,
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

    const payload: SaveComboDto = {
      code: this.newComboForm.code,
      name: this.newComboForm.name,
      description: this.newComboForm.description || undefined,
      combo_type: this.newComboForm.comboType,
      combo_price: this.newComboForm.comboType === 'FIXED_PRICE'
        ? this.newComboForm.comboPrice ?? 0
        : undefined,
      discount_percent: this.newComboForm.comboType === 'PERCENT'
        ? this.newComboForm.discountPercent ?? 0
        : undefined,
      auto_apply: this.newComboForm.autoApply,
      starts_at: this.newComboForm.startsAt || undefined,
      ends_at: this.newComboForm.endsAt || undefined,
      is_active: true,
      items: this.newComboItems.map((it) => ({
        product_id: it.productId,
        qty: it.qty,
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
        this.loadCombos();
      },
      error: () => this.showToast('error', 'Error al guardar combo'),
    });
  }

  closeComboForm(): void {
    this.showComboForm = false;
    this.editingCombo = null;
    this.newComboItems = [];
  }

  // ============================================
  // PRICE SIMULATOR TAB
  // ============================================

  calculateBestPrice(): void {
    if (!this.simulatorProduct || this.simulatorQty <= 0) {
      this.showToast('error', 'Selecciona producto y cantidad');
      return;
    }

    this.pricingQueryApi
      .getBestPrice(this.simulatorProduct.id, this.simulatorQty)
      .subscribe({
        next: (resp: BestPriceResponse) => {
          this.simulatorResult = {
            productId: resp.productId,
            productSku: this.simulatorProduct!.sku,
            productName: this.simulatorProduct!.name,
            qty: resp.qty,
            applied: resp.applied,
            options: resp.options,
          };
          this.showToast('success', 'Mejor precio calculado');
        },
        error: () => this.showToast('error', 'Error al calcular el mejor precio'),
      });
  }


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
        this.showToast(
          'success',
          `Combo ${updated.isActive ? 'activado' : 'desactivado'}`,
        );
      },
      error: () => this.showToast('error', 'No se pudo cambiar el estado del combo'),
    });
  }

  private toDateInputValue(date: string | null): string {
    if (!date) return '';
    return date.split('T')[0];
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

    // Filtrar combos existentes para mostrar sugerencias
    this.comboSearchSuggestions = this.combos.filter(combo => {
      const matchesName = combo.name.toLowerCase().includes(searchTerm);
      const matchesCode = combo.code.toLowerCase().includes(searchTerm);
      return matchesName || matchesCode;
    }).slice(0, 8); // Limitar a 8 sugerencias máximo
  }

  onSelectComboSearchFilter(combo: ComboUi): void {
    // Cuando se selecciona una sugerencia, llenar el campo de búsqueda
    this.comboSearchText = combo.name;
    this.comboSearchSuggestions = [];

    // También puedes filtrar automáticamente la lista de combos
    // O puedes dejar que el getter filteredCombos haga el trabajo
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
