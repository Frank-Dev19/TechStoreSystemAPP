// src/app/models/pricing/pricing.models.ts

// =========================
// PRICE LISTS
// =========================

export type PriceListType = 'RETAIL' | 'WHOLESALE' | 'CUSTOM';

export interface PriceList {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    type: PriceListType;
    isDefault: boolean;
    activeFrom?: string | null;
    activeTo?: string | null;
    isActive: boolean;
}

// DTO para crear / actualizar listas de precios (shape del backend)
export interface SavePriceListDto {
    code: string;
    name: string;
    description?: string;
    type: PriceListType;
    is_default?: boolean;
    active_from?: string;
    active_to?: string;
    is_active?: boolean;
}

// =========================
// PRODUCTOS / CATEGORÍAS (versión lite para pricing)
// =========================

export interface CategoryLite {
    id: number;
    code: string;
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

// =========================
// PRODUCT PRICES
// =========================

// Lo que devuelve el backend (ProductPrice entity + relaciones opcionales)
export interface ProductPriceBackend {
    id: number;
    productId: number;
    priceListId: number;
    unitPrice: number;
    currencyCode: string;
    minQty: number;
    maxQty?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    isActive: boolean;

    // Relaciones opcionales si vienen en la respuesta
    product?: {
        id: number;
        sku: string;
        name: string;
    };
    priceList?: {
        id: number;
        code: string;
        name: string;
    };
}

// Fila que usa el UI (igual a lo que tenías en pricing.ts)
export interface ProductPriceRow {
    id: number;
    productId: number;
    productName: string;
    priceListId: number;
    priceListCode: string;
    unitPrice: number;
    currencyCode: string;
    minQty: number;
    maxQty?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    isActive: boolean;
}

// DTO para crear / actualizar en backend
export interface SaveProductPriceDto {
    product_id: number;
    price_list_id: number;
    unit_price: number;
    currency_code?: string;
    min_qty: number;
    max_qty?: number | null;
    valid_from?: string;
    valid_to?: string;
    is_active?: boolean;
}

// =========================
// DISCOUNT RULES
// =========================

export type DiscountTypeUi = 'PERCENT' | 'FIXED';

export interface DiscountRule {
    id: number;
    name: string;
    description?: string | null;

    productId?: number | null;
    categoryId?: number | null;
    priceListId?: number | null;

    discountType: DiscountTypeUi;
    amount: number;
    minQty?: number | null;
    maxQty?: number | null;

    autoApply: boolean;
    requiresPermission?: string | null;

    startsAt?: string | null;
    endsAt?: string | null;

    priority: number;
    isExclusive: boolean;
    isActive: boolean;
}

// Versión UI (permite nombres opcionales si luego quieres mostrarlos)
export interface DiscountRuleUi extends DiscountRule {
    productName?: string | null;
    categoryName?: string | null;
    priceListName?: string | null;
    priceListCode?: string | null;
}

// DTO create/update backend
export interface SaveDiscountRuleDto {
    name: string;
    description?: string;
    product_id?: number | null;
    category_id?: number | null;
    price_list_id?: number | null;
    discount_type: DiscountTypeUi;
    amount: number;
    min_qty?: number | null;
    max_qty?: number | null;
    auto_apply?: boolean;
    requires_permission?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    priority?: number;
    is_exclusive?: boolean;
    is_active?: boolean;
}

// =========================
// COMBOS
// =========================

export type ComboTypeUi = 'FIXED_PRICE' | 'PERCENT';

export interface ComboItemUi {
    productId: number;
    productName: string;
    qty: number;
}

export interface ComboUi {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    comboType: ComboTypeUi;
    comboPrice?: number | null;
    discountPercent?: number | null;
    autoApply: boolean;
    requiresPermission?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive: boolean;
    items: ComboItemUi[];
}

// DTO create/update backend
export interface ComboItemInputDto {
    product_id: number;
    qty: number;
}

export interface SaveComboDto {
    code: string;
    name: string;
    description?: string;
    combo_type: ComboTypeUi;
    combo_price?: number | null;
    discount_percent?: number | null;
    auto_apply?: boolean;
    requires_permission?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active?: boolean;
    items: ComboItemInputDto[];
}

// =========================
// PRICING QUERY / SIMULADOR
// =========================

// Lo que devuelve el endpoint /pricing/query/product/:id
export interface ProductPriceResult {
    productId: number;
    priceListId: number;
    priceListCode: string;
    currency: string;
    qty: number;
    baseUnitPrice: number;
    finalUnitPrice: number;
    autoAppliedDiscounts: DiscountRule[];
    manualDiscountOptions: DiscountRule[];
}

// GET /pricing/query/product/:productId/best
export interface BestPriceOption {
    priceListId: number;
    priceListCode: string;
    currency: string;
    qty: number;
    baseUnitPrice: number;
    finalUnitPrice: number;
    autoAppliedDiscounts: DiscountRule[];
    manualDiscountOptions: DiscountRule[];
}

export interface BestPriceResponse {
    productId: number;
    qty: number;
    applied: BestPriceOption;
    options: BestPriceOption[];
}

// Versión para el UI del simulador (lo que ya usabas en el HTML)
export interface BestPriceResultUi {
    productId: number;
    productSku: string;
    productName: string;
    qty: number;
    applied: BestPriceOption;
    options: BestPriceOption[];
}

export interface MissingPriceItem {
    productId: number;
    name: string;
    sku: string;
}

export interface PriceCoverageStats {
    totalProducts: number;
    pricedProducts: number;
    unpricedProducts: number;
    items: MissingPriceItem[];
}


// Agregar esta interfaz:
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
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
