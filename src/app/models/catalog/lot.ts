export interface Lot {
  id: number;
  product_id: number;
  lot_code: string;
  expiration_date: string | null; // ISO
}
