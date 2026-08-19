import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';
import { RoleLandingService } from '../services/role-landing.service';

@Injectable({ providedIn: 'root' })
export class RoleLandingGuard implements CanActivate {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly roleLandingService: RoleLandingService,
    private readonly router: Router,
  ) {}

  canActivate(): UrlTree {
    this.currentUserService.restoreFromStorage();
    return this.router.parseUrl(this.roleLandingService.getDefaultRoute());
  }
}
