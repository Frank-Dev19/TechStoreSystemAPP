export interface CountSnapshot {
    id: number;
    count_id: number;
    product_id: number;
    lot_id: number | null;
    qty_system: number;
    avg_cost_at_freeze: number;
    total_cost_at_freeze: number;
    snapshot_date: string; // ISO
}
