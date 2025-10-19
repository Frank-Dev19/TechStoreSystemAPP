export interface Stock {
    product_id: number;
    lot_id: number | null;
    qty_on_hand: number;
    avg_unit_cost: number;
    total_cost: number;
    updated_at: string; // ISO
}
