const MOVEMENT_REASON_LABELS: Record<string, string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  SALE: 'Venta',
  SALE_CANCELLATION: 'Anulación de venta',
  AJUSTE_INV: 'Ajuste de inventario',
  DANO: 'Daño',
  'DAÑO': 'Daño',
  PERDIDA: 'Pérdida',
  CONSUMO_INT: 'Consumo interno',
};

const SOURCE_DOCUMENT_LABELS: Record<string, string> = {
  SALE: 'Venta',
  SALE_CANCELLATION: 'Anulación de venta',
  COUNT: 'Conteo de inventario',
  MANUAL: 'Movimiento manual',
  PURCHASE: 'Compra',
};

function labelFor(code: string | null | undefined, labels: Record<string, string>): string {
  if (!code) return '-';
  return labels[code.toUpperCase()] ?? code;
}

export function getMovementReasonLabel(code: string | null | undefined): string {
  return labelFor(code, MOVEMENT_REASON_LABELS);
}

export function getSourceDocumentLabel(code: string | null | undefined): string {
  return labelFor(code, SOURCE_DOCUMENT_LABELS);
}
