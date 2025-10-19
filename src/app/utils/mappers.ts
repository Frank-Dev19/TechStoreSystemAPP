// src/app/utils/mappers.ts
import { Product } from '../models/catalog/product';
import { Category } from '../models/catalog/category';
import { Unit } from '../models/catalog/unit';
import { Lot } from '../models/catalog/lot';
import { Stock } from '../models/inventory/stock';
import { Movement } from '../models/inventory/movement';
import { Count, CountStatus } from '../models/inventory/count';
import { CountSnapshot } from '../models/inventory/count-snapshot';
import { CountEntry } from '../models/inventory/count-entry';

/* Helpers de tipos */
export const N = (v: any): number => (v === null || v === undefined || v === '' ? 0 : Number(v));
export const S = (v: any): string | null =>
    v === null || v === undefined ? null : String(v);
export const B = (v: any): boolean => !!v;

/* =======================
   PRODUCTS
   ======================= */

export type ProductApi = {
    id: number;
    sku: string;
    name: string;
    description?: string | null;
    categoryId?: number | null;
    unitId?: number | null;         // puede venir como unitId
    baseUnitId?: number | null;     // o como baseUnitId (según tu backend)
    isSerialized?: boolean;
    managesExpiration?: boolean;
    minStock?: number | string | null;
    maxStock?: number | string | null;
    reorderPoint?: number | string | null;
};

export const mapProductFromApi = (api: ProductApi): Product => ({
    id: api.id,
    sku: api.sku,
    name: api.name,
    description: api.description ?? null,
    category_id: api.categoryId ?? null,
    unit_id: api.unitId ?? api.baseUnitId ?? null,
    is_serialized: B(api.isSerialized),
    manages_expiration: B(api.managesExpiration),
    min_stock: api.minStock == null ? null : N(api.minStock),
    max_stock: api.maxStock == null ? null : N(api.maxStock),
    reorder_point: api.reorderPoint == null ? null : N(api.reorderPoint),
});

export const mapProductToApi = (p: Partial<Product>) => ({
    sku: p.sku,
    name: p.name,
    description: p.description ?? null,
    categoryId: p.category_id ?? null,
    unitId: p.unit_id ?? null,
    isSerialized: p.is_serialized ?? false,
    managesExpiration: p.manages_expiration ?? false,
    minStock: p.min_stock ?? null,
    maxStock: p.max_stock ?? null,
    reorderPoint: p.reorder_point ?? null,
});

/* =======================
   LOTS  (BACKEND: snake_case)
   ======================= */

// Lo que realmente devuelve/espera TU backend
export type LotApi = {
    id: number;
    product_id: number;
    lot_code: string;
    expiration_date: string | null;
};

// ← back  (API -> Front)
export const mapLotFromApi = (api: LotApi): Lot => ({
    id: api.id,
    product_id: api.product_id,
    lot_code: api.lot_code,
    expiration_date: api.expiration_date,
});

// → back  (Front -> API)  payload de creación
export type LotCreateApi = {
    product_id: number;
    lot_code: string;
    expiration_date: string | null;
};

export const mapLotToApi = (l: {
    product_id: number;
    lot_code: string;
    expiration_date: string;
}): LotCreateApi => ({
    product_id: l.product_id,
    lot_code: l.lot_code,
    expiration_date: l.expiration_date ?? null,
});


/* =======================
   STOCK
   ======================= */
export type StockApi = {
    productId: number;
    lotId?: number | null;
    qtyOnHand: number | string;
    avgUnitCost?: number | string | null;
    totalCost?: number | string | null;
    updatedAt?: string | null;
};

export const mapStockFromApi = (api: StockApi): Stock => ({
    product_id: api.productId,
    lot_id: api.lotId ?? null,
    qty_on_hand: N(api.qtyOnHand),
    avg_unit_cost: N(api.avgUnitCost),
    total_cost: N(api.totalCost),
    updated_at: api.updatedAt ?? '',
});

