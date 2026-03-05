// src/app/services/inventory/products.service.ts
import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Product } from '../../models/catalog/product';
import { Observable, map } from 'rxjs';
import { config } from '../../../environments/environment';
import { ProductApi, mapProductFromApi, mapProductToApi } from '../../utils/mappers';

export interface ProductFilter {
  search?: string;
  categoryId?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private base = config.catalogs.products;

  constructor(private baseSvc: BaseService) { }

  list(): Observable<Product[]> {
    return this.baseSvc.get<ProductApi[]>(this.base).pipe(
      map(arr => (arr ?? []).map(mapProductFromApi))
    );
  }

  listAll(): Observable<Product[]> {
    return this.baseSvc.get<ProductApi[]>(`${this.base}/all`).pipe(
      map(arr => (arr ?? []).map(mapProductFromApi))
    );
  }

  listWithFilter(filter: ProductFilter): Observable<PaginatedResponse<Product>> {
    const params: string[] = [];
    if (filter.search) params.push(`search=${encodeURIComponent(filter.search)}`);
    if (filter.categoryId) params.push(`categoryId=${filter.categoryId}`);
    if (filter.page) params.push(`page=${filter.page}`);
    if (filter.limit) params.push(`limit=${filter.limit}`);
    const query = params.length ? '?' + params.join('&') : '';
    
    return this.baseSvc.get<PaginatedResponse<ProductApi>>(`${this.base}${query}`).pipe(
      map(res => ({
        ...res,
        data: (res.data ?? []).map(mapProductFromApi)
      }))
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
