import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { config } from '../../environments/environment';

interface RefreshResponse { accessToken: string; }

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
    private TOKEN_KEY = 'id_token';

    constructor(private http: HttpClient) { }

    getAccessToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    setAccessToken(token: string) {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    refreshAccessToken(): Observable<string> {
        const url = `${config.endpointServices}${config.authMethod}refresh`;
        // Importante: cookie HttpOnly requiere withCredentials
        const headers = new HttpHeaders({ 'X-Skip-Auth': 'true' }); // para que el interceptor NO agregue Authorization
        return this.http.post<RefreshResponse>(url, {}, { withCredentials: true, headers }).pipe(
            tap(res => this.setAccessToken(res.accessToken)),
            map(res => res.accessToken)
        );
    }
}
