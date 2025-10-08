import { Component, OnInit } from '@angular/core';
import { lastValueFrom, forkJoin } from 'rxjs';

import {
  PermissionApi, PermissionCreateRequest, PermissionUpdateRequest, PermissionUI, mapPermApiToUI
} from '../../models/rbac/permission.model';
import {
  PermissionModuleApi, PermissionModuleUI, mapModuleApiToUI
} from '../../models/rbac/permission-module.model';
import {
  RoleApi, RoleUI, mapRoleApiToUI
} from '../../models/rbac/role.model';
import {
  UserApi, UserUI, UserCreateRequest, UserUpdateRequest, DocumentTypeApi, mapUserApiToUI
} from '../../models/rbac/user.model';
import {
  ExceptionalPermissionUI, scopeToString
} from '../../models/rbac/user-permission.model';

import { PermissionModulesApiService } from '../../services/rbac/permission-modules-api.service';
import { PermissionsApiService } from '../../services/rbac/permissions-api.service';
import { RolesApiService } from '../../services/rbac/roles-api.service';
import { UsersApiService } from '../../services/rbac/users-api.service';
import { UserPermsApiService, parseScope } from '../../services/rbac/user-perms-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';

// ==== Interfaces iguales a tu HTML (las mantengo para no tocar plantillas) ====
interface Permission extends PermissionUI { }
interface Role extends RoleUI { }
interface User extends UserUI { }
interface ExceptionalPermission extends ExceptionalPermissionUI { }
interface PermissionModule extends PermissionModuleUI { }

@Component({
  selector: 'app-rbac',
  standalone: false,
  templateUrl: './rbac.html',
  styleUrls: ['./rbac.scss']
})
export class Rbac implements OnInit {
  // Tabs
  activeTab: 'permissions' | 'roles' | 'users' | 'modules' = 'permissions';

  // Data UI
  permissions: Permission[] = [];
  roles: Role[] = [];
  users: User[] = [];
  exceptionalPermissions: ExceptionalPermission[] = [];
  permissionModules: PermissionModule[] = [];

  // catálogos auxiliares
  private modulesById = new Map<number, PermissionModuleApi>();
  private permissionsById = new Map<number, PermissionApi>();
  private rolesById = new Map<number, RoleApi>();
  private documentTypes: DocumentTypeApi[] = [];

  // Filtros
  searchPermission = '';
  searchRole = '';
  searchUser = '';
  searchModule = '';
  permissionFilter: 'regular' | 'exceptional' = 'regular';
  userStatusFilter: 'all' | 'active' | 'inactive' | 'deleted' = 'all';

  // Selecciones
  selectedPermissions: number[] = [];
  selectedRoles: number[] = [];
  selectedUsers: number[] = [];
  selectedModules: number[] = [];

  // Modales
  showPermissionModal = false;
  showRoleModal = false;
  showUserModal = false;
  showExceptionalPermissionModal = false;
  showModuleModal = false;
  showRolePermissionsTreeModal = false;
  showDeleteConfirmation = false;

  // Flags edición
  editingPermission = false;
  editingRole = false;
  editingUser = false;
  editingExceptionalPermission = false;
  editingModule = false;

  // Formularios (UI)
  permissionForm: Partial<Permission> = {};
  roleForm: Partial<Role> = { permissions: [] };
  userForm: Partial<User> = { roles: [], isActive: true };
  exceptionalPermissionForm: Partial<ExceptionalPermission> = { effect: 'allow' };
  moduleForm: Partial<PermissionModule> = { sortOrder: 0 };

  // Árbol de permisos por rol (usa ids de permiso)
  selectedRoleForPermissions: Role | null = null;
  tempRolePermissions: number[] = [];

  // Confirmación
  deleteConfirmationMessage = '';
  deleteConfirmationCallback: (() => void) | null = null;

