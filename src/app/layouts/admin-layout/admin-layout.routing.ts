import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';


export const AdminLayoutRoutes: Routes = [
    //{ path: "home", component: Home },
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },

];
