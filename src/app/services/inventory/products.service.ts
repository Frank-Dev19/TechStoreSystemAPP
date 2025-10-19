// src/app/services/inventory/products.service.ts
import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Product } from '../../models/catalog/product';
import { Observable, map } from 'rxjs';
import { config } from '../../../environments/environment';
import { ProductApi, mapProductFromApi, mapProductToApi } from '../../utils/mappers';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private base = config.catalogs.products;

  constructor(private baseSvc: BaseService) { }

  list(): Observable<Product[]> {
    return this.baseSvc.get<ProductApi[]>(this.base).pipe(
      map(arr => (arr ?? []).map(mapProductFromApi))
    );
  }

  create(body: Partial<Product>): Observable<Product> {
    return this.baseSvc.post<ProductApi>(this.base, mapProductToApi(body as Product)).pipe(
      map(mapProductFromApi)
    );
  }

  update(id: number, body: Partial<Product>): Observable<Product> {
    return this.baseSvc.put<ProductApi>(`${this.base}/${id}`, mapProductToApi(body as Product)).pipe(
      map(mapProductFromApi)
    );
  }

  delete(id: number): Observable<{ ok: true }> {
    return this.baseSvc.delete<{ ok: true }>(`${this.base}/${id}`);
  }
}
