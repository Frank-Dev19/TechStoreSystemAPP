import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';
import { Clientes } from '../../pages/clientes/clientes';

export const AdminLayoutRoutes: Routes = [
    //{ path: "home", component: Home },
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'clientes', component: Clientes },

];
