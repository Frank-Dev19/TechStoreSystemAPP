import { DocumentType, PaymentMethod, SaleStatus, SaleType } from '../../models/sales/enums';
import { Sale } from '../../models/sales/sale.model';

import { SaleReceiptPdfMapper } from './sale-receipt-pdf.mapper';

describe('SaleReceiptPdfMapper', () => {
  let mapper: SaleReceiptPdfMapper;

  beforeEach(() => {
    mapper = new SaleReceiptPdfMapper();
  });

  it('maps a full receipt with enriched labels, filename and totals', () => {
    const model = mapper.map(createSale(), 'full');

    expect(model.variant).toBe('full');
    expect(model.document.title).toBe('FACTURA ELECTRONICA');
    expect(model.document.fileName).toBe('F001-123.pdf');
    expect(model.payment.methodLabel).toBe('Tarjeta');
    expect(model.items[0].unitLabel).toBe('NIU');
    expect(model.items[0].description).toBe('Laptop Gamer');
    expect(model.totals.total).toBe(236);
  });

  it('maps linked-summary with N° label and fallback values for incomplete sales', () => {
    const model = mapper.map(createIncompleteSale(), 'linked-summary');

    expect(model.variant).toBe('linked-summary');
    expect(model.labels.itemIndex).toBe('N°');
    expect(model.customer.name).toBe('Cliente General');
    expect(model.customer.address).toBe('-');
    expect(model.payment.methodLabel).toBe('-');
    expect(model.items[0].description).toBe('Servicio técnico');
    expect(model.items[0].unitLabel).toBe('SERV');
  });

  it('rejects unsupported variants explicitly', () => {
    expect(() => mapper.map(createSale(), 'legacy' as never)).toThrowError(
      'Unsupported sale receipt variant: legacy',
    );
  });
});

function createSale(): Sale {
  return {
    id: 10,
    companyId: 1,
    customerId: 20,
    customer: {
      id: 20,
      name: 'Ada Lovelace',
      documentNumber: '10456789012',
      documentTypeId: 6,
      address: 'Av. Siempre Viva 742',
    },
    saleType: SaleType.MIXED,
    documentType: DocumentType.FACTURA,
    series: 'F001',
    number: '123',
    issueDate: '2026-04-05T10:00:00.000Z',
    applyAutoDiscounts: true,
    baseSubtotal: 200,
    subtotal: 200,
    discountTotal: 0,
    taxAmount: 36,
    total: 236,
    taxRate: 18,
    status: SaleStatus.CONFIRMED,
    createdAt: '2026-04-05T10:00:00.000Z',
    updatedAt: '2026-04-05T10:00:00.000Z',
    items: [
      {
        id: 1,
        saleId: 10,
        itemType: 'PRODUCT',
        productId: 100,
        baseUnitPrice: 200,
        finalUnitPrice: 200,
        quantity: 1,
        discountAmount: 0,
        taxAmount: 36,
        lineTotal: 236,
        serialCount: 0,
        isComboItem: false,
        descriptionSnapshot: 'Laptop Gamer',
        product: {
          id: 100,
          sku: 'LP-1',
          name: 'Laptop Gamer',
          baseUnit: { abbreviation: 'NIU' },
        },
      } as Sale['items'][number],
    ],
    payments: [
      {
        id: 1,
        saleId: 10,
        method: PaymentMethod.CARD,
        amount: 236,
        exchangeRate: 1,
        currency: 'PEN',
        paymentDate: '2026-04-05T10:00:00.000Z',
        createdAt: '2026-04-05T10:00:00.000Z',
      },
    ],
    lineDiscounts: [],
    comboItems: [],
  };
}

function createIncompleteSale(): Sale {
  return {
    ...createSale(),
    documentType: DocumentType.BOLETA,
    series: 'B001',
    number: '456',
    customer: {
      id: 20,
      name: '',
      documentNumber: '',
      documentTypeId: 1,
    },
    items: [
      {
        id: 2,
        saleId: 10,
        itemType: 'SERVICE',
        serviceId: 50,
        baseUnitPrice: 80,
        finalUnitPrice: 80,
        quantity: 1,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 80,
        serialCount: 0,
        isComboItem: false,
        serviceNameSnapshot: 'Servicio técnico',
      } as Sale['items'][number],
    ],
    payments: [],
  };
}
