import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Category } from '../../models/catalog/category';
import { Unit } from '../../models/catalog/unit';
import { Observable } from 'rxjs';
import { config } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
    constructor(private base: BaseService) { }

    // Categories
    listCategories(): Observable<Category[]> {
        return this.base.get<Category[]>(config.catalogs.categories);
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
    listUnits(): Observable<Unit[]> {
        return this.base.get<Unit[]>(config.catalogs.units);
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