  // Iconos (igual tu lista)
  availableIcons = [
    { class: 'fas fa-users', label: 'Usuarios' },
    { class: 'fas fa-shopping-cart', label: 'Ventas' },
    { class: 'fas fa-boxes', label: 'Inventario' },
    { class: 'fas fa-chart-bar', label: 'Reportes' },
    { class: 'fas fa-cog', label: 'Configuración' },
    { class: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { class: 'fas fa-box', label: 'Productos' },
    { class: 'fas fa-user-friends', label: 'Clientes' },
    { class: 'fas fa-file-invoice', label: 'Órdenes' },
    { class: 'fas fa-credit-card', label: 'Pagos' },
    { class: 'fas fa-truck', label: 'Envíos' },
    { class: 'fas fa-chart-line', label: 'Analíticas' },
    { class: 'fas fa-shield-alt', label: 'Seguridad' },
    { class: 'fas fa-bell', label: 'Notificaciones' },
    { class: 'fas fa-envelope', label: 'Mensajes' }
  ];

  constructor(
    private modulesApi: PermissionModulesApiService,
    private permsApi: PermissionsApiService,
    private rolesApi: RolesApiService,
    private usersApi: UsersApiService,
    private userPermsApi: UserPermsApiService,
    private docTypesApi: DocumentTypesApiService,
  ) { }

  // ===================== INIT =====================
  async ngOnInit(): Promise<void> {
    await this.reloadAll();
  }

  private async reloadAll() {
    const [modules, perms, roles, users, docTypes] = await lastValueFrom(
      forkJoin([
        this.modulesApi.findAll(),
        this.permsApi.findAll(),
        this.rolesApi.findAll(),
        this.usersApi.findAll(),
        this.docTypesApi.findAll({ page: 1, limit: 1000 }) // ya tienes este service
      ])
    );

    // catálogos
    this.documentTypes = (docTypes?.data ?? docTypes as any) || []; // soporta tu paginación
    // módulos
    this.modulesById.clear();
    modules.forEach(m => this.modulesById.set(m.id, m));
    this.permissionModules = modules.map(mapModuleApiToUI);

    // permisos
    this.permissionsById.clear();
    perms.forEach(p => this.permissionsById.set(p.id, p));
    this.permissions = perms.map(mapPermApiToUI);

    // roles
    this.rolesById.clear();
    roles.forEach(r => this.rolesById.set(r.id, r));
    this.roles = roles.map(mapRoleApiToUI);

    // usuarios
    this.users = users.map(mapUserApiToUI);

    // permisos excepcionales (listado global: los traigo por usuario para cumplir con tu grilla)
    await this.reloadExceptionalAll();
  }

  private async reloadExceptionalAll() {
    const all: ExceptionalPermission[] = [];
    for (const u of this.users) {
      const list = await lastValueFrom(this.userPermsApi.listForUser(u.id));
      list.forEach(ep => {
        all.push({
          id: ep.id,
          userId: typeof ep.user === 'number' ? ep.user : (ep.user as any)?.id ?? u.id,
          permissionId: ep.permission.id,
          effect: ep.effect,
          scope: scopeToString(ep.scope),
          expiresAt: ep.expiresAt ? new Date(ep.expiresAt) : undefined,
        });
      });
    }
    this.exceptionalPermissions = all;
  }

  // ===================== GETTERS (igual que tenías) =====================
  get filteredPermissions(): Permission[] {
    const s = this.searchPermission.toLowerCase();
    return this.permissions.filter(p =>
      p.codigo.toLowerCase().includes(s) || p.descripcion.toLowerCase().includes(s)
    );
  }

  get filteredRoles(): Role[] {
    const s = this.searchRole.toLowerCase();
    return this.roles.filter(r => r.nombre.toLowerCase().includes(s));
  }

  get filteredUsers(): User[] {
    let filtered = this.users;
    if (this.userStatusFilter !== 'all') {
      filtered = filtered.filter(u => {
        if (this.userStatusFilter === 'active') return u.isActive && !u.deleted;
        if (this.userStatusFilter === 'inactive') return !u.isActive && !u.deleted;
        if (this.userStatusFilter === 'deleted') return u.deleted;
        return true;
      });
    }
    const s = this.searchUser.toLowerCase();
    return filtered.filter(u =>
      u.nombre.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
    );
  }

  get filteredModules(): PermissionModule[] {
    const s = this.searchModule.toLowerCase();
    return this.permissionModules.filter(m =>
      m.key.toLowerCase().includes(s) || m.label.toLowerCase().includes(s)
    );
  }

  get filteredExceptionalPermissions(): ExceptionalPermission[] {
    return this.exceptionalPermissions;
  }

  // helpers UI
  getModuleIcon(moduleId: number): string {
    const m = this.permissionModules.find(x => x.id === moduleId);
    return m?.icon || 'fas fa-cube';
  }
  getModuleLabel(moduleId: number): string {
    const m = this.permissionModules.find(x => x.id === moduleId);
    return m?.label || 'Desconocido';
  }
  getUserName(userId: number): string {
    const u = this.users.find(x => x.id === userId);
    return u?.nombre || 'Usuario desconocido';
  }
  getPermissionCode(permissionId: number): string {
    const p = this.permissions.find(x => x.id === permissionId);
    return p?.codigo || 'Desconocido';
  }
  getRoleName(roleId: number): string {
    const r = this.roles.find(x => x.id === roleId);
    return r?.nombre || 'Rol desconocido';
  }
  getPermissionsByModule(moduleId: number): Permission[] {
    return this.permissions.filter(p => p.module_id === moduleId);
  }
  getModulePermissionsCount(moduleId: number): number {
    return this.getPermissionsByModule(moduleId).length;
  }
  isModuleFullyChecked(moduleId: number): boolean {
    const all = this.getPermissionsByModule(moduleId);
    return all.length > 0 && all.every(p => this.tempRolePermissions.includes(p.id));
  }
  isModulePartiallyChecked(moduleId: number): boolean {
    const all = this.getPermissionsByModule(moduleId);
    const n = all.filter(p => this.tempRolePermissions.includes(p.id)).length;
    return n > 0 && n < all.length;
  }

  // ===================== PERMISSIONS =====================
  openPermissionModal(permission?: Permission): void {
    if (permission) {
      this.editingPermission = true;
      this.permissionForm = { ...permission };
    } else {
      this.editingPermission = false;
      this.permissionForm = { module_id: null };
    }
    this.showPermissionModal = true;
  }
  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.permissionForm = {};
    this.editingPermission = false;
  }

