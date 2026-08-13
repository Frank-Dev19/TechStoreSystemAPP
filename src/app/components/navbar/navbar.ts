import { Component, OnInit, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { ROUTES } from '../sidebar/sidebar';
import { Location } from '@angular/common';
import { LoginService } from '../../services/login-service.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CurrentUserService } from '../../services/current-user.service';
import { ProfileService } from '../../services/profile.service';
import { User } from '../../models/user/user';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit, OnDestroy {
  authenticatedUser: User | null = null;
  private listTitles: any[] = [];
  private sidebarVisible = false;
  private userSub?: Subscription;
  private routerSub?: Subscription;

  isDropdownOpen = false;

  constructor(
    private locationSvc: Location,
    private element: ElementRef,
    private router: Router,
    private modalService: NgbModal,
    private loginService: LoginService,
    private currentUserService: CurrentUserService,
    private profileService: ProfileService
  ) { }

  ngOnInit(): void {
    this.currentUserService.restoreFromStorage();
    this.userSub = this.currentUserService.user$.subscribe((user) => {
      this.authenticatedUser = user;
    });

    if (!this.currentUserService.value) {
      this.profileService.getMe().subscribe({
        next: (user) => this.currentUserService.set(user),
        error: () => this.currentUserService.clear(),
      });
    }

    this.listTitles = ROUTES.filter(t => t);

    // Cierra sidebar/overlay al navegar
    this.routerSub = this.router.events.subscribe(() => this.sidebarCloseIfAny());
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.sidebarCloseIfAny();
  }

  /* ===== Dropdown usuario ===== */
  toggleUserDropdown(): void { this.isDropdownOpen = !this.isDropdownOpen; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const inside = (event.target as HTMLElement).closest('.navbar-right');
    if (!inside && this.isDropdownOpen) this.isDropdownOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1001) this.sidebarCloseIfAny(); // saliendo de móvil, ciérralo
  }

  /* ===== Sidebar off-canvas: ahora con clase .open en .sidebar-panel ===== */
  sidebarOpen(): void {
    if (window.innerWidth >= 1001) return; // solo móvil
    const sidebarPanel = document.querySelector('.sidebar-panel') as HTMLElement | null;
    const mainPanel = document.querySelector('.main-panel') as HTMLElement | null;
    if (!sidebarPanel || !mainPanel) return;

    if (!sidebarPanel.classList.contains('open')) {
      sidebarPanel.classList.add('open');

      // overlay
      let layer = mainPanel.querySelector('.close-layer') as HTMLElement | null;
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'close-layer';
        mainPanel.appendChild(layer);
      }
      // animación
      requestAnimationFrame(() => layer!.classList.add('visible'));
      layer!.onclick = () => this.sidebarCloseIfAny();

      this.sidebarVisible = true;
    }
  }

  sidebarCloseIfAny(): void {
    const sidebarPanel = document.querySelector('.sidebar-panel') as HTMLElement | null;
    const mainPanel = document.querySelector('.main-panel') as HTMLElement | null;
    const layer = mainPanel?.querySelector('.close-layer') as HTMLElement | null;

    sidebarPanel?.classList.remove('open');

    if (layer) {
      layer.classList.remove('visible');
      setTimeout(() => layer && layer.remove(), 150);
    }
    this.sidebarVisible = false;
  }

  sidebarToggle(): void {
    if (this.sidebarVisible) this.sidebarCloseIfAny();
    else this.sidebarOpen();
  }

  getTitle(): string {
    let p = this.locationSvc.prepareExternalUrl(this.locationSvc.path());
    if (p.charAt(0) === '#') p = p.slice(1);
    for (let i = 0; i < this.listTitles.length; i++) {
      if (this.listTitles[i].path === p) return this.listTitles[i].title;
    }
    return 'SISTEMA DE GESTIÓN';
  }

  logout(): void {
    this.loginService.logout();
    this.router.navigateByUrl('/login');
  }

  getCurrentUserDisplayName(): string {
    return this.authenticatedUser?.name || this.authenticatedUser?.email || 'Usuario';
  }
}
