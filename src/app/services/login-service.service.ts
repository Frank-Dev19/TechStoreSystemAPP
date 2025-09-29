import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BaseService } from './base.service';
import { config } from '../../environments/environment';
import { AuthSessionService } from './auth-session.service';
import { decodeJwt } from '../utils/jwt.util';
import { User } from '../models/user/user';
import { CurrentUserService } from './current-user.service';

interface LoginResponse { accessToken: string; user: User; }

@Injectable({ providedIn: 'root' })
export class LoginService {
    constructor(
        private base: BaseService,
        private session: AuthSessionService,
        private current: CurrentUserService,
    ) { }

    login(email: string, password: string): Observable<LoginResponse> {
        const body = { email, password };
        return this.base
            .post<LoginResponse>(`${config.authMethod}login`, body, { withCredentials: true })
            .pipe(tap(res => {
                this.session.setAccessToken(res.accessToken);
                this.current.set(res.user);
            }));
    }

    async logout(): Promise<void> {
        this.session.clearSession();
        try {
            await this.base.post(`${config.authMethod}logout`, {}, { withCredentials: true, withLoader: false }).toPromise();
        } catch { }
    }

    isLoggedIn(): boolean {
        const token = this.session.getAccessToken();
        if (!token) return false;
        try {
            const payload: any = decodeJwt(token);
            if (!payload?.exp) return false;
            const now = Math.floor(Date.now() / 1000);
            return now < payload.exp;
        } catch { return false; }
    }

    getCurrentUserEmail(): string | null {
        const token = this.session.getAccessToken();
        if (!token) return null;
        try { return (decodeJwt(token) as any)?.email ?? null; } catch { return null; }
    }
}