  private splitCode(code?: string): { moduleKey?: string; actionKey?: string } {
    if (!code || !code.includes('.')) return {};
    const [mk, ak] = code.split('.');
    return { moduleKey: mk?.trim(), actionKey: ak?.trim() };
  }

  async savePermission(): Promise<void> {
    // Tomar moduleKey desde el módulo elegido (ID numérico)
    const moduleId = this.permissionForm.module_id != null
      ? Number(this.permissionForm.module_id)
      : undefined;

    const moduleKey = moduleId
      ? this.modulesById.get(moduleId)?.moduleKey
      : undefined;

    const actionKey = (this.permissionForm.actionkey || '').trim();
    const description = (this.permissionForm.descripcion || '').trim();

    if (!moduleKey || !actionKey || !description) {
      alert('Completa Módulo, Clave de Acción y Descripción.');
      return;
    }

    if (this.editingPermission && this.permissionForm.id) {
      const dto: PermissionUpdateRequest = {
        moduleKey,
        actionKey,
        description
      };
      const updated = await lastValueFrom(this.permsApi.update(this.permissionForm.id, dto));
      // refrescar caches/UI
      this.permissionsById.set(updated.id, updated);
      const idx = this.permissions.findIndex(p => p.id === updated.id);
      if (idx > -1) this.permissions[idx] = mapPermApiToUI(updated);
    } else {
      const dto: PermissionCreateRequest = {
        moduleKey,
        actionKey,
        description
      };
      const created = await lastValueFrom(this.permsApi.create(dto));
      this.permissionsById.set(created.id, created);
      this.permissions.push(mapPermApiToUI(created));
    }

    this.closePermissionModal();
  }

