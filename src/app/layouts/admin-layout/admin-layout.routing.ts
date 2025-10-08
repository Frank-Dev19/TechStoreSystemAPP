import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';
import { BusinessPartners } from '../../pages/business-partners/business-partners';
import { Tests } from '../../pages/tests/tests';
import { Perfil } from '../../pages/perfil/perfil';
import { DocumentTypes } from '../../pages/document-types/document-types';
import { Rbac } from '../../pages/rbac/rbac';
export const AdminLayoutRoutes: Routes = [
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'business-partners', component: BusinessPartners },
    { path: 'tests', component: Tests },
    { path: 'perfil', component: Perfil },
    { path: 'document-types', component: DocumentTypes },
    { path: 'rbac', component: Rbac },
];
