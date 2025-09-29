import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { config } from '../../environments/environment';
import { CurrentUserService } from './current-user.service';
import { User } from '../models/user/user';

interface RefreshResponse { accessToken: string; user: User; }

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
    private TOKEN_KEY = 'id_token';

    constructor(private http: HttpClient, private current: CurrentUserService) { }

    getAccessToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
    setAccessToken(token: string) { localStorage.setItem(this.TOKEN_KEY, token); }
    clearSession() { localStorage.removeItem(this.TOKEN_KEY); this.current.clear(); }

    refreshAccessToken(): Observable<string> {
        const url = `${config.endpointServices}${config.authMethod}refresh`;
        const headers = new HttpHeaders({ 'X-Skip-Auth': 'true' });
        return this.http.post<RefreshResponse>(url, {}, { withCredentials: true, headers }).pipe(
            tap(res => { this.setAccessToken(res.accessToken); this.current.set(res.user); }),
            map(res => res.accessToken)
        );
    }
}
