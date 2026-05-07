import { Injectable } from '@angular/core';

import { DocumentType, PaymentMethod } from '../../models/sales/enums';
import {
  SaleReceiptPdfModel,
  SaleReceiptVariant,
  assertSaleReceiptVariant,
} from '../../models/sales/sale-receipt-pdf.model';
import { Sale } from '../../models/sales/sale.model';

const COMPANY_DATA = {
  name: 'MACROCHIPS S.A.C',
  address: 'Calle Alfonso Garden #493, Trujillo, La Libertad',
  phone: '924215320',
  email: 'soporte@grupoSTS.com.pe',
  ruc: '10123456789',
} as const;

const PAYMENT_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.CARD]: 'Tarjeta',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.YAPE]: 'Yape',
  [PaymentMethod.PLIN]: 'Plin',
  [PaymentMethod.CREDIT]: 'Credito',
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Credito',
};

@Injectable({ providedIn: 'root' })
export class SaleReceiptPdfMapper {
  map(sale: Sale, variant: SaleReceiptVariant): SaleReceiptPdfModel {
    assertSaleReceiptVariant(variant);

    const title = sale.documentType === DocumentType.FACTURA ? 'FACTURA ELECTRONICA' : 'BOLETA ELECTRONICA';

    return {
      variant,
      document: {
        title,
        series: sale.series,
        number: sale.number,
        issueDateLabel: sale.issueDate ? new Date(sale.issueDate).toLocaleDateString('es-PE') : '-',
        fileName: `${sale.series}-${sale.number}.pdf`,
      },
      company: COMPANY_DATA,
      customer: {
        name: sale.customer?.name?.trim() || 'Cliente General',
        documentNumber: sale.customer?.documentNumber?.trim() || '-',
        address: sale.customer?.address?.trim() || '-',
      },
      payment: {
        methodLabel: this.getPaymentLabel(sale.payments?.[0]?.method),
        currencyLabel: 'SOLES',
      },
      labels: {
        itemIndex: variant === 'linked-summary' ? 'N°' : '#',
      },
      items: (sale.items ?? []).map((item, index) => ({
        index: index + 1,
        description:
          item.serviceNameSnapshot || item.descriptionSnapshot || item.product?.name || item.service?.name || 'Item',
        unitLabel: item.itemType === 'SERVICE' ? 'SERV' : item.product?.baseUnit?.abbreviation || 'UND',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.finalUnitPrice || 0),
        total: Number(item.lineTotal || 0),
      })),
      totals: {
        subtotal: Number(sale.subtotal || 0),
        discount: Number(sale.discountTotal || 0),
        tax: Number(sale.taxAmount || 0),
        total: Number(sale.total || 0),
      },
    };
  }

  private getPaymentLabel(payment?: string | null): string {
    return PAYMENT_LABELS[payment || ''] || payment || '-';
  }
}
