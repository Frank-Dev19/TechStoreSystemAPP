import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { UserPermissionApi } from '../../models/rbac/user-permission.model';

export interface SetUserPermRequest {
    permCode: string;
    expiresAt?: string;            // ISO
    scope?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class UserPermsApiService {
    private readonly resource = '/user-perms';
    constructor(private readonly base: BaseService) { }

    listForUser(userId: number): Observable<UserPermissionApi[]> {
        return this.base.get<UserPermissionApi[]>(`${this.resource}/${userId}`);
    }
    allow(userId: number, payload: SetUserPermRequest): Observable<UserPermissionApi> {
        return this.base.post<UserPermissionApi>(`${this.resource}/${userId}/allow`, payload);
    }
    deny(userId: number, payload: SetUserPermRequest): Observable<UserPermissionApi> {
        return this.base.post<UserPermissionApi>(`${this.resource}/${userId}/deny`, payload);
    }
    clear(userId: number, permCode: string): Observable<{ ok: true }> {
        return this.base.delete<{ ok: true }>(`${this.resource}/${userId}/${encodeURIComponent(permCode)}`);
    }
}

// util simple para convertir "department:sales; site:1" → { department: "sales", site: "1" }
export const parseScope = (input?: string): Record<string, any> | undefined => {
    if (!input) return undefined;
    const obj: Record<string, any> = {};
    const parts = input.split(';').map(s => s.trim()).filter(Boolean);
    parts.forEach(p => {
        const [k, v] = p.split(/[:=]/).map(s => s.trim());
        if (k) obj[k] = v ?? true;
    });
    return Object.keys(obj).length ? obj : undefined;
};
