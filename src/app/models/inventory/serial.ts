export type SerialStatus = 'IN_STOCK' | 'ISSUED' | 'DAMAGED' | 'LOST';

export interface Serial {
    id: number;
    product_id: number;
    serial_code: string;
    lot_id: number | null;
    status: SerialStatus;
    created_at: string; // ISO
}

export interface MovementSerialLink {
    serial_id: number;
    serial_code: string;
    lot_id: number | null;
}