  editPermission(p: Permission): void { this.openPermissionModal(p); }

  deletePermission(id: number): void {
    this.deleteConfirmationMessage = '¿Está seguro de eliminar este permiso?';
    this.deleteConfirmationCallback = async () => {
      await lastValueFrom(this.permsApi.remove(id));
      this.permissions = this.permissions.filter(p => p.id !== id);
      this.permissionsById.delete(id);
      // limpiar de roles locales
      this.roles.forEach(r => r.permissions = r.permissions.filter(pid => pid !== id));
    };
    this.showDeleteConfirmation = true;
  }

  togglePermissionSelection(id: number) {
    const i = this.selectedPermissions.indexOf(id);
    if (i > -1) this.selectedPermissions.splice(i, 1);
    else this.selectedPermissions.push(id);
  }
  toggleAllPermissions(e: any) {
    this.selectedPermissions = e.target.checked ? this.filteredPermissions.map(p => p.id) : [];
  }
  deleteSelectedPermissions() {
    this.deleteConfirmationMessage = `¿Está seguro de eliminar ${this.selectedPermissions.length} permiso(s)?`;
    this.deleteConfirmationCallback = async () => {
      for (const id of this.selectedPermissions) {
        try { await lastValueFrom(this.permsApi.remove(id)); } catch { /* ignore */ }
      }
      this.permissions = this.permissions.filter(p => !this.selectedPermissions.includes(p.id));
      this.selectedPermissions = [];
    };
    this.showDeleteConfirmation = true;
  }

  // ===================== ROLES =====================
  openRoleModal(role?: Role): void {
    if (role) {
      this.editingRole = true;
      this.roleForm = { ...role, permissions: [...(role.permissions || [])] };
    } else {
      this.editingRole = false;
      this.roleForm = { permissions: [] };
    }
    this.showRoleModal = true;
  }
  closeRoleModal(): void {
    this.showRoleModal = false;
    this.roleForm = { permissions: [] };
    this.editingRole = false;
  }
  async saveRole(): Promise<void> {
    if (!this.roleForm.nombre) { alert('Nombre requerido'); return; }
    if (this.editingRole && this.roleForm.id) {
      const updated = await lastValueFrom(
        this.rolesApi.update(this.roleForm.id, {
          name: this.roleForm.nombre,
          permissionIds: this.roleForm.permissions
        })
      );
      const idx = this.roles.findIndex(r => r.id === updated.id);
      if (idx > -1) this.roles[idx] = mapRoleApiToUI(updated);
    } else {
      const created = await lastValueFrom(
        this.rolesApi.create({ name: this.roleForm.nombre!, permissionIds: this.roleForm.permissions })
      );
      this.roles.push(mapRoleApiToUI(created));
    }
    this.closeRoleModal();
  }
  editRole(role: Role): void { this.openRoleModal(role); }
  deleteRole(id: number): void {
    this.deleteConfirmationMessage = '¿Está seguro de eliminar este rol?';
    this.deleteConfirmationCallback = async () => {
      await lastValueFrom(this.rolesApi.remove(id));
      this.roles = this.roles.filter(r => r.id !== id);
    };
    this.showDeleteConfirmation = true;
  }
  toggleRoleSelection(id: number) {
    const i = this.selectedRoles.indexOf(id);
    if (i > -1) this.selectedRoles.splice(i, 1);
    else this.selectedRoles.push(id);
  }
  toggleAllRoles(e: any) {
    this.selectedRoles = e.target.checked ? this.filteredRoles.map(r => r.id) : [];
  }
  deleteSelectedRoles() {
    this.deleteConfirmationMessage = `¿Está seguro de eliminar ${this.selectedRoles.length} rol(es)?`;
    this.deleteConfirmationCallback = async () => {
      for (const id of this.selectedRoles) {
        try { await lastValueFrom(this.rolesApi.remove(id)); } catch { /* ignore */ }
      }
      this.roles = this.roles.filter(r => !this.selectedRoles.includes(r.id));
      this.selectedRoles = [];
    };
    this.showDeleteConfirmation = true;
  }

