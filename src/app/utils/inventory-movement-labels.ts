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
  MATERIAL_ISSUE: 'Material de orden de servicio',
  TECHNICIAN_SUPPLY_ISSUE: 'Insumo interno',
  WARRANTY_REPLACEMENT: 'Reemplazo por garantía',
};

const SOURCE_DOCUMENT_LABELS: Record<string, string> = {
  SALE: 'Venta',
  SALE_CANCELLATION: 'Anulación de venta',
  COUNT: 'Conteo de inventario',
  MANUAL: 'Movimiento manual',
  PURCHASE: 'Compra',
  MATERIAL_DELIVERY: 'Despacho de orden de servicio',
  INTERNAL_DELIVERY: 'Entrega interna',
  INTERNAL_DISPATCH: 'Solicitud de insumo interno',
  WARRANTY_DISPATCH: 'Solicitud de reemplazo por garantía',
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
