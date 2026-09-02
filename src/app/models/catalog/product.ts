export interface Product {
    id: number;
    sku: string;
    name: string;
    description: string | null;
    brand?: string | null;
    category_id: number;
    unit_id: number;
    is_serialized: boolean;
    manages_expiration: boolean;
    warranty_duration_value?: number;
    warranty_duration_unit?: 'DAY' | 'MONTH' | 'YEAR';
    min_stock: number | null;
    max_stock: number | null;
    reorder_point: number | null;
    stock_qty?: number;
    avg_cost?: number;
    category?: { id: number; name: string; description?: string };
}