  // Árbol de permisos por rol
  openRolePermissionsTreeModal(role: Role): void {
    this.selectedRoleForPermissions = role;
    this.tempRolePermissions = [...role.permissions];
    this.showRolePermissionsTreeModal = true;
  }
  closeRolePermissionsTreeModal(): void {
    this.showRolePermissionsTreeModal = false;
    this.selectedRoleForPermissions = null;
    this.tempRolePermissions = [];
  }
  toggleModulePermissions(moduleId: number, e: any): void {
    const modulePerms = this.getPermissionsByModule(moduleId);
    if (e.target.checked) {
      modulePerms.forEach(p => { if (!this.tempRolePermissions.includes(p.id)) this.tempRolePermissions.push(p.id); });
    } else {
      this.tempRolePermissions = this.tempRolePermissions.filter(id => !modulePerms.some(p => p.id === id));
    }
  }
  togglePermissionInRole(permissionId: number) {
    const i = this.tempRolePermissions.indexOf(permissionId);
    if (i > -1) this.tempRolePermissions.splice(i, 1);
    else this.tempRolePermissions.push(permissionId);
  }
  async saveRolePermissions(): Promise<void> {
    if (!this.selectedRoleForPermissions) return;
    // traducir ids -> códigos
    const codes = this.tempRolePermissions
      .map(id => this.permissionsById.get(id)?.code)
      .filter((c): c is string => !!c);
    const updated = await lastValueFrom(
      this.rolesApi.assignPermissionsByCode(this.selectedRoleForPermissions.id, codes)
    );
    // reflejar en UI
    const idx = this.roles.findIndex(r => r.id === updated.id);
    if (idx > -1) this.roles[idx] = mapRoleApiToUI(updated);
    this.closeRolePermissionsTreeModal();
  }

  // ===================== USERS =====================
  openUserModal(user?: User): void {
    if (user) {
      this.editingUser = true;
      this.userForm = { ...user, roles: [...(user.roles || [])] };
    } else {
      this.editingUser = false;
      this.userForm = { roles: [], isActive: true };
    }
    this.showUserModal = true;
  }
  closeUserModal(): void {
    this.showUserModal = false;
    this.userForm = { roles: [], isActive: true };
    this.editingUser = false;
  }

  private findDocTypeIdByName(name: string | undefined): number | undefined {
    if (!name) return undefined;
    const dt = this.documentTypes.find(
      d => (d.name || (d as any).code)?.toLowerCase() === name.toLowerCase()
    );
    return dt ? Number((dt as any).id) : undefined;  // 👈 fuerza a number
  }


  async saveUser(): Promise<void> {
    // password = nroDocumento (como tu UI indica)
    if (this.editingUser && this.userForm.id) {
      const dto: UserUpdateRequest = {
        name: this.userForm.nombre,
        email: this.userForm.email,
        phone: this.userForm.celular ?? null,
        documentTypeId: Number(this.findDocTypeIdByName(this.userForm.tipoDocumento)), // 👈
        documentNumber: this.userForm.nroDocumento,
        roleIds: (this.userForm.roles || []).map(Number), // 👈 por si vienen como "1"
        isActive: this.userForm.isActive,
      };
      const updated = await lastValueFrom(this.usersApi.update(this.userForm.id, dto));
      const idx = this.users.findIndex(u => u.id === updated.id);
      if (idx > -1) this.users[idx] = mapUserApiToUI(updated);
    } else {
      const docTypeId = Number(this.findDocTypeIdByName(this.userForm.tipoDocumento)); // 👈
      if (!docTypeId) { alert('Tipo de documento no válido'); return; }
      const dto: UserCreateRequest = {
        name: this.userForm.nombre!,
        email: this.userForm.email!,
        phone: this.userForm.celular ?? null,
        documentTypeId: docTypeId,              // 👈 ya numérico
        documentNumber: this.userForm.nroDocumento!,
        password: this.userForm.nroDocumento!,  // como definiste
        roleIds: (this.userForm.roles || []).map(Number), // 👈
      };
      const created = await lastValueFrom(this.usersApi.create(dto));
      this.users.push(mapUserApiToUI(created));
    }
    this.closeUserModal();
  }

