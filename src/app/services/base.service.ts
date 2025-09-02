import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { TriggerService } from './trigger-service.service';
import { config } from '../../environments/environment';

@Injectable()
export class BaseService {

    headers: HttpHeaders;

    constructor(private http: HttpClient, private triggerServiceInstance: TriggerService, private router: Router) {
        this.headers = new HttpHeaders().set('Content-Type', 'application/json');
    }

    ExecuteHttpPost<T>(method: string, body: any, callback?: any): Observable<T> {
        this.triggerServiceInstance.fireShowLoader();
        return this.http.post<T>(config.endpointServices + method, body, { headers: this.headers }).pipe(
            tap(
                (res) => {
                    this.triggerServiceInstance.fireHideLoader();
                    if (callback) {
                        callback(res);
                    }
                },
                (e: HttpErrorResponse) => {
                    if (e.message.indexOf('Http failure response') > -1) {
                        console.log('No se ha podido conectar al servicio');
                        if (e.status === 401) {
                            this.router.navigate(['/login']);
                            localStorage.removeItem('id_token');
                        }
                    }
                    this.triggerServiceInstance.fireHideLoader();
                }
            )
        );
    }
}
