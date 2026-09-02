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
import { BusinessProfilePage } from '../../pages/business-profile/business-profile';
import { MailSettingsPage } from '../../pages/mail-settings/mail-settings';
import { ReceptionPanel } from '../../pages/reception-panel/reception-panel';
import { ServiceOrderInboxPage } from '../../pages/service-order-inbox/service-order-inbox';
import { TechnicianPanel } from '../../pages/technician-panel/technician-panel';
import { SupervisorPanel } from '../../pages/supervisor-panel/supervisor-panel';
import { WarrantiesPage } from '../../pages/warranties/warranties';
import { RoleGuard } from '../../helpers/role.guard';
import { PermissionGuard } from '../../helpers/permission.guard';
import { RoleLandingGuard } from '../../helpers/role-landing.guard';
import { RECEPTIONIST_ROLE_NAMES, SUPERVISOR_ROLE_NAMES, TECHNICIAN_ROLE_NAMES } from '../../utils/role.utils';

export const AdminLayoutRoutes: Routes = [
    { path: 'home', component: Home, canActivate: [RoleLandingGuard] },
    { path: 'dashboard', component: Dashboard, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.admin'] } },
    { path: 'clientes', component: Clients, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.clients'] } },
    { path: 'proveedores', component: Suppliers, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.suppliers'] } },
    { path: 'tests', component: Tests, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.admin'] } },
    { path: 'perfil', component: Perfil, canActivate: [PermissionGuard], data: { requiredPermissions: ['profile.manage-own'] } },
    { path: 'tipos-documento', component: DocumentTypes, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.document-types'] } },
    { path: 'rbac', component: Rbac, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.admin'] } },
    { path: 'inventory', component: Inventory, canActivate: [PermissionGuard], data: { anyPermissions: ['navigation.inventory-kardex', 'navigation.inventory-manage'] } },
    { path: 'auditoria', component: Auditoria, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.admin'] } },
    { path: 'ventas', component: Ventas, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.sales'] } },
    { path: 'pricing', component: Pricing, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.admin'] } },
    { path: 'configuracion-empresa', component: BusinessProfilePage, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.admin'] } },
    { path: 'configuracion-correo', component: MailSettingsPage, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.mail-settings'] } },
    { path: 'garantias', component: WarrantiesPage, canActivate: [PermissionGuard], data: { requiredPermissions: ['navigation.warranties'] } },
    {
        path: 'reception-panel',
        component: ReceptionPanel,
        canActivate: [RoleGuard, PermissionGuard],
        data: { allowedRoles: RECEPTIONIST_ROLE_NAMES, requiredPermissions: ['navigation.reception'] },
    },
    {
        path: 'service-order-inbox',
        component: ServiceOrderInboxPage,
        canActivate: [RoleGuard, PermissionGuard],
        data: {
          allowedRoles: [...RECEPTIONIST_ROLE_NAMES, ...TECHNICIAN_ROLE_NAMES, ...SUPERVISOR_ROLE_NAMES],
          anyPermissions: ['navigation.inbox', 'navigation.admin', 'service-order-inbox.read'],
        },
    },
    {
        path: 'technician-panel',
        component: TechnicianPanel,
        canActivate: [RoleGuard, PermissionGuard],
        data: { allowedRoles: TECHNICIAN_ROLE_NAMES, requiredPermissions: ['navigation.technician'] },
    },
    {
        path: 'supervisor-panel',
        component: SupervisorPanel,
        canActivate: [RoleGuard],
        data: { allowedRoles: SUPERVISOR_ROLE_NAMES },
    },
];
