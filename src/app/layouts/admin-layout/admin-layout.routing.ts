import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';
import { BusinessPartners } from '../../pages/business-partners/business-partners';
import { Tests } from '../../pages/tests/tests';
import { Perfil } from '../../pages/perfil/perfil';
import { DocumentTypes } from '../../pages/document-types/document-types';
import { Rbac } from '../../pages/rbac/rbac';
import { Inventory } from '../../pages/inventory/inventory';
import { ServiceCatalog } from '../../pages/service-catalog/service-catalog';
import { ReceptionPanel } from '../../pages/reception-panel/reception-panel';
import { TechnicianPanel } from '../../pages/technician-panel/technician-panel';

export const AdminLayoutRoutes: Routes = [
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'socios-comerciales', component: BusinessPartners },
    { path: 'tests', component: Tests },
    { path: 'perfil', component: Perfil },
    { path: 'tipos-documento', component: DocumentTypes },
    { path: 'rbac', component: Rbac },
    { path: 'inventory', component: Inventory },
    { path: 'catalogo-servicios', component: ServiceCatalog },
    { path: 'reception-panel', component: ReceptionPanel },
    { path: 'technician-panel', component: TechnicianPanel },
];
