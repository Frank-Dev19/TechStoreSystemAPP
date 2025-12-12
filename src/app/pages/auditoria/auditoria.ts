import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuditLog, } from '../../models/audit/audit-log.model';
import { AuditAction, AuditEntity, AuditMethod, } from '../../models/audit/audit.types';
import { AuditSearchFilters, } from '../../models/audit/audit-search.model';
import { AuditService } from '../../services/audit/audit.service';

import { UserApi } from '../../models/rbac/user.model';
import { UsersApiService } from '../../services/rbac/users-api.service';

interface UiAuditFilters {
  from: string;
  to: string;
  userId: number | null;
  action: AuditAction | null;
  entity: AuditEntity | null;
  status: number | null;
  method: AuditMethod | null;
  searchText: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: UiAuditFilters;
  createdAt: string;
}

interface Toast {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface DateRange {
  label: string;
  getValue: () => { from: string; to: string };
}

interface Metrics {
  total: number;
  success2xx: number;
  client4xx: number;
  server5xx: number;
}


@Component({
  selector: "app-auditoria",
  standalone: false,
  templateUrl: "./auditoria.html",
  styleUrls: ["./auditoria.scss"],
})

export class Auditoria implements OnInit {
  JSON = JSON;

  // ============================================
  // STATE
  // ============================================

  auditLogs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  selectedLog: AuditLog | null = null;

  isLiveMode = false;
  isLoading = false;
  toasts: Toast[] = [];

  currentPage = 1;
  pageSize = 20;
  totalItems = 0;

  filters: UiAuditFilters = {
    from: '',
    to: '',
    userId: null,
    action: null,
    entity: null,
    status: null,
    method: null,
    searchText: '',
  };

  savedFilters: SavedFilter[] = [];
  showSaveFilterModal = false;
  filterNameToSave = '';

  dateRanges: DateRange[] = [
    {
      label: 'Hoy',
      getValue: () => ({
        from: this.getToday(),
        to: this.getToday(),
      }),
    },
    {
      label: 'Últimas 24h',
      getValue: () => ({
        from: this.getDateNDaysAgo(1),
        to: this.getToday(),
      }),
    },
    {
      label: 'Últimos 7 días',
      getValue: () => ({
        from: this.getDateNDaysAgo(7),
        to: this.getToday(),
      }),
    },
    {
      label: 'Últimos 30 días',
      getValue: () => ({
        from: this.getDateNDaysAgo(30),
        to: this.getToday(),
      }),
    },
  ];

  metrics: Metrics = {
    total: 0,
    success2xx: 0,
    client4xx: 0,
    server5xx: 0,
  };

  private liveSub?: Subscription;

  //Users
  users: UserApi[] = [];


  constructor(
    private auditService: AuditService,
    private usersApi: UsersApiService,
  ) { }

  ngOnInit(): void {
    this.loadSavedFilters();
    this.filters.from = '2025-11-10';   // cámbialo si luego quieres otra fecha base
    this.filters.to = this.getToday();
    this.loadUsers();
    this.loadAuditLogs();
  }

  //Metodo para cargar lista de usuarios
  private loadUsers() {
    this.usersApi.findAll().subscribe({
      next: res => {
        // solo usuarios activos (evitamos mostrar eliminados)
        this.users = res.filter(u => u.isActive);
      },
      error: err => {
        console.error('Error cargando usuarios', err);
      }
    });
  }

  // ============================================
  // Helpers para filtros backend
  // ============================================

  private buildBackendFilters(): AuditSearchFilters {
    const { from, to, userId, action, entity, status, method, searchText } =
      this.filters;

    const backendFilters: AuditSearchFilters = {
      from,
      to,
      page: this.currentPage,
      pageSize: this.pageSize,
      sort: 'ts:desc',
    };

    if (userId != null) backendFilters.userId = userId;
    if (action) backendFilters.action = action;
    if (entity) backendFilters.entity = entity;
    if (status != null) backendFilters.status = status;
    if (method) backendFilters.method = method;
    if (searchText && searchText.trim() !== '') {
      backendFilters.q = searchText.trim();
    }

    return backendFilters;
  }

  // ============================================
  // LOAD & SEARCH
  // ============================================

