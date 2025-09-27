import { Injectable } from '@angular/core';
import {
    HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthSessionService } from '../services/auth-session.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    private isRefreshing = false;
    private refreshSubject = new BehaviorSubject<string | null>(null);

    constructor(
        private session: AuthSessionService,
        private router: Router
    ) { }

    private addAuth(req: HttpRequest<any>, token: string): HttpRequest<any> {
        return req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const skip = req.headers.has('X-Skip-Auth') || req.url.includes('/auth/refresh');
        const token = this.session.getAccessToken();

        const authReq = (!skip && token) ? this.addAuth(req, token) : req;

        return next.handle(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status !== 401) return throwError(() => error);

                // Si el request ya era de refresh o marcado como skip, no lo intentes otra vez
                if (skip) return throwError(() => error);

                // Manejo de 401: refresh en cola
                if (this.isRefreshing) {
                    return this.refreshSubject.pipe(
                        filter(t => t !== null),
                        take(1),
                        switchMap(t => next.handle(this.addAuth(req, t!)))
                    );
                } else {
                    this.isRefreshing = true;
                    this.refreshSubject.next(null);

                    return this.session.refreshAccessToken().pipe(
                        switchMap(newToken => {
                            this.isRefreshing = false;
                            this.refreshSubject.next(newToken);
                            return next.handle(this.addAuth(req, newToken));
                        }),
                        catchError(err => {
                            this.isRefreshing = false;
                            this.session.clearSession();
                            this.refreshSubject.next(null);
                            this.router.navigate(['/login']);
                            return throwError(() => err);
                        })
                    );
                }
            })
        );
    }
}
