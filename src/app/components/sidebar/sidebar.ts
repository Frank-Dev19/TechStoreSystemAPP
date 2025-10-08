import { Component, OnInit } from '@angular/core';
import { Usuario } from '../../models/user';
import { LoginService } from '../../services/login-service.service';
import { User } from '../../models/user/user';
import { ProfileService } from '../../services/profile.service';
import { CurrentUserService } from '../../services/current-user.service';
declare interface RouteInfo {
  path: string
  title: string
  icon: string
  class: string
}

export const ROUTES: RouteInfo[] = [
  { path: "/dashboard", title: "DASHBOARD", icon: "icon-chart-pie-36", class: "" },
  { path: "/estado-proyectos", title: "Estado de Proyectos", icon: "icon-puzzle-10", class: "" },
  { path: "/registro-resoluciones", title: "Estado de Lote en el Proyecto", icon: "icon-puzzle-10", class: "" },
  { path: "/tables", title: "Table List", icon: "icon-puzzle-10", class: "" },
  { path: "/typography", title: "Typography", icon: "icon-align-center", class: "" },
  { path: "/perfil", title: "GESTION DE PERFIL", icon: "icon-chart-pie-36", class: "" },
  { path: "/rbac", title: "GESTION DE CONTROL DE ACCESO", icon: "icon-chart-pie-36", class: "" },
]

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  isOpen = false
  authenticatedUser: User | null = null;
  menuItems: RouteInfo[] = []
  subMenuState: Record<string, boolean> = {
    modulo1: false,
    Modulo1: false,
    Modulo2: false,
    Modulo4: false,
    Modulo5: false,
    Modulo6: false,
    Modulo7: false,
  }

  constructor(private currentUserService: CurrentUserService, private perfil: ProfileService) { }

  ngOnInit(): void {
    //this.currentUser();
    this.menuItems = ROUTES.filter((m) => m);

    // Restaura usuario guardado (lo setean login/refresh)
    this.currentUserService.restoreFromStorage();

    // Suscripción al usuario actual
    this.currentUserService.user$.subscribe(u => this.authenticatedUser = u);

    // (Opcional) si al recargar aún no hay usuario, consulta /auth/me y puebla el estado
    if (!this.currentUserService.value) {
      this.perfil.getMe().subscribe({
        next: u => this.currentUserService.set(u),
        error: () => { /* ignora si 401 */ },
      });
    }
  }

  toggleSubMenu(menu: string): void {
    this.subMenuState[menu] = !this.subMenuState[menu]
  }
  isSubMenuOpen(menu: string): boolean {
    return !!this.subMenuState[menu]
  }

  // private currentUser(): void {
  //   this.authenticatedUser = this.perfil.getMe();
  // }

  // Función para abrir/cerrar sidebar
  toggleSidebar() {
    this.isOpen = !this.isOpen

    // Prevenir scroll del body en móvil
    if (window.innerWidth <= 767) {
      if (this.isOpen) {
        document.body.classList.add("sidebar-open")
      } else {
        document.body.classList.remove("sidebar-open")
      }
    }
  }

  // También en el ngOnDestroy para limpiar
  ngOnDestroy() {
    document.body.classList.remove("sidebar-open")
  }
}
