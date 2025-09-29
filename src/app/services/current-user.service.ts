import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user/user';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
    private subject = new BehaviorSubject<User | null>(null);
    user$ = this.subject.asObservable();

    get value(): User | null { return this.subject.value; }

    set(user: User | null) {
        this.subject.next(user);
        if (user) localStorage.setItem('current_user', JSON.stringify(user));
        else localStorage.removeItem('current_user');
    }

    restoreFromStorage() {
        const raw = localStorage.getItem('current_user');
        if (raw) {
            try { this.subject.next(JSON.parse(raw)); } catch { /* ignore */ }
        }
    }

    clear() { this.set(null); }
}
