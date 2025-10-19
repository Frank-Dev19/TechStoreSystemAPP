export interface CountEntry {
    id: number;
    count_id: number;
    product_id: number;
    lot_id: number | null;
    qty_counted: number;
    counted_by: string;
    counted_at: string; // ISO
    notes: string | null;
}
