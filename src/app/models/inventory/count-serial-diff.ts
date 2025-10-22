export interface CountSerialDiff {
    product_id: number;
    lot_id: number | null;
    faltantes: string[];
    sobrantes: string[];
    coincidentes: string[];
}
