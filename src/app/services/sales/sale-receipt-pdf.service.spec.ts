import { firstValueFrom, of } from 'rxjs';

import { DocumentType, SaleStatus, SaleType } from '../../models/sales/enums';
import { Sale } from '../../models/sales/sale.model';

import { JsPdfSaleReceiptRenderer } from './js-pdf-sale-receipt.renderer';
import { SaleReceiptPdfMapper } from './sale-receipt-pdf.mapper';
import { SaleReceiptPdfService } from './sale-receipt-pdf.service';

describe('SaleReceiptPdfService', () => {
  it('delegates download() to mapper and renderer for full receipts', async () => {
    const sale = createSale();
    const mappedModel = jasmine.createSpyObj('model', {}, { variant: 'full' });
    const salesApi = jasmine.createSpyObj('SalesApiService', ['get']);
    const mapper = jasmine.createSpyObj<SaleReceiptPdfMapper>('SaleReceiptPdfMapper', ['map']);
    const renderer = jasmine.createSpyObj<JsPdfSaleReceiptRenderer>('JsPdfSaleReceiptRenderer', ['render']);
    mapper.map.and.returnValue(mappedModel as never);
    renderer.render.and.returnValue('F001-123.pdf');
    const service = new SaleReceiptPdfService(salesApi, mapper, renderer);

    const fileName = await firstValueFrom(service.download(sale, 'full'));

    expect(mapper.map).toHaveBeenCalledWith(sale, 'full');
    expect(renderer.render).toHaveBeenCalledWith(mappedModel as never);
    expect(fileName).toBe('F001-123.pdf');
  });

  it('fetches full sale detail in downloadBySaleId() before rendering linked-summary', async () => {
    const sale = createSale();
    const mappedModel = jasmine.createSpyObj('model', {}, { variant: 'linked-summary' });
    const salesApi = jasmine.createSpyObj('SalesApiService', ['get']);
    const mapper = jasmine.createSpyObj<SaleReceiptPdfMapper>('SaleReceiptPdfMapper', ['map']);
    const renderer = jasmine.createSpyObj<JsPdfSaleReceiptRenderer>('JsPdfSaleReceiptRenderer', ['render']);
    salesApi.get.and.returnValue(of(sale));
    mapper.map.and.returnValue(mappedModel as never);
    renderer.render.and.returnValue('B001-456.pdf');
    const service = new SaleReceiptPdfService(salesApi, mapper, renderer);

    const fileName = await firstValueFrom(service.downloadBySaleId(10, 'linked-summary'));

    expect(salesApi.get).toHaveBeenCalledWith(10);
    expect(mapper.map).toHaveBeenCalledWith(sale, 'linked-summary');
    expect(fileName).toBe('B001-456.pdf');
  });

  it('rejects unsupported variants explicitly', async () => {
    const salesApi = jasmine.createSpyObj('SalesApiService', ['get']);
    const mapper = jasmine.createSpyObj<SaleReceiptPdfMapper>('SaleReceiptPdfMapper', ['map']);
    const renderer = jasmine.createSpyObj<JsPdfSaleReceiptRenderer>('JsPdfSaleReceiptRenderer', ['render']);
    const service = new SaleReceiptPdfService(salesApi, mapper, renderer);

    await expectAsync(firstValueFrom(service.download(createSale(), 'legacy' as never))).toBeRejectedWithError(
      'Unsupported sale receipt variant: legacy',
    );
    expect(mapper.map).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
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
    items: [],
    payments: [],
    lineDiscounts: [],
    comboItems: [],
  };
}
