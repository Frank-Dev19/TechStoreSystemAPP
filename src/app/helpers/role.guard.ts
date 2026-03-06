import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';
import { hasAdminRole, hasAnyRole } from '../utils/role.utils';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    this.currentUserService.restoreFromStorage();
    const user = this.currentUserService.value;
    const allowedRoles = (route.data?.['allowedRoles'] as readonly string[] | undefined) ?? [];

    if (hasAdminRole(user?.roles) || hasAnyRole(user?.roles, allowedRoles)) {
      return true;
    }

    this.router.navigate(['/home']);
    return false;
  }
}
