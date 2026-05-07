import { SaleReceiptPdfModel } from '../../models/sales/sale-receipt-pdf.model';

import { JsPdfSaleReceiptRenderer } from './js-pdf-sale-receipt.renderer';

describe('JsPdfSaleReceiptRenderer', () => {
  it('renders the full variant preserving semantic sections and saves the file', () => {
    const doc = createDocSpy();
    const renderer = new JsPdfSaleReceiptRenderer();
    const autoTableSpy = spyOn<any>(renderer, 'renderAutoTable').and.callFake(() => {
      doc.lastAutoTable = { finalY: 120 };
    });
    spyOn<any>(renderer, 'createDocument').and.returnValue(doc as never);

    const fileName = renderer.render(createModel('full'));
    const firstTable = autoTableSpy.calls.argsFor(0)[1] as { head: Array<Array<{ content: string }>> };

    expect(fileName).toBe('F001-123.pdf');
    expect(autoTableSpy.calls.count()).toBe(1);
    expect(firstTable.head[0][0].content).toBe('Informacion General');
    expect(doc.text).toHaveBeenCalledWith('FACTURA ELECTRONICA', 143, 24);
    expect(doc.save).toHaveBeenCalledWith('F001-123.pdf');
  });

  it('renders linked-summary with N° and never Tipo in the items head', () => {
    const doc = createDocSpy();
    const renderer = new JsPdfSaleReceiptRenderer();
    const autoTableSpy = spyOn<any>(renderer, 'renderAutoTable').and.callFake(() => {
      doc.lastAutoTable = { finalY: 110 };
    });
    spyOn<any>(renderer, 'createDocument').and.returnValue(doc as never);

    renderer.render(createModel('linked-summary'));
    const itemsTable = autoTableSpy.calls.argsFor(1)[1] as { head: string[][] };

    expect(autoTableSpy.calls.count()).toBe(2);
    expect(itemsTable.head).toEqual([['N°', 'Descripcion', 'Cant.', 'P. unitario', 'Total']]);
    expect(JSON.stringify(itemsTable.head)).not.toContain('Tipo');
  });
});

function createDocSpy() {
  return {
    setFontSize: jasmine.createSpy('setFontSize'),
    setFont: jasmine.createSpy('setFont'),
    text: jasmine.createSpy('text'),
    setDrawColor: jasmine.createSpy('setDrawColor'),
    setFillColor: jasmine.createSpy('setFillColor'),
    rect: jasmine.createSpy('rect'),
    setTextColor: jasmine.createSpy('setTextColor'),
    line: jasmine.createSpy('line'),
    addPage: jasmine.createSpy('addPage'),
    save: jasmine.createSpy('save'),
    lastAutoTable: { finalY: 80 },
  };
}

function createModel(variant: 'full' | 'linked-summary'): SaleReceiptPdfModel {
  return {
    variant,
    document: {
      title: 'FACTURA ELECTRONICA',
      series: 'F001',
      number: '123',
      issueDateLabel: '5/4/2026',
      fileName: 'F001-123.pdf',
    },
    company: {
      name: 'MACROCHIPS S.A.C',
      address: 'Calle Alfonso Garden #493, Trujillo, La Libertad',
      phone: '924215320',
      email: 'soporte@grupoSTS.com.pe',
      ruc: '10123456789',
    },
    customer: {
      name: 'Ada Lovelace',
      documentNumber: '10456789012',
      address: 'Av. Siempre Viva 742',
    },
    payment: {
      methodLabel: 'Tarjeta',
      currencyLabel: 'SOLES',
    },
    labels: {
      itemIndex: variant === 'linked-summary' ? 'N°' : '#',
    },
    items: [
      {
        index: 1,
        description: 'Laptop Gamer',
        unitLabel: 'NIU',
        quantity: 1,
        unitPrice: 200,
        total: 236,
      },
    ],
    totals: {
      subtotal: 200,
      discount: 0,
      tax: 36,
      total: 236,
    },
  };
}
