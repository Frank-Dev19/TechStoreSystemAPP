import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
    RoleApi, RoleCreateRequest, RoleUpdateRequest, AssignPermissionsRequest
} from '../../models/rbac/role.model';

@Injectable({ providedIn: 'root' })
export class RolesApiService {
    private readonly resource = '/roles';
    constructor(private readonly base: BaseService) { }

    findAll(): Observable<RoleApi[]> { return this.base.get<RoleApi[]>(this.resource); }
    findOne(id: number): Observable<RoleApi> { return this.base.get<RoleApi>(`${this.resource}/${id}`); }
    create(payload: RoleCreateRequest): Observable<RoleApi> { return this.base.post<RoleApi>(this.resource, payload); }
    update(id: number, payload: RoleUpdateRequest): Observable<RoleApi> { return this.base.patch<RoleApi>(`${this.resource}/${id}`, payload); }
    remove(id: number): Observable<{ ok: true }> { return this.base.delete<{ ok: true }>(`${this.resource}/${id}`); }

    assignPermissionsByCode(roleId: number, codes: string[]): Observable<RoleApi> {
        return this.base.patch<RoleApi>(`${this.resource}/${roleId}/permissions`, <AssignPermissionsRequest>{ permissions: codes });
    }
}
