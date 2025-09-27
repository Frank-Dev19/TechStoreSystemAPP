import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BaseService } from './base.service';
import { config } from '../../environments/environment';
import { AuthSessionService } from './auth-session.service';
import { decodeJwt } from '../utils/jwt.util';

interface LoginResponse { accessToken: string; }

@Injectable({ providedIn: 'root' })
export class LoginService {

    constructor(
        private base: BaseService,
        private session: AuthSessionService,
    ) { }

    login(email: string, password: string): Observable<LoginResponse> {
        const body = { email, password };
        return this.base.post<LoginResponse>(`${config.authMethod}login`, body).pipe(
            tap(res => this.session.setAccessToken(res.accessToken))
        );
    }

    async logout(): Promise<void> {
        // Limpia access token local
        this.session.clearSession();
        // Pide al backend limpiar la cookie refresh
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
        try {
            const payload: any = decodeJwt(token);
            return payload?.email ?? null;
        } catch { return null; }
    }
}
