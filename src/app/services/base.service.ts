// src/app/services/base.service.ts
import { Injectable } from '@angular/core';
import {
    HttpClient,
    HttpHeaders,
    HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TriggerService } from './trigger-service.service';
import { config } from '../../environments/environment';

export interface HttpOptions {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    params?:
    | HttpParams
    | {
        [param: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<string | number | boolean>;
    };
    reportProgress?: boolean;
    responseType?: 'json';
    withCredentials?: boolean;    // ✅ ahora soportado
    withLoader?: boolean;          // ✅ loader opcional (por defecto true)
    body?: any;
}

@Injectable()
export class BaseService {
    constructor(
        private http: HttpClient,
        private trigger: TriggerService,
        private router: Router
    ) { }

    // ------------ Métodos públicos ------------
    get<T>(url: string, options?: HttpOptions): Observable<T> {
        return this.request<T>('GET', url, null, options);
    }

    post<T>(url: string, body?: any, options?: HttpOptions): Observable<T> {
        return this.request<T>('POST', url, body, options);
    }

    patch<T>(url: string, body?: any, options?: HttpOptions): Observable<T> {
        return this.request<T>('PATCH', url, body, options);
    }

    delete<T>(url: string, options?: HttpOptions): Observable<T> {
        return this.request<T>('DELETE', url, options?.body, options);
    }

    // ------------ Internos ------------
    private request<T>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        url: string,
        body?: any,
        options?: HttpOptions
    ): Observable<T> {
        const { withLoader = true, body: optionsBody, ...httpOpts } = options ?? {};

        const fullUrl = `${config.endpointServices}${url}`;

        const headers = this.buildHeaders(httpOpts.headers);

        if (withLoader) this.trigger.fireShowLoader();

        const requestBody = body ?? optionsBody;

        return this.http
            .request<T>(method, fullUrl, {
                body: requestBody,
                ...httpOpts,          // ← aquí se respeta withCredentials
                headers,
            })
            .pipe(
                finalize(() => {
                    if (withLoader) this.trigger.fireHideLoader();
                }),
                catchError(err => {
                    // Manejo básico de errores
                    if (err.status === 401) {
                        // deja que el AuthGuard/interceptor maneje redirecciones si aplica
                    }
                    return throwError(() => err);
                })
            );
    }

    private buildHeaders(
        input?: HttpOptions['headers']
    ): HttpHeaders {
        let headers =
            input instanceof HttpHeaders ? input : new HttpHeaders(input ?? {});
        if (!headers.has('Content-Type')) {
            headers = headers.set('Content-Type', 'application/json');
        }
        return headers;
    }
}
