import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { config } from './../../environments/environment';
import { UserSession, Usuario } from '../models/user';
import { BaseService } from './base.service';
import moment from 'moment';  // Asegúrate de tener Moment.js instalado para manejar fechas

@Injectable({
    providedIn: 'root'
})
export class LoginService {

    usuarioLogin: Usuario;

    constructor(private base: BaseService, private http: HttpClient) { }

    login(user: string, password: string): Observable<UserSession> {
        return this.base.ExecuteHttpPost<UserSession>(config.authMethod + 'login', {
            username: user,
            password: password
        }, this.setSession);
    }

    private setSession(authResult: UserSession) {
        if (authResult) {
            localStorage.setItem('id_token', authResult.token);
            localStorage.setItem('expires_at', JSON.stringify(authResult.timeExpires));
            localStorage.setItem('user-info', JSON.stringify(authResult.usuario));
        }
    }

    logout() {
        localStorage.removeItem('id_token');
        localStorage.removeItem('expires_at');
        localStorage.removeItem('user-info');
    }

    isUserLoggedIn(): Usuario {
        const accessToken = localStorage.getItem("id_token");
        const jsonUserInfo = localStorage.getItem("user-info");
        this.usuarioLogin = JSON.parse(jsonUserInfo);
        if (this.usuarioLogin) {
            return this.usuarioLogin;
        } else {
            return null;
        }
    }




    // Método para verificar si el usuario está logueado
    isLoggedIn(): boolean {
        const token = localStorage.getItem('id_token');
        const expiresAt = localStorage.getItem('expires_at');

        if (!token || !expiresAt) {
            return false;
        }

        // const expirationDate = moment(JSON.parse(expiresAt));  // Verifica si la fecha de expiración no ha pasado
        // return moment().isBefore(expirationDate);  // Compara si la fecha de expiración es mayor que la fecha actual

        // Parsea la fecha con el formato exacto que envía el backend
        const expirationDate = moment(expiresAt, 'ddd MMM DD HH:mm:ss [PET] YYYY');
        return moment().isBefore(expirationDate);

    }
}
