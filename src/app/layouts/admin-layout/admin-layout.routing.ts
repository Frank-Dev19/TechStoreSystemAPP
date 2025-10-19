import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';
import { BusinessPartners } from '../../pages/business-partners/business-partners';
import { Tests } from '../../pages/tests/tests';
import { Perfil } from '../../pages/perfil/perfil';
import { DocumentTypes } from '../../pages/document-types/document-types';
import { Rbac } from '../../pages/rbac/rbac';
import { Inventory } from '../../pages/inventory/inventory';

export const AdminLayoutRoutes: Routes = [
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'socios-comerciales', component: BusinessPartners },
    { path: 'tests', component: Tests },
    { path: 'perfil', component: Perfil },
    { path: 'tipos-documento', component: DocumentTypes },
    { path: 'rbac', component: Rbac },
    { path: 'inventory', component: Inventory },
];