/* =======================
   MOVEMENTS (KARDEX)
   ======================= */
export type MovementApi = {
    id: number;
    type: 'IN' | 'OUT' | 'ADJ' | 'TRANSFER';
    productId: number;
    qty: number | string;
    unitCost?: number | string | null;
    totalCost?: number | string | null;
    lotId?: number | null;
    serialId?: number | null;
    reasonCode?: string | null;
    sourceDocType?: string | null;
    sourceDocId?: string | null;
    notes?: string | null;
    userCreated?: string | null;
    occurredAt: string; // ISO
    balanceQtyPost?: number | string | null;
    balanceTotalCostPost?: number | string | null;
    balanceAvgCostPost?: number | string | null;
};

export const mapMovementFromApi = (api: MovementApi): Movement => ({
    id: api.id,
    type: api.type,
    product_id: api.productId,
    qty: N(api.qty),
    unit_cost: N(api.unitCost),
    total_cost: N(api.totalCost),
    lot_id: api.lotId ?? null,
    serial_id: api.serialId ?? null,
    reason_code: api.reasonCode ?? '',
    source_doc_type: api.sourceDocType ?? null,
    source_doc_id: api.sourceDocId ?? null,
    notes: api.notes ?? null,
    user_created: api.userCreated ?? null,
    occurred_at: api.occurredAt,
    balance_qty_post: N(api.balanceQtyPost),
    balance_total_cost_post: N(api.balanceTotalCostPost),
    balance_avg_cost_post: N(api.balanceAvgCostPost),
});

/* =======================
   COUNTS / SNAPSHOTS / ENTRIES
   ======================= */
export type CountApi = {
    id: number;
    code: string;
    description?: string | null;
    status: CountStatus;
    createdBy: string;
    createdAt: string;
    frozenAt?: string | null;
    postedAt?: string | null;
};

export const mapCountFromApi = (api: CountApi): Count => ({
    id: api.id,
    code: api.code,
    description: api.description ?? null,
    status: api.status,
    created_by: api.createdBy,
    created_at: api.createdAt,
    frozen_at: api.frozenAt ?? null,
    posted_at: api.postedAt ?? null,
});

export type CountSnapshotApi = {
    id: number;
    countId: number;
    productId: number;
    lotId?: number | null;
    qtySystem: number | string;
    avgCostAtFreeze: number | string;
    totalCostAtFreeze: number | string;
    snapshotDate: string;
};

export const mapCountSnapshotFromApi = (api: CountSnapshotApi): CountSnapshot => ({
    id: api.id,
    count_id: api.countId,
    product_id: api.productId,
    lot_id: api.lotId ?? null,
    qty_system: N(api.qtySystem),
    avg_cost_at_freeze: N(api.avgCostAtFreeze),
    total_cost_at_freeze: N(api.totalCostAtFreeze),
    snapshot_date: api.snapshotDate,
});

export type CountEntryApi = {
    id: number;
    countId: number;
    productId: number;
    lotId?: number | null;
    qtyCounted: number | string;
    countedBy: string;
    countedAt: string;
    notes?: string | null;
};

export const mapCountEntryFromApi = (api: CountEntryApi): CountEntry => ({
    id: api.id,
    count_id: api.countId,
    product_id: api.productId,
    lot_id: api.lotId ?? null,
    qty_counted: N(api.qtyCounted),
    counted_by: api.countedBy,
    counted_at: api.countedAt,
    notes: api.notes ?? null,
});


export type SerialApi = {
    id: number;
    productId: number;
    serialCode: string;
    lotId?: number | null;
    status: 'IN_STOCK' | 'ISSUED' | 'DAMAGED' | 'LOST';
    createdAt: string;
};

export const mapSerialFromApi = (api: SerialApi) => ({
    id: api.id,
    product_id: api.productId,
    serial_code: api.serialCode,
    lot_id: api.lotId ?? null,
    status: api.status,
    created_at: api.createdAt,
});

