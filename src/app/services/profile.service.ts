import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { User } from '../models/user/user';
import { CurrentUserService } from './current-user.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
    constructor(private base: BaseService, private current: CurrentUserService) { }

    getMe() {
        return this.base.get<User>('/auth/me');
    }

    updateMe(patch: { name?: string; phone?: string | null }) {
        return this.base.patch<User>('/auth/me', patch);
    }

    changePassword(oldPassword: string, newPassword: string) {
        return this.base.post<{ ok: true }>('/auth/change-password', { oldPassword, newPassword });
    }

    // Helper para actualizar el estado global tras un PATCH
    setCurrent(user: User) { this.current.set(user); }
}