  loadAuditLogs(): void {
    this.isLoading = true;
    const backendFilters = this.buildBackendFilters();

    this.auditService.search(backendFilters).subscribe({
      next: (res) => {
        this.auditLogs = res.items;
        this.filteredLogs = res.items;
        this.totalItems = res.total;
        this.currentPage = res.page;
        this.pageSize = res.pageSize;
        this.calculateMetrics();
        this.isLoading = false;
        this.showToast('success', 'Logs cargados');
      },
      error: (err) => {
        console.error('Error cargando logs de auditoría', err);
        this.isLoading = false;
        this.showToast('error', 'Error al cargar logs de auditoría');
      },
    });
  }

  refreshSearch(): void {
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  // ============================================
  // QUICK DATE RANGES
  // ============================================

  applyQuickDateRange(range: DateRange): void {
    const dates = range.getValue();
    this.filters.from = dates.from;
    this.filters.to = dates.to;
    this.refreshSearch();
  }

  // ============================================
  // FILTERS
  // ============================================

  resetFilters(): void {
    this.filters = {
      from: this.getToday(),
      to: this.getToday(),
      userId: null,
      action: null,
      entity: null,
      status: null,
      method: null,
      searchText: '',
    };
    this.currentPage = 1;
    this.refreshSearch();
    this.showToast('info', 'Filtros limpiados');
  }

  // ============================================
  // SAVED FILTERS
  // ============================================

  saveCurrentFilters(): void {
    this.showSaveFilterModal = true;
  }

  confirmSaveFilters(): void {
    if (!this.filterNameToSave.trim()) {
      this.showToast('error', 'Ingrese un nombre para el filtro');
      return;
    }

    const newFilter: SavedFilter = {
      id: `FILTER-${Math.random().toString(36).substring(7)}`,
      name: this.filterNameToSave,
      filters: { ...this.filters },
      createdAt: new Date().toISOString(),
    };

    this.savedFilters.push(newFilter);
    localStorage.setItem(
      'auditSavedFilters',
      JSON.stringify(this.savedFilters),
    );
    this.showSaveFilterModal = false;
    this.filterNameToSave = '';
    this.showToast('success', `Filtro "${newFilter.name}" guardado`);
  }

  applySavedFilter(savedFilter: SavedFilter): void {
    this.filters = { ...savedFilter.filters };
    this.currentPage = 1;
    this.refreshSearch();
    this.showToast('info', `Filtro "${savedFilter.name}" aplicado`);
  }

  deleteSavedFilter(id: string): void {
    if (confirm('¿Eliminar este filtro guardado?')) {
      this.savedFilters = this.savedFilters.filter((f) => f.id !== id);
      localStorage.setItem(
        'auditSavedFilters',
        JSON.stringify(this.savedFilters),
      );
      this.showToast('success', 'Filtro eliminado');
    }
  }

  private loadSavedFilters(): void {
    const stored = localStorage.getItem('auditSavedFilters');
    if (stored) {
      try {
        this.savedFilters = JSON.parse(stored);
      } catch {
        this.savedFilters = [];
      }
    }
  }

  // ============================================
  // LIVE MODE (SSE)
  // ============================================

  toggleLiveMode(): void {
    this.isLiveMode = !this.isLiveMode;

    if (this.isLiveMode) {
      this.showToast('info', 'Modo en vivo activado');

      const backendFilters = this.buildBackendFilters();
      // para live, no nos importa la página: backend stream siempre usa page=1
      backendFilters.page = undefined;
      backendFilters.pageSize = undefined;

      this.liveSub = this.auditService.stream(backendFilters as AuditSearchFilters).subscribe({
        next: (log) => {
          // evitar duplicar si ya es el primero
          if (this.auditLogs.length > 0 && this.auditLogs[0].id === log.id) {
            return;
          }
          this.auditLogs = [log, ...this.auditLogs];
          this.filteredLogs = this.auditLogs.slice(0, this.pageSize);
          this.totalItems += 1;
          this.calculateMetrics();
        },
        error: (err) => {
          console.error('Error en stream de auditoría', err);
          this.showToast('error', 'Error en modo en vivo');
        },
      });
    } else {
      this.showToast('info', 'Modo en vivo desactivado');
      if (this.liveSub) {
        this.liveSub.unsubscribe();
        this.liveSub = undefined;
      }
    }
  }

  // ============================================
  // DETAIL DRAWER
  // ============================================

  selectLog(log: AuditLog): void {
    this.selectedLog = log;
  }

  closeDetailDrawer(): void {
    this.selectedLog = null;
  }

  getRelatedLogs(): AuditLog[] {
    if (!this.selectedLog?.requestId) return [];
    return this.auditLogs.filter(
      (log) => log.requestId === this.selectedLog!.requestId,
    );
  }

  // ============================================
  // PAGINATION
  // ============================================

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadAuditLogs();
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  // ============================================
  // EXPORT
  // ============================================

  exportCsv(): void {
    if (this.auditLogs.length > 10000) {
      if (!confirm('Se exportarán más de 10k filas. ¿Continuar?')) return;
    }

    let csv =
      'Fecha, Usuario Id, Actor, Email, Descripcion, Accion, Entidad, Entidad ID, Metodo,Path, Status, DuracionMs,IP, requestId\n';

    this.auditLogs.forEach((log) => {
      const line = [
        `"${log.createdAt}"`,
        log.userId ?? '',
        log.actorName ?? '',
        log.actorEmail ?? '',
        log.reason ?? '',
        `"${log.action}"`,
        `"${log.entity}"`,
        `"${log.entityId ?? ''}"`,
        `"${log.method ?? ''}"`,
        `"${log.path ?? ''}"`,
        log.status ?? '',
        log.durationMs ?? '',
        `"${log.ip ?? ''}"`,
        `"${log.requestId ?? ''}"`,
      ].join(',');

      csv += line + '\n';
    });

    this.downloadFile(
      csv,
      `auditoria-${this.getToday()}.csv`,
      'text/csv',
    );
    this.showToast('success', 'CSV exportado');
  }

  // ============================================
  // CLIPBOARD
  // ============================================

  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('success', 'Copiado al portapapeles');
    });
  }

  // ============================================
  // METRICS
  // ============================================

  private calculateMetrics(): void {
    this.metrics = {
      total: this.auditLogs.length,
      success2xx: this.auditLogs.filter(
        (l) => typeof l.status === 'number' && l.status >= 200 && l.status < 300,
      ).length,
      client4xx: this.auditLogs.filter(
        (l) => typeof l.status === 'number' && l.status >= 400 && l.status < 500,
      ).length,
      server5xx: this.auditLogs.filter(
        (l) => typeof l.status === 'number' && l.status >= 500,
      ).length,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  getActionLabel(action: AuditAction): string {
    const labels: { [key in AuditAction]: string } = {
      HTTP: 'HTTP',
      LOGIN_SUCCESS: 'Login Exitoso',
      LOGIN_FAILURE: 'Login Fallido',
      LOGOUT: 'Logout',
      ENTITY_CREATE: 'Crear Entidad',
      ENTITY_UPDATE: 'Actualizar Entidad',
      ENTITY_DELETE: 'Eliminar Entidad',
      BUSINESS: 'Negocio',
    };
    return labels[action] || action;
  }

  getStatusClass(status: number | null): string {
    if (typeof status !== 'number') return 'info';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'client-error';
    if (status >= 500) return 'server-error';
    return 'info';
  }

  getStatusLabel(status: number | null): string {
    if (status == null) return '-';
    const labels: { [key: number]: string } = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return labels[status] || `${status}`;
  }

  getToastIcon(type: string): string {
    const icons: { [key: string]: string } = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
    };
    return icons[type] || 'fas fa-info-circle';
  }

  // ============================================
  // DATE HELPERS
  // ============================================
  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD en horario local
  }

  getToday(): string {
    return this.formatDateLocal(new Date());
  }

  getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.formatDateLocal(date);
  }

  // ============================================
  // TOASTS
  // ============================================

  showToast(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
  ): void {
    const toast: Toast = { type, message };
    this.toasts.push(toast);
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t !== toast);
    }, 3000);
  }

  // ============================================
  // UTILITY
  // ============================================

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  closeSaveFilterModal(): void {
    this.showSaveFilterModal = false;
    this.filterNameToSave = '';
  }
}