import { Component, OnInit, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { LoginService } from '../../services/login-service.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { filter, Subscription } from 'rxjs';
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
  navbarTitle = 'SISTEMA DE GESTIÓN';
  navbarLink = '/home';
  private sidebarVisible = false;
  private userSub?: Subscription;
  private routerSub?: Subscription;

  isDropdownOpen = false;

  constructor(
    private element: ElementRef,
    private router: Router,
    private activatedRoute: ActivatedRoute,
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

    this.updateNavigationContext();
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateNavigationContext();
        this.sidebarCloseIfAny();
      });
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
    if (!window.matchMedia('(max-width: 1000px)').matches) this.sidebarCloseIfAny();
  }

  /* ===== Sidebar off-canvas: ahora con clase .open en .sidebar-panel ===== */
  sidebarOpen(): void {
    // Match the CSS breakpoint even when overflowing content expands innerWidth.
    if (!window.matchMedia('(max-width: 1000px)').matches) return;
    const sidebarContainer = document.querySelector('.sidebar') as HTMLElement | null;
    const sidebarPanel = document.querySelector('.sidebar-panel') as HTMLElement | null;
    const mainPanel = document.querySelector('.main-panel') as HTMLElement | null;
    if (!sidebarContainer || !sidebarPanel || !mainPanel) return;

    if (!sidebarPanel.classList.contains('open')) {
      sidebarContainer.classList.add('open');
      sidebarPanel.classList.add('open');
      document.body.classList.add('sidebar-open');

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
    const sidebarContainer = document.querySelector('.sidebar') as HTMLElement | null;
    const sidebarPanel = document.querySelector('.sidebar-panel') as HTMLElement | null;
    const mainPanel = document.querySelector('.main-panel') as HTMLElement | null;
    const layer = mainPanel?.querySelector('.close-layer') as HTMLElement | null;

    sidebarContainer?.classList.remove('open');
    sidebarPanel?.classList.remove('open');
    document.body.classList.remove('sidebar-open');

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

  private updateNavigationContext(): void {
    let activeRoute = this.activatedRoute;
    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    const routeTitle = activeRoute.snapshot.data['navbarTitle'];
    this.navbarTitle = typeof routeTitle === 'string' && routeTitle.trim()
      ? routeTitle
      : 'SISTEMA DE GESTIÓN';

    const currentPath = this.router.url.split(/[?#]/, 1)[0];
    this.navbarLink = currentPath && currentPath !== '/' ? currentPath : '/home';
  }

  logout(): void {
    this.loginService.logout();
    this.router.navigateByUrl('/login');
  }

  getCurrentUserDisplayName(): string {
    return this.authenticatedUser?.name || this.authenticatedUser?.email || 'Usuario';
  }
}
