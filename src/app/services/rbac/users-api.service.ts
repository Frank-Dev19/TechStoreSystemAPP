import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
    UserApi, UserCreateRequest, UserUpdateRequest
} from '../../models/rbac/user.model';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
    private readonly resource = '/users';
    constructor(private readonly base: BaseService) { }

    findAll(search?: string): Observable<UserApi[]> {
        const params = search ? { search } : undefined;
        return this.base.get<UserApi[]>(this.resource, { params });
    }
    findOne(id: number): Observable<UserApi> {
        return this.base.get<UserApi>(`${this.resource}/${id}`);
    }
    create(payload: UserCreateRequest): Observable<UserApi> {
        return this.base.post<UserApi>(this.resource, payload);
    }
    update(id: number, payload: UserUpdateRequest): Observable<UserApi> {
        return this.base.patch<UserApi>(`${this.resource}/${id}`, payload);
    }

    // borrado lógico (bulk)
    softDeleteMany(ids: number[]): Observable<{ ok: boolean }> {
        return this.base.patch<{ ok: boolean }>(`${this.resource}/soft-delete`, { ids });
    }
    restoreMany(ids: number[]): Observable<{ ok: boolean }> {
        return this.base.patch<{ ok: boolean }>(`${this.resource}/restore`, { ids });
    }
    hardDeleteMany(ids: number[]): Observable<{ ok: boolean }> {
        return this.base.post<{ ok: boolean }>(`${this.resource}/hard-delete`, { ids });
    }

    // helpers de uno en uno
    softDeleteOne(id: number) { return this.softDeleteMany([id]); }
    restoreOne(id: number) { return this.restoreMany([id]); }
    hardDeleteOne(id: number) { return this.hardDeleteMany([id]); }
}
