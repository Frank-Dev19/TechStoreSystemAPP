import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';
import { Clientes } from '../../pages/clientes/clientes';
import { DocumentTypes } from '../../pages/document-types/document-types';

export const AdminLayoutRoutes: Routes = [
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'clientes', component: Clientes },
    { path: 'document-types', component: DocumentTypes },
];
