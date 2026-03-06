import { Routes } from '@angular/router';

import { Dashboard } from '../../components/dashboard/dashboard';
import { Home } from '../../pages/home/home';
import { Clients } from '../../pages/clients/clients';
import { Suppliers } from '../../pages/suppliers/suppliers';
import { Tests } from '../../pages/tests/tests';
import { Perfil } from '../../pages/perfil/perfil';
import { DocumentTypes } from '../../pages/document-types/document-types';
import { Rbac } from '../../pages/rbac/rbac';
import { Inventory } from '../../pages/inventory/inventory';
import { Auditoria } from '../../pages/auditoria/auditoria';
import { Ventas } from '../../pages/ventas/ventas';
import { Pricing } from '../../pages/pricing/pricing';
import { ServiceCatalog } from '../../pages/service-catalog/service-catalog';
import { ReceptionPanel } from '../../pages/reception-panel/reception-panel';
import { TechnicianPanel } from '../../pages/technician-panel/technician-panel';
import { SupervisorPanel } from '../../pages/supervisor-panel/supervisor-panel';
import { RoleGuard } from '../../helpers/role.guard';
import { RECEPTIONIST_ROLE_NAMES, SUPERVISOR_ROLE_NAMES, TECHNICIAN_ROLE_NAMES } from '../../utils/role.utils';

export const AdminLayoutRoutes: Routes = [
    { path: 'home', component: Home },
    { path: 'dashboard', component: Dashboard },
    { path: 'clientes', component: Clients },
    { path: 'proveedores', component: Suppliers },
    { path: 'tests', component: Tests },
    { path: 'perfil', component: Perfil },
    { path: 'tipos-documento', component: DocumentTypes },
    { path: 'rbac', component: Rbac },
    { path: 'inventory', component: Inventory },
    { path: 'auditoria', component: Auditoria },
    { path: 'ventas', component: Ventas },
    { path: 'pricing', component: Pricing },
    { path: 'catalogo-servicios', component: ServiceCatalog },
    {
        path: 'reception-panel',
        component: ReceptionPanel,
        canActivate: [RoleGuard],
        data: { allowedRoles: RECEPTIONIST_ROLE_NAMES },
    },
    {
        path: 'technician-panel',
        component: TechnicianPanel,
        canActivate: [RoleGuard],
        data: { allowedRoles: TECHNICIAN_ROLE_NAMES },
    },
    {
        path: 'supervisor-panel',
        component: SupervisorPanel,
        canActivate: [RoleGuard],
        data: { allowedRoles: SUPERVISOR_ROLE_NAMES },
    },
];
