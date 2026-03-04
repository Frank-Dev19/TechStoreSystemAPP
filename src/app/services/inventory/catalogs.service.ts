import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Category } from '../../models/catalog/category';
import { Unit } from '../../models/catalog/unit';
import { Observable, map } from 'rxjs';
import { config } from '../../../environments/environment';

export interface CatalogFilter {
    search?: string;
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
export class CatalogsService {
    constructor(private base: BaseService) { }

    // Categories
    listCategories(): Observable<Category[]> { // Maintain for places that need all without pagination
        return this.base.get<PaginatedResponse<Category>>(`${config.catalogs.categories}?limit=1000`).pipe(map(res => res.data));
    }
    listCategoriesWithFilter(filter: CatalogFilter): Observable<PaginatedResponse<Category>> {
        const params: string[] = [];
        if (filter.search) params.push(`search=${encodeURIComponent(filter.search)}`);
        if (filter.page) params.push(`page=${filter.page}`);
        if (filter.limit) params.push(`limit=${filter.limit}`);
        const query = params.length ? '?' + params.join('&') : '';
        return this.base.get<PaginatedResponse<Category>>(`${config.catalogs.categories}${query}`);
    }
    createCategory(body: Partial<Category>): Observable<Category> {
        return this.base.post<Category>(config.catalogs.categories, body);
    }
    updateCategory(id: number, body: Partial<Category>): Observable<Category> {
        return this.base.put<Category>(`${config.catalogs.categories}/${id}`, body);
    }
    deleteCategory(id: number): Observable<{ ok: true }> {
        return this.base.delete<{ ok: true }>(`${config.catalogs.categories}/${id}`);
    }

    // Units
    listUnits(): Observable<Unit[]> { // Maintain for places that need all without pagination
        return this.base.get<PaginatedResponse<Unit>>(`${config.catalogs.units}?limit=1000`).pipe(map(res => res.data));
    }
    listUnitsWithFilter(filter: CatalogFilter): Observable<PaginatedResponse<Unit>> {
        const params: string[] = [];
        if (filter.search) params.push(`search=${encodeURIComponent(filter.search)}`);
        if (filter.page) params.push(`page=${filter.page}`);
        if (filter.limit) params.push(`limit=${filter.limit}`);
        const query = params.length ? '?' + params.join('&') : '';
        return this.base.get<PaginatedResponse<Unit>>(`${config.catalogs.units}${query}`);
    }
    createUnit(body: Partial<Unit>): Observable<Unit> {
        return this.base.post<Unit>(config.catalogs.units, body);
    }
    updateUnit(id: number, body: Partial<Unit>): Observable<Unit> {
        return this.base.put<Unit>(`${config.catalogs.units}/${id}`, body);
    }
    deleteUnit(id: number): Observable<{ ok: true }> {
        return this.base.delete<{ ok: true }>(`${config.catalogs.units}/${id}`);
    }
}
