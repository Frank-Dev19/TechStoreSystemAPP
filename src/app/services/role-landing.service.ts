import { Injectable } from '@angular/core';
import { User } from '../models/user/user';
import { CurrentUserService } from './current-user.service';
import {
  hasAdminRole,
  hasAnyRole,
  RECEPTIONIST_ROLE_NAMES,
  TECHNICIAN_ROLE_NAMES,
} from '../utils/role.utils';

@Injectable({ providedIn: 'root' })
export class RoleLandingService {
  constructor(private readonly currentUserService: CurrentUserService) {}

  getDefaultRoute(user: User | null = this.currentUserService.value): string {
    if (hasAdminRole(user?.roles)) {
      return '/supervisor-panel';
    }

    if (hasAnyRole(user?.roles, RECEPTIONIST_ROLE_NAMES)) {
      return '/reception-panel';
    }

    if (hasAnyRole(user?.roles, TECHNICIAN_ROLE_NAMES)) {
      return '/technician-panel';
    }

    return '/perfil';
  }
}
