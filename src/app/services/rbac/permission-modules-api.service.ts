import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { PermissionModuleApi } from '../../models/rbac/permission-module.model';

@Injectable({ providedIn: 'root' })
export class PermissionModulesApiService {
    private readonly resource = '/permission-modules';
    constructor(private readonly base: BaseService) { }

    findAll(): Observable<PermissionModuleApi[]> {
        return this.base.get<PermissionModuleApi[]>(this.resource);
    }
    findOne(id: number): Observable<PermissionModuleApi> {
        return this.base.get<PermissionModuleApi>(`${this.resource}/${id}`);
    }
    create(payload: Partial<PermissionModuleApi>): Observable<PermissionModuleApi> {
        return this.base.post<PermissionModuleApi>(this.resource, payload);
    }
    update(id: number, payload: Partial<PermissionModuleApi>): Observable<PermissionModuleApi> {
        return this.base.patch<PermissionModuleApi>(`${this.resource}/${id}`, payload);
    }
    remove(id: number): Observable<{ ok: true }> {
        return this.base.delete<{ ok: true }>(`${this.resource}/${id}`);
    }
}
