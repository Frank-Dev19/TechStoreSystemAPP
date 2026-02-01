import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProductPriceStockInfo } from '../models/pricing/product-price-stock-info.model';

@Injectable({ providedIn: 'root' })
export class PricingStockApiService {
  constructor(private base: BaseService) {}

  getProductPriceStock(productId: number, priceListId: number = 1, customerId?: number): Observable<ProductPriceStockInfo> {
    const priceUrl = '/pricing/product-prices';
    const priceParams: any = {
      product_id: productId.toString(),
      price_list_id: priceListId.toString(),
    };
    if (customerId != null) priceParams.customer_id = customerId.toString();

    const stockUrl = '/inventory/stock';
    const stockParams: any = { product_id: productId.toString() };

    const price$ = this.base.get<any>(priceUrl, { params: priceParams }).pipe(
      map(data => {
        const item = Array.isArray(data) ? data[0] : data;
        if (!item) return null as any;
        return {
          basePrice: item.basePrice ?? item.unitPrice ?? 0,
          finalPrice: item.finalPrice ?? item.unitPrice ?? 0,
          priceListId: priceListId
        } as any;
      }),
      catchError(() => of(null))
    );

    const stock$ = this.base.get<any>(stockUrl, { params: stockParams }).pipe(
      map(s => s?.stock ?? 0),
      catchError(() => of(0))
    )

    return forkJoin({ price: price$, stock: stock$ }).pipe(
      map(({ price, stock }) => {
        if (!price) return null as any;
        const { basePrice, finalPrice, priceListId } = price;
        return { productId, priceListId, basePrice, finalPrice, stock, taxRate: 0.18 } as ProductPriceStockInfo;
      })
    )
  }
}