  editUser(user: User): void { this.openUserModal(user); }

  deleteUser(id: number, permanent: boolean): void {
    if (permanent) {
      this.deleteConfirmationMessage = '¿Está seguro de eliminar permanentemente este usuario? Esta acción no se puede deshacer.';
      this.deleteConfirmationCallback = async () => {
        await lastValueFrom(this.usersApi.hardDeleteOne(id));
        this.users = this.users.filter(u => u.id !== id);
      };
    } else {
      this.deleteConfirmationMessage = '¿Está seguro de eliminar lógicamente este usuario?';
      this.deleteConfirmationCallback = async () => {
        await lastValueFrom(this.usersApi.softDeleteOne(id));
        const u = this.users.find(x => x.id === id);
        if (u) { u.deleted = true; u.isActive = false; }
      };
    }
    this.showDeleteConfirmation = true;
  }
  async restoreUser(id: number) {
    await lastValueFrom(this.usersApi.restoreOne(id));
    const u = this.users.find(x => x.id === id);
    if (u) { u.deleted = false; u.isActive = true; }
  }
  toggleUserSelection(id: number) {
    const i = this.selectedUsers.indexOf(id);
    if (i > -1) this.selectedUsers.splice(i, 1);
    else this.selectedUsers.push(id);
  }
  toggleAllUsers(e: any) {
    this.selectedUsers = e.target.checked ? this.filteredUsers.map(u => u.id) : [];
  }
  deleteSelectedUsers() {
    this.deleteConfirmationMessage = `¿Está seguro de eliminar ${this.selectedUsers.length} usuario(s)?`;
    this.deleteConfirmationCallback = async () => {
      await lastValueFrom(this.usersApi.softDeleteMany(this.selectedUsers));
      this.users = this.users.map(u =>
        this.selectedUsers.includes(u.id) ? { ...u, deleted: true, isActive: false } : u
      );
      this.selectedUsers = [];
    };
    this.showDeleteConfirmation = true;
  }
  toggleRoleInUser(roleId: number) {
    const i = this.userForm.roles!.indexOf(roleId);
    if (i > -1) this.userForm.roles!.splice(i, 1);
    else this.userForm.roles!.push(roleId);
  }

  // ===================== EXCEPTIONAL PERMISSIONS =====================
  openExceptionalPermissionModal(ep?: ExceptionalPermission): void {
    if (ep) {
      this.editingExceptionalPermission = true;
      this.exceptionalPermissionForm = { ...ep };
    } else {
      this.editingExceptionalPermission = false;
      this.exceptionalPermissionForm = { effect: 'allow' };
    }
    this.showExceptionalPermissionModal = true;
  }
  closeExceptionalPermissionModal(): void {
    this.showExceptionalPermissionModal = false;
    this.exceptionalPermissionForm = { effect: 'allow' };
    this.editingExceptionalPermission = false;
  }
  async saveExceptionalPermission(): Promise<void> {
    const f = this.exceptionalPermissionForm;
    if (!f?.userId || !f?.permissionId || !f?.effect) { alert('Completa Usuario, Permiso y Efecto.'); return; }
    const permCode = this.permissionsById.get(f.permissionId)?.code;
    if (!permCode) { alert('Permiso inválido'); return; }
    const payload = {
      permCode,
      expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : undefined,
      scope: parseScope(f.scope),
    };
    if (this.editingExceptionalPermission) {
      // No hay update en API: limpiar y volver a crear
      await lastValueFrom(this.userPermsApi.clear(f.userId, permCode));
    }
    const saved = await lastValueFrom(
      f.effect === 'allow' ? this.userPermsApi.allow(f.userId, payload) : this.userPermsApi.deny(f.userId, payload)
    );
    // refrescar listado global
    await this.reloadExceptionalAll();
    this.closeExceptionalPermissionModal();
  }
  editExceptionalPermission(ep: ExceptionalPermission) { this.openExceptionalPermissionModal(ep); }
  deleteExceptionalPermission(id: number): void {
    const ep = this.exceptionalPermissions.find(x => x.id === id);
    if (!ep) return;
    const permCode = this.permissionsById.get(ep.permissionId)?.code!;
    this.deleteConfirmationMessage = '¿Está seguro de eliminar este permiso excepcional?';
    this.deleteConfirmationCallback = async () => {
      await lastValueFrom(this.userPermsApi.clear(ep.userId, permCode));
      this.exceptionalPermissions = this.exceptionalPermissions.filter(x => x.id !== id);
    };
    this.showDeleteConfirmation = true;
  }

