import { Injectable } from '@angular/core';
import { Observable, defer, map, switchMap } from 'rxjs';

import {
  SaleReceiptVariant,
  assertSaleReceiptVariant,
} from '../../models/sales/sale-receipt-pdf.model';
import { Sale } from '../../models/sales/sale.model';

import { JsPdfSaleReceiptRenderer } from './js-pdf-sale-receipt.renderer';
import { SaleReceiptPdfMapper } from './sale-receipt-pdf.mapper';
import { SalesApiService } from './sales-api.service';

@Injectable({ providedIn: 'root' })
export class SaleReceiptPdfService {
  constructor(
    private readonly salesApi: SalesApiService,
    private readonly mapper: SaleReceiptPdfMapper,
    private readonly renderer: JsPdfSaleReceiptRenderer,
  ) {}

  download(sale: Sale, variant: SaleReceiptVariant): Observable<string> {
    return defer(() => {
      assertSaleReceiptVariant(variant);
      return [this.renderer.render(this.mapper.map(sale, variant))];
    });
  }

  downloadBySaleId(saleId: number, variant: SaleReceiptVariant): Observable<string> {
    return defer(() => {
      assertSaleReceiptVariant(variant);
      return this.salesApi.get(saleId).pipe(switchMap((sale) => this.download(sale, variant)));
    });
  }
}
