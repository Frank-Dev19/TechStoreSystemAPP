import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    this.currentUserService.restoreFromStorage();
    const user = this.currentUserService.value;
    const requiredPermissions =
      (route.data?.['requiredPermissions'] as readonly string[] | undefined) ?? [];
    const anyPermissions =
      (route.data?.['anyPermissions'] as readonly string[] | undefined) ?? [];

    const hasRequired = this.currentUserService.hasAllPermissions(requiredPermissions, user);
    const hasAny = !anyPermissions.length
      || this.currentUserService.hasAnyPermission(anyPermissions, user);

    if (user && hasRequired && hasAny) {
      return true;
    }

    this.router.navigate(['/home']);
    return false;
  }
}
