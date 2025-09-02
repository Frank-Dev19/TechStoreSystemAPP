import { Component, OnInit } from '@angular/core';
import { Usuario } from '../../models/user';
import { LoginService } from '../../services/login-service.service';

declare interface RouteInfo {
  path: string;
  title: string;
  icon: string;
  class: string;
}

export const ROUTES: RouteInfo[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    icon: "icon-chart-pie-36",
    class: ""
  },
  {
    path: "/estado-proyectos",
    title: "Estado de Proyectos",
    icon: "icon-puzzle-10",
    class: ""
  },
  {
    path: "/registro-resoluciones",
    title: "Estado de Lote en el Proyecto",
    icon: "icon-puzzle-10",
    class: ""
  },

  {
    path: "/tables",
    title: "Table List",
    icon: "icon-puzzle-10",
    class: ""
  },
  {
    path: "/typography",
    title: "Typography",
    icon: "icon-align-center",
    class: ""
  }
];

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  authenticatedUser: Usuario;
  menuItems: any[];
  title = 'mi-menu-lateral';
  menuOpen = false;
  subMenuState = {
    parametros: false,  // Control del submenú "Servicios"
    configguracion: false,
    procesos: false,
    administracion: false,
  };

  constructor(
    private loginService: LoginService
  ) { }

  ngOnInit() {
    this.currentUser();
    this.menuItems = ROUTES.filter(menuItem => menuItem);
  }
  isMobileMenu() {
    if (window.innerWidth > 991) {
      return false;
    }
    return true;
  }

  // Función para alternar el menú lateral
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Función para alternar la visibilidad de un submenú
  toggleSubMenu(menu: string) {
    this.subMenuState[menu] = !this.subMenuState[menu];
    console.log(this.authenticatedUser.role);

  }

  // Comprobar si un submenú está abierto
  isSubMenuOpen(menu: string): boolean {
    return this.subMenuState[menu];
  }

  private currentUser() {
    this.authenticatedUser = this.loginService.isUserLoggedIn();
  }
}
