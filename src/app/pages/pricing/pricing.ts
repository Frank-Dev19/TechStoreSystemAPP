// src/app/pages/pricing/pricing.ts
import { Component, OnInit } from '@angular/core';
import {
  PricingConfig,
  TaxConfig,
  PriceCalculation,
  Toast,
  ToastType,
  CategoryLite,
  ProductLite,
} from '../../models/pricing/pricing.models';

import { PricingConfigApiService } from '../../services/pricing/pricing-config-api.service';
import { TaxConfigApiService } from '../../services/pricing/tax-config-api.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { SalesApiService, IncomeTaxReport } from '../../services/sales/sales-api.service';
import { CurrentUserService } from '../../services/current-user.service';
import { config } from '../../../environments/environment';

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
  activeTab = 'globalTab';

  // ============================================
  // DATA
  // ============================================
  configs: PricingConfig[] = [];
  taxes: TaxConfig[] = [];
  products: ProductLite[] = [];
  categories: CategoryLite[] = [];

  // Configuración global (productId=null, categoryId=null)
  globalConfig: PricingConfig | null = null;
  categoryConfigs: PricingConfig[] = [];
  productConfigs: PricingConfig[] = [];

  // ============================================
  // FORMULARIOS
  // ============================================
  showConfigForm = false;
  editingConfig: PricingConfig | null = null;
  configForm = {
    productId: null as number | null,
    categoryId: null as number | null,
    profitMarginPct: 15,
    maxDiscountPct: 7,
  };
  configFormScope: 'global' | 'category' | 'product' = 'global';

  showTaxForm = false;
  editingTax: TaxConfig | null = null;
  taxForm = {
    name: '',
    ratePct: 0,
  };

  // ============================================
  // SIMULADOR
  // ============================================
  simulatorProductSearch = '';
  simulatorProductSuggestions: ProductLite[] = [];
  simulatorProduct: ProductLite | null = null;
  simulatorDiscountPct = 0;
  simulatorResult: PriceCalculation | null = null;

  // ============================================
  // REPORTE RENTA
  // ============================================
  taxReportYear = new Date().getFullYear();
  incomeTaxReport: IncomeTaxReport | null = null;
  isLoadingTaxReport = false;

  // ============================================
  // TOASTS
  // ============================================
  toasts: Toast[] = [];
  private toastCounter = 0;

  // ============================================
  // CONSTRUCTOR
  // ============================================
  constructor(
    private configApi: PricingConfigApiService,
    private taxApi: TaxConfigApiService,
    private queryApi: PricingQueryApiService,
    private productsApi: PricingProductsApiService,
    private salesApi: SalesApiService,
    private currentUser: CurrentUserService,
  ) {}

  // ============================================
  // INIT
  // ============================================
  ngOnInit(): void {
    this.loadConfigs();
    this.loadTaxes();
    this.loadProducts();
    this.loadIncomeTaxReport();
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================
  loadConfigs(): void {
    this.configApi.list().subscribe({
      next: (data) => {
        this.configs = data;
        this.globalConfig = data.find(c => !c.productId && !c.categoryId) || null;
        this.categoryConfigs = data.filter(c => c.categoryId && !c.productId);
        this.productConfigs = data.filter(c => c.productId);
      },
      error: () => this.showToast('error', 'Error al cargar configuraciones de márgenes'),
    });
  }

  loadTaxes(): void {
    this.taxApi.list().subscribe({
      next: (data) => {
        this.taxes = data;
      },
      error: () => this.showToast('error', 'Error al cargar configuración de impuestos'),
    });
  }

  loadProducts(): void {
    this.productsApi.list().subscribe({
      next: (data) => {
        this.products = data.map(p => this.productsApi.mapToProductLite(p));
        // Extraer categorías únicas
        const catMap = new Map<string, CategoryLite>();
        this.products.forEach(p => {
          if (p.categoryName && !catMap.has(p.categoryName)) {
            catMap.set(p.categoryName, { id: 0, name: p.categoryName });
          }
        });
        this.categories = Array.from(catMap.values());
      },
      error: () => this.showToast('error', 'Error al cargar productos'),
    });
  }

  loadIncomeTaxReport(): void {
    const companyId = Number(config.defaultCompanyId ?? 1) || 1;

    this.isLoadingTaxReport = true;
    this.salesApi.getIncomeTaxReport(companyId, this.taxReportYear).subscribe({
      next: (data) => {
        this.incomeTaxReport = data;
        this.isLoadingTaxReport = false;
      },
      error: () => {
        this.showToast('error', 'Error al cargar el reporte de rentas');
        this.isLoadingTaxReport = false;
      }
    });
  }

  changeTaxReportYear(change: number): void {
    this.taxReportYear += change;
    this.loadIncomeTaxReport();
  }

  // ============================================
  // TAB NAVIGATION
  // ============================================
  selectTab(tab: string): void {
    this.activeTab = tab;
  }

  // ============================================
  // CONFIGURACIÓN GLOBAL
  // ============================================
  openGlobalConfigForm(): void {
    this.configFormScope = 'global';
    if (this.globalConfig) {
      this.editingConfig = this.globalConfig;
      this.configForm = {
        productId: null,
        categoryId: null,
        profitMarginPct: Number(this.globalConfig.profitMarginPct),
        maxDiscountPct: Number(this.globalConfig.maxDiscountPct),
      };
    } else {
      this.editingConfig = null;
      this.configForm = { productId: null, categoryId: null, profitMarginPct: 15, maxDiscountPct: 7 };
    }
    this.showConfigForm = true;
  }

  openCategoryConfigForm(cfg?: PricingConfig): void {
    this.configFormScope = 'category';
    if (cfg) {
      this.editingConfig = cfg;
      this.configForm = {
        productId: null,
        categoryId: cfg.categoryId,
        profitMarginPct: Number(cfg.profitMarginPct),
        maxDiscountPct: Number(cfg.maxDiscountPct),
      };
    } else {
      this.editingConfig = null;
      this.configForm = { productId: null, categoryId: null, profitMarginPct: 15, maxDiscountPct: 7 };
    }
    this.showConfigForm = true;
  }

  openProductConfigForm(cfg?: PricingConfig): void {
    this.configFormScope = 'product';
    if (cfg) {
      this.editingConfig = cfg;
      this.configForm = {
        productId: cfg.productId,
        categoryId: null,
        profitMarginPct: Number(cfg.profitMarginPct),
        maxDiscountPct: Number(cfg.maxDiscountPct),
      };
    } else {
      this.editingConfig = null;
      this.configForm = { productId: null, categoryId: null, profitMarginPct: 15, maxDiscountPct: 7 };
    }
    this.showConfigForm = true;
  }

  closeConfigForm(): void {
    this.showConfigForm = false;
    this.editingConfig = null;
  }

  saveConfig(): void {
    if (this.editingConfig) {
      this.configApi.update(this.editingConfig.id, {
        profit_margin_pct: this.configForm.profitMarginPct,
        max_discount_pct: this.configForm.maxDiscountPct,
      }).subscribe({
        next: () => {
          this.showToast('success', 'Configuración actualizada');
          this.closeConfigForm();
          this.loadConfigs();
        },
        error: () => this.showToast('error', 'Error al actualizar'),
      });
    } else {
      this.configApi.create({
        product_id: this.configForm.productId,
        category_id: this.configForm.categoryId,
        profit_margin_pct: this.configForm.profitMarginPct,
        max_discount_pct: this.configForm.maxDiscountPct,
      }).subscribe({
        next: () => {
          this.showToast('success', 'Configuración creada');
          this.closeConfigForm();
          this.loadConfigs();
        },
        error: (err) => this.showToast('error', err?.error?.message || 'Error al crear'),
      });
    }
  }

  deleteConfig(id: number): void {
    if (!confirm('¿Eliminar esta configuración?')) return;
    this.configApi.remove(id).subscribe({
      next: () => {
        this.showToast('success', 'Configuración eliminada');
        this.loadConfigs();
      },
      error: () => this.showToast('error', 'Error al eliminar'),
    });
  }

  // ============================================
  // IMPUESTOS
  // ============================================
  openTaxForm(tax: TaxConfig): void {
    if (tax.isFixed) {
      this.showToast('warning', 'Este impuesto no puede ser editado');
      return;
    }
    this.editingTax = tax;
    this.taxForm = { name: tax.name, ratePct: Number(tax.ratePct) };
    this.showTaxForm = true;
  }

  closeTaxForm(): void {
    this.showTaxForm = false;
    this.editingTax = null;
  }

  saveTax(): void {
    if (!this.editingTax) return;
    this.taxApi.update(this.editingTax.id, {
      name: this.taxForm.name,
      rate_pct: this.taxForm.ratePct,
    }).subscribe({
      next: () => {
        this.showToast('success', 'Impuesto actualizado');
        this.closeTaxForm();
        this.loadTaxes();
      },
      error: () => this.showToast('error', 'Error al actualizar impuesto'),
    });
  }

  // ============================================
  // SIMULADOR
  // ============================================
  onSimulatorProductSearch(): void {
    const term = this.simulatorProductSearch.toLowerCase().trim();
    if (term.length < 2) {
      this.simulatorProductSuggestions = [];
      return;
    }
    this.simulatorProductSuggestions = this.products
      .filter(p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
      .slice(0, 10);
  }

  selectSimulatorProduct(product: ProductLite): void {
    this.simulatorProduct = product;
    this.simulatorProductSearch = `${product.name} (${product.sku})`;
    this.simulatorProductSuggestions = [];
    this.simulatorDiscountPct = 0;
    this.runSimulation();
  }

  clearSimulatorProduct(): void {
    this.simulatorProduct = null;
    this.simulatorProductSearch = '';
    this.simulatorResult = null;
    this.simulatorDiscountPct = 0;
  }

  runSimulation(): void {
    if (!this.simulatorProduct) return;
    this.queryApi.calculatePrice(this.simulatorProduct.id).subscribe({
      next: (result) => {
        this.simulatorResult = result;
      },
      error: (err) => this.showToast('error', err?.error?.message || 'Error al calcular precio'),
    });
  }

  getSimulatedDiscountedPrice(): number {
    if (!this.simulatorResult) return 0;
    return Number((this.simulatorResult.salePrice * (1 - this.simulatorDiscountPct / 100)).toFixed(2));
  }

  getSimulatedDiscountedPriceWithIgv(): number {
    if (!this.simulatorResult) return 0;
    const discounted = this.simulatorResult.salePrice * (1 - this.simulatorDiscountPct / 100);
    return Number((discounted * (1 + this.simulatorResult.igvRate / 100)).toFixed(2));
  }

  isDiscountOverLimit(): boolean {
    if (!this.simulatorResult) return false;
    return this.simulatorDiscountPct > this.simulatorResult.maxDiscountPct;
  }

  // ============================================
  // HELPERS
  // ============================================
  getIGVRate(): number {
    const igv = this.taxes.find(t => t.code === 'IGV');
    return igv ? Number(igv.ratePct) : 18;
  }

  getRentaRate(): number {
    const renta = this.taxes.find(t => t.code === 'RENTA');
    return renta ? Number(renta.ratePct) : 1.5;
  }

  getScopeLabel(cfg: PricingConfig): string {
    if (cfg.productId && cfg.product) return `Producto: ${cfg.product.name}`;
    if (cfg.categoryId && cfg.category) return `Categoría: ${cfg.category.name}`;
    return 'Global (todos los productos)';
  }

  // ============================================
  // TOASTS
  // ============================================
  showToast(type: ToastType, message: string): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.dismissToast(id), 5000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getToastIcon(type: ToastType): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
    }
  }
}
