import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TriggerService {
    // Subjects para manejar la activación y desactivación del loader
    private _listenersLoad = new Subject<any>();  // Manejador para mostrar el loader
    private _listenersLoadOut = new Subject<any>(); // Manejador para ocultar el loader

    constructor() { }

    // Método para escuchar cuando se activa el loader
    listenLoaderPetition(): Observable<any> {
        return this._listenersLoad.asObservable();
    }

    // Método para escuchar cuando se desactiva el loader
    listenLoaderOutPetition(): Observable<any> {
        return this._listenersLoadOut.asObservable();
    }

    // Método para disparar el evento que activa el loader
    fireShowLoader(): void {
        this._listenersLoad.next('show');  // Se puede pasar cualquier cosa, en este caso un simple texto
    }

    // Método para disparar el evento que oculta el loader
    fireHideLoader(): void {
        this._listenersLoadOut.next('hide');  // El mismo comportamiento, pero para ocultarlo
    }
}
