import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user/user';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
    private subject = new BehaviorSubject<User | null>(null);
    user$ = this.subject.asObservable();

    get value(): User | null { return this.subject.value; }

    set(user: User | null) {
        this.subject.next(user);
        if (user) localStorage.setItem('current_user', JSON.stringify(user));
        else localStorage.removeItem('current_user');
    }

    restoreFromStorage() {
        const raw = localStorage.getItem('current_user');
        if (raw) {
            try { this.subject.next(JSON.parse(raw)); } catch { /* ignore */ }
        }
    }

    getPermissionCodes(user: User | null = this.value): Set<string> {
        if (user?.effectivePermissions) {
            return new Set(user.effectivePermissions);
        }

        const rolePermissions = (user?.roles ?? []).flatMap((role) => role.permissions ?? []);
        return new Set(rolePermissions);
    }

    hasPermission(permission: string, user: User | null = this.value): boolean {
        return this.getPermissionCodes(user).has(permission);
    }

    hasAllPermissions(permissions: readonly string[], user: User | null = this.value): boolean {
        const granted = this.getPermissionCodes(user);
        return permissions.every((permission) => granted.has(permission));
    }

    hasAnyPermission(permissions: readonly string[], user: User | null = this.value): boolean {
        const granted = this.getPermissionCodes(user);
        return permissions.some((permission) => granted.has(permission));
    }

    clear() { this.set(null); }
}
