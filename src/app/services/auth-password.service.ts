import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { config } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthPasswordService {
    constructor(private base: BaseService) { }

    forgotPassword(email: string): Observable<{ message: string }> {
        return this.base.post<{ message: string }>(`${config.authMethod}forgot-password`, { email });
    }

    verifyReset(uid: number, token: string): Observable<{ ok: boolean }> {
        const params = new URLSearchParams({ uid: String(uid), token }).toString();
        return this.base.get<{ ok: boolean }>(`${config.authMethod}password/verify?${params}`);
    }

    resetPassword(uid: number, token: string, newPassword: string): Observable<{ ok: boolean }> {
        return this.base.post<{ ok: boolean }>(`${config.authMethod}reset-password`, { uid, token, newPassword });
    }
}
