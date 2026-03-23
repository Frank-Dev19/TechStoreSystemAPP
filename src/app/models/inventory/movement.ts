export type MovementType = 'IN' | 'OUT' | 'ADJ' | 'TRANSFER';

export interface Movement {
    id: number;
    type: MovementType;
    product_id: number;
    qty: number;
    unit_cost: number;
    total_cost: number;
    lot_id: number | null;
    serial_id: number | null;
    reason_code: string;
    source_doc_type: string | null;
    source_doc_id: string | null;
    notes: string | null;
    user_created: string | null;
    supplier_id?: number | null;
    occurred_at: string; // ISO
    balance_qty_post: number;
    balance_total_cost_post: number;
    balance_avg_cost_post: number;

    // Backend Joins (Optional)
    product?: any;
    supplier?: any;
    lot?: any;
}


export interface MovementCreateDto {
    type: MovementType;
    product_id: number;
    qty: number;
    unit_cost?: number | null;
    reason_code?: string | null;
    lot_id?: number | null;
    serial_id?: number | null;
    supplier_id?: number | null;
    notes?: string | null;
    source_doc_type?: string | null;
    source_doc_id?: string | null;
    user_created: string | null;

}