  // ===================== MODULES =====================
  openModuleModal(module?: PermissionModule): void {
    if (module) { this.editingModule = true; this.moduleForm = { ...module }; }
    else { this.editingModule = false; this.moduleForm = { sortOrder: 0 }; }
    this.showModuleModal = true;
  }
  closeModuleModal(): void {
    this.showModuleModal = false;
    this.moduleForm = { sortOrder: 0 };
    this.editingModule = false;
  }
  async saveModule(): Promise<void> {
    const f = this.moduleForm;
    if (!f?.key || !f?.label) { alert('Clave y Etiqueta son requeridos'); return; }

    const payload = { moduleKey: f.key.trim().toLowerCase(), label: f.label, icon: f.icon ?? null, sortOrder: f.sortOrder ?? 0 };

    if (this.editingModule && f.id) {
      const updated = await lastValueFrom(this.modulesApi.update(f.id, payload));
      const idx = this.permissionModules.findIndex(m => m.id === updated.id);
      if (idx > -1) this.permissionModules[idx] = mapModuleApiToUI(updated);
      this.modulesById.set(updated.id, updated);
    } else {
      const created = await lastValueFrom(this.modulesApi.create(payload));
      this.permissionModules.push(mapModuleApiToUI(created));
      this.modulesById.set(created.id, created);
    }
    this.closeModuleModal();
  }
  editModule(module: PermissionModule) { this.openModuleModal(module); }
  deleteModule(id: number): void {
    this.deleteConfirmationMessage = '¿Está seguro de eliminar este módulo?';
    this.deleteConfirmationCallback = async () => {
      await lastValueFrom(this.modulesApi.remove(id));
      this.permissionModules = this.permissionModules.filter(m => m.id !== id);
      this.modulesById.delete(id);
      // además limpiar permisos que lo usaban (en UI)
      this.permissions = this.permissions.filter(p => p.module_id !== id);
    };
    this.showDeleteConfirmation = true;
  }
  toggleModuleSelection(id: number) {
    const i = this.selectedModules.indexOf(id);
    if (i > -1) this.selectedModules.splice(i, 1);
    else this.selectedModules.push(id);
  }
  toggleAllModules(e: any) {
    this.selectedModules = e.target.checked ? this.filteredModules.map(m => m.id) : [];
  }
  deleteSelectedModules() {
    this.deleteConfirmationMessage = `¿Está seguro de eliminar ${this.selectedModules.length} módulo(s)?`;
    this.deleteConfirmationCallback = async () => {
      for (const id of this.selectedModules) {
        try { await lastValueFrom(this.modulesApi.remove(id)); } catch { /* ignore */ }
      }
      this.permissionModules = this.permissionModules.filter(m => !this.selectedModules.includes(m.id));
      this.selectedModules = [];
    };
    this.showDeleteConfirmation = true;
  }

  // ===================== CONFIRM =====================
  closeDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.deleteConfirmationMessage = '';
    this.deleteConfirmationCallback = null;
  }
  async confirmDelete(): Promise<void> {
    if (this.deleteConfirmationCallback) await this.deleteConfirmationCallback();
    this.closeDeleteConfirmation();
  }
}
