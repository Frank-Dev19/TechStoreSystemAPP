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
    { path: 'home', component: Home, canActivate: [RoleLandingGuard], data: { navbarTitle: 'SISTEMA DE GESTIÓN' } },
    { path: 'dashboard', component: Dashboard, canActivate: [PermissionGuard], data: { navbarTitle: 'PANEL DE CONTROL', requiredPermissions: ['navigation.admin'] } },
    { path: 'clientes', component: Clients, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE CLIENTES', requiredPermissions: ['navigation.clients'] } },
    { path: 'proveedores', component: Suppliers, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE PROVEEDORES', requiredPermissions: ['navigation.suppliers'] } },
    { path: 'tests', component: Tests, canActivate: [PermissionGuard], data: { navbarTitle: 'PRUEBAS DEL SISTEMA', requiredPermissions: ['navigation.admin'] } },
    { path: 'perfil', component: Perfil, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE PERFIL', requiredPermissions: ['profile.manage-own'] } },
    { path: 'tipos-documento', component: DocumentTypes, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE TIPOS DE DOCUMENTO', requiredPermissions: ['navigation.document-types'] } },
    { path: 'rbac', component: Rbac, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE CONTROL DE ACCESO', requiredPermissions: ['navigation.admin'] } },
    { path: 'inventory', component: Inventory, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE CONTROL DE INVENTARIO', anyPermissions: ['navigation.inventory-kardex', 'navigation.inventory-manage'] } },
    { path: 'auditoria', component: Auditoria, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE AUDITORÍA', requiredPermissions: ['navigation.admin'] } },
    { path: 'ventas', component: Ventas, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE VENTAS', requiredPermissions: ['navigation.sales'] } },
    { path: 'pricing', component: Pricing, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE PRECIOS', requiredPermissions: ['navigation.admin'] } },
    { path: 'configuracion-empresa', component: BusinessProfilePage, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE EMPRESA EMISORA', requiredPermissions: ['navigation.admin'] } },
    { path: 'configuracion-correo', component: MailSettingsPage, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE CORREO ELECTRÓNICO', requiredPermissions: ['navigation.mail-settings'] } },
    { path: 'garantias', component: WarrantiesPage, canActivate: [PermissionGuard], data: { navbarTitle: 'GESTIÓN DE GARANTÍAS', requiredPermissions: ['navigation.warranties'] } },
    {
        path: 'reception-panel',
        component: ReceptionPanel,
        canActivate: [RoleGuard, PermissionGuard],
        data: { navbarTitle: 'PANEL DE RECEPCIÓN', allowedRoles: RECEPTIONIST_ROLE_NAMES, requiredPermissions: ['navigation.reception'] },
    },
    {
        path: 'service-order-inbox',
        component: ServiceOrderInboxPage,
        canActivate: [RoleGuard, PermissionGuard],
        data: {
          navbarTitle: 'BANDEJA DE ÓRDENES DE SERVICIO',
          allowedRoles: [...RECEPTIONIST_ROLE_NAMES, ...TECHNICIAN_ROLE_NAMES, ...SUPERVISOR_ROLE_NAMES],
          anyPermissions: ['navigation.inbox', 'navigation.admin', 'service-order-inbox.read'],
        },
    },
    {
        path: 'technician-panel',
        component: TechnicianPanel,
        canActivate: [RoleGuard, PermissionGuard],
        data: { navbarTitle: 'PANEL DEL TÉCNICO', allowedRoles: TECHNICIAN_ROLE_NAMES, requiredPermissions: ['navigation.technician'] },
    },
    {
        path: 'supervisor-panel',
        component: SupervisorPanel,
        canActivate: [RoleGuard],
        data: { navbarTitle: 'PANEL DE SUPERVISIÓN', allowedRoles: SUPERVISOR_ROLE_NAMES },
    },
];
