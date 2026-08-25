// src/app/models/pricing/pricing.models.ts

// =========================
// PRICING CONFIG (Márgenes)
// =========================

export interface PricingConfig {
    id: number;
    productId: number | null;
    categoryId: number | null;
    profitMarginPct: number;
    maxDiscountPct: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;

    // Relaciones opcionales
    product?: {
        id: number;
        name: string;
        sku: string;
    } | null;
    category?: {
        id: number;
        name: string;
    } | null;
}

export interface SavePricingConfigDto {
    product_id?: number | null;
    category_id?: number | null;
    profit_margin_pct: number;
    max_discount_pct: number;
    is_active?: boolean;
}

export interface UpdatePricingConfigDto {
    profit_margin_pct?: number;
    max_discount_pct?: number;
    is_active?: boolean;
}

export interface ResolvedConfig {
    config: PricingConfig;
    scope: 'product' | 'category' | 'global';
}

// =========================
// TAX CONFIG (Impuestos)
// =========================

export interface TaxConfig {
    id: number;
    code: string;
    name: string;
    ratePct: number;
    isFixed: boolean;
    appliesTo: string;
    isActive: boolean;
}

export interface SaveTaxConfigDto {
    code: string;
    name: string;
    rate_pct: number;
    is_fixed?: boolean;
    applies_to?: string;
    is_active?: boolean;
}

export interface UpdateTaxConfigDto {
    name?: string;
    rate_pct?: number;
    is_active?: boolean;
}

// =========================
// PRICE CALCULATION (Motor)
// =========================

export interface PriceCalculation {
    productId: number;
    productName: string;
    sku: string;
    cpp: number;
    profitMarginPct: number;
    maxDiscountPct: number;
    configScope: 'product' | 'category' | 'global';
    salePrice: number;
    minPrice: number;
    igvRate: number;
    salePriceWithIgv: number;
    minPriceWithIgv: number;
    stockQty: number;
    recommendedPrice: number;
    minAllowedPrice: number;
    costSource: 'CURRENT_STOCK' | 'MOVEMENT_HISTORY';
}

export interface DiscountValidation {
    isValid: boolean;
    discountPct: number;
    maxAllowed: number;
    finalPrice: number;
    finalPriceWithIgv: number;
    message?: string;
}

// =========================
// TOASTS
// =========================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: number;
    type: ToastType;
    message: string;
}

// =========================
// PRODUCTOS / CATEGORÍAS (versión lite para pricing)
// =========================

export interface CategoryLite {
    id: number;
    name: string;
}

export interface ProductLite {
    id: number;
    sku: string;
    name: string;
    categoryName: string;
    unitName: string;
    isSerialized: boolean;
    managesExpiration: boolean;
}
