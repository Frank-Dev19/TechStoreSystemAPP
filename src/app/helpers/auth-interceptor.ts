import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const token = localStorage.getItem('id_token');

        // Excluir '/auth/register' de la inclusión del token
        if (token && !req.url.includes('/auth/register')) {
            const cloned = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
            return next.handle(cloned);
        }

        // Si es '/auth/register' o no hay token, sigue sin modificar
        return next.handle(req);

        // Obtén el token del almacenamiento local (o donde lo guardes)
        // const token = localStorage.getItem('id_token');

        // // Si el token existe, añade el encabezado de autorización
        // if (token) {
        //   const cloned = req.clone({
        //     setHeaders: {
        //       Authorization: `Bearer ${token}`
        //     }
        //   });
        //   return next.handle(cloned); // Continúa con la solicitud modificada
        // }

        // // Si no hay token, continúa con la solicitud original
        // return next.handle(req);
    }
}
