import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
    PermissionApi,
    PermissionCreateRequest,
    PermissionUpdateRequest
} from '../../models/rbac/permission.model';
import { PermissionTreeNode } from '../../models/rbac/permission-tree.model';

@Injectable({ providedIn: 'root' })
export class PermissionsApiService {
    private readonly resource = '/permissions';
    constructor(private readonly base: BaseService) { }

    findAll(): Observable<PermissionApi[]> {
        return this.base.get<PermissionApi[]>(this.resource);
    }
    findOne(id: number): Observable<PermissionApi> {
        return this.base.get<PermissionApi>(`${this.resource}/${id}`);
    }
    create(payload: PermissionCreateRequest): Observable<PermissionApi> {
        return this.base.post<PermissionApi>(this.resource, payload);
    }
    update(id: number, payload: PermissionUpdateRequest): Observable<PermissionApi> {
        return this.base.patch<PermissionApi>(`${this.resource}/${id}`, payload);
    }
    remove(id: number): Observable<{ ok: true }> {
        return this.base.delete<{ ok: true }>(`${this.resource}/${id}`);
    }
    tree(): Observable<PermissionTreeNode[]> {
        return this.base.get<PermissionTreeNode[]>(`${this.resource}/tree`);
    }
}
