export type SaleReceiptVariant = 'full' | 'linked-summary';

export interface SaleReceiptPdfModel {
  variant: SaleReceiptVariant;
  document: {
    title: string;
    series: string;
    number: string;
    issueDateLabel: string;
    fileName: string;
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    ruc: string;
  };
  customer: {
    name: string;
    documentNumber: string;
    address?: string | null;
  };
  payment: {
    methodLabel: string;
    currencyLabel: string;
  };
  labels: {
    itemIndex: string;
  };
  items: Array<{
    index: number;
    description: string;
    unitLabel: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
}

export function assertSaleReceiptVariant(variant: string): asserts variant is SaleReceiptVariant {
  if (variant !== 'full' && variant !== 'linked-summary') {
    throw new Error(`Unsupported sale receipt variant: ${variant}`);
  }
}
