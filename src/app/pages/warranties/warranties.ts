import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { EquipmentType, ServiceOrderPriority } from '../../models/service-orders/service-order';
import {
  WarrantyClaim,
  WarrantyCoverage,
  WarrantyCoverageGroup,
  WarrantyCoverageItemGroup,
  WarrantyCoverageStatus,
  WarrantyIntakeRequest,
  WarrantySourceType,
  WarrantyTechnicianReportRow,
} from '../../models/warranties/warranty.model';
import { CurrentUserService } from '../../services/current-user.service';
import { UsersApiService } from '../../services/rbac/users-api.service';
import { WarrantiesApiService } from '../../services/warranties-api.service';
import { UserApi } from '../../models/rbac/user.model';
import { hasAdminRole, TECHNICIAN_ROLE_NAMES, hasAnyRole } from '../../utils/role.utils';

type WarrantyTab = 'coverages' | 'claims' | 'report';
type ToastType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-warranties',
  standalone: false,
  templateUrl: './warranties.html',
  styleUrl: './warranties.scss',
})
export class WarrantiesPage implements OnInit {
  readonly equipmentTypes = Object.values(EquipmentType);
  readonly sourceTypes: Array<{ value: WarrantySourceType | ''; label: string }> = [
    { value: '', label: 'Todos los orígenes' },
    { value: 'PRODUCT', label: 'Productos' },
    { value: 'SERVICE', label: 'Servicios técnicos' },
  ];
  readonly coverageStatuses: Array<{ value: WarrantyCoverageStatus | ''; label: string }> = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVE', label: 'Vigente' },
    { value: 'RESERVED', label: 'En atención' },
    { value: 'CONSUMED', label: 'Consumida' },
    { value: 'EXPIRED', label: 'Vencida' },
    { value: 'REVOKED', label: 'Revocada' },
  ];
  readonly claimStatuses: Array<{ value: WarrantyClaim['status'] | ''; label: string }> = [
    { value: '', label: 'Todos los estados' },
    { value: 'RECEIVED', label: 'Recibida' },
    { value: 'IN_REVIEW', label: 'En revisión' },
    { value: 'RESOLVED_APPLIES', label: 'Garantía aplicada' },
    { value: 'RESOLVED_REJECTED', label: 'Garantía rechazada' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];
  readonly claimOutcomes = [
    { value: '', label: 'Todos los resultados' },
    { value: 'WARRANTY_APPLIES', label: 'Aplica garantía' },
    { value: 'WARRANTY_REJECTED', label: 'Garantía rechazada' },
  ];

  activeTab: WarrantyTab = 'coverages';
  coverageGroups: WarrantyCoverageGroup[] = [];
  claims: WarrantyClaim[] = [];
  reportRows: WarrantyTechnicianReportRow[] = [];
  technicians: UserApi[] = [];
  coverageTotal = 0;
  coverageGroupTotal = 0;
  claimTotal = 0;
  page = 1;
  claimPage = 1;
  readonly coverageLimit = 10;
  readonly claimLimit = 15;
  search = '';
  sourceType: WarrantySourceType | '' = '';
  coverageStatus: WarrantyCoverageStatus | '' = '';
  claimSearch = '';
  claimSourceType: WarrantySourceType | '' = '';
  claimStatus: WarrantyClaim['status'] | '' = '';
  claimOutcome = '';
  dateFrom = '';
  dateTo = '';
  isLoading = false;
  isSubmitting = false;
  isAdmin = false;
  readonly expandedGroups = new Set<string>();
  readonly expandedItems = new Set<string>();

  selectedCoverage: WarrantyCoverage | null = null;
  showIntakeModal = false;
  useTechnicianOverride = false;
  intake: WarrantyIntakeRequest = this.emptyIntake();
  claimToCancel: WarrantyClaim | null = null;
  selectedClaim: WarrantyClaim | null = null;
  cancelReason = '';

  toast = { show: false, type: 'info' as ToastType, message: '' };

  constructor(
    private readonly api: WarrantiesApiService,
    private readonly currentUser: CurrentUserService,
    private readonly usersApi: UsersApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.currentUser.restoreFromStorage();
    this.isAdmin = hasAdminRole(this.currentUser.value?.roles);
    this.search = this.route.snapshot.queryParamMap.get('search') ?? '';
    this.loadCoverages();
    this.loadClaims();
    if (this.isAdmin) this.loadTechnicians();
  }

  selectTab(tab: WarrantyTab): void {
    if (tab === 'report' && !this.canReport) return;
    this.activeTab = tab;
    if (tab === 'report' && !this.reportRows.length) this.loadReport();
  }

  searchCoverages(): void {
    this.page = 1;
    this.loadCoverages();
  }

  clearFilters(): void {
    this.search = '';
    this.sourceType = '';
    this.coverageStatus = '';
    this.page = 1;
    this.loadCoverages();
  }

  loadCoverages(): void {
    this.isLoading = true;
    this.api.findCoverageGroups({
      page: this.page,
      limit: this.coverageLimit,
      search: this.search,
      sourceType: this.sourceType,
      status: this.coverageStatus,
    }).pipe(finalize(() => this.isLoading = false)).subscribe({
      next: (response) => {
        this.coverageGroups = response.data ?? [];
        this.coverageGroupTotal = response.total ?? 0;
        this.coverageTotal = response.coverageTotal ?? 0;
      },
      error: (error) => this.showToast('error', this.errorMessage(error, 'No se pudieron cargar las coberturas')),
    });
  }

  loadClaims(): void {
    this.api.findClaims({
      page: this.claimPage,
      limit: this.claimLimit,
      search: this.claimSearch,
      sourceType: this.claimSourceType,
      status: this.claimStatus,
      outcome: this.claimOutcome,
    }).subscribe({
      next: (response) => {
        this.claims = response.data ?? [];
        this.claimTotal = response.total ?? 0;
      },
      error: (error) => this.showToast('error', this.errorMessage(error, 'No se pudieron cargar las atenciones')),
    });
  }

  searchClaims(): void {
    this.claimPage = 1;
    this.loadClaims();
  }

  clearClaimFilters(): void {
    this.claimSearch = '';
    this.claimSourceType = '';
    this.claimStatus = '';
    this.claimOutcome = '';
    this.claimPage = 1;
    this.loadClaims();
  }

  openClaimDetail(claim: WarrantyClaim): void {
    this.selectedClaim = claim;
  }

  closeClaimDetail(): void {
    this.selectedClaim = null;
  }

  loadReport(): void {
    if (!this.canReport) return;
    this.isLoading = true;
    this.api.getTechnicianReport(this.dateFrom || undefined, this.dateTo || undefined)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => this.reportRows = response.technicians ?? [],
        error: (error) => this.showToast('error', this.errorMessage(error, 'No se pudo cargar el reporte')),
      });
  }

  openIntake(coverage: WarrantyCoverage): void {
    if (!this.isCoverageAvailable(coverage)) return;
    this.selectedCoverage = coverage;
    this.intake = {
      ...this.emptyIntake(),
      coverageId: coverage.id,
      brand: coverage.sourceType === 'PRODUCT' ? coverage.product?.brand ?? '' : '',
      model: coverage.sourceNameSnapshot,
      serialNumber: coverage.serialSnapshot ?? '',
    } as WarrantyIntakeRequest;
    this.useTechnicianOverride = false;
    this.showIntakeModal = true;
  }

  closeIntake(): void {
    this.showIntakeModal = false;
    this.selectedCoverage = null;
    this.intake = this.emptyIntake();
    this.useTechnicianOverride = false;
  }

  submitIntake(): void {
    if (!this.selectedCoverage || !this.intake.reportedIssue.trim()) {
      this.showToast('warning', 'Describe el problema reportado por el cliente');
      return;
    }
    if (this.selectedCoverage.sourceType === 'PRODUCT' && !this.intake.equipmentType) {
      this.showToast('warning', 'Selecciona el tipo de equipo o componente');
      return;
    }
    if (this.intake.equipmentType === EquipmentType.OTHER && !this.intake.equipmentTypeOther?.trim()) {
      this.showToast('warning', 'Especifica el tipo de equipo');
      return;
    }
    if (this.useTechnicianOverride) {
      if (!this.isAdmin || !this.intake.assignedToTechnicianId || !this.intake.technicianOverrideReason?.trim()) {
        this.showToast('warning', 'Selecciona al técnico sustituto e indica el motivo');
        return;
      }
    } else {
      delete this.intake.assignedToTechnicianId;
      delete this.intake.technicianOverrideReason;
    }

    this.isSubmitting = true;
    this.api.createIntake(this.cleanedIntake())
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (order) => {
          this.showToast('success', `Garantía registrada en la orden ${order.code}`);
          this.isSubmitting = false;
          this.closeIntake();
          this.loadCoverages();
          this.loadClaims();
        },
        error: (error) => this.showToast('error', this.errorMessage(error, 'No se pudo registrar la garantía')),
      });
  }

  openCancel(claim: WarrantyClaim): void {
    if (claim.status !== 'RECEIVED') return;
    this.claimToCancel = claim;
    this.cancelReason = '';
  }

  closeCancel(): void {
    this.claimToCancel = null;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.claimToCancel || this.cancelReason.trim().length < 5) {
      this.showToast('warning', 'Indica un motivo de cancelación válido');
      return;
    }
    this.isSubmitting = true;
    this.api.cancelClaim(this.claimToCancel.id, this.cancelReason.trim())
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: () => {
          this.showToast('success', 'Atención cancelada y cobertura liberada');
          this.isSubmitting = false;
          this.closeCancel();
          this.loadClaims();
          this.loadCoverages();
        },
        error: (error) => this.showToast('error', this.errorMessage(error, 'No se pudo cancelar la atención')),
      });
  }

  changeCoveragePage(page: number): void {
    if (page < 1 || page > this.coveragePages) return;
    this.page = page;
    this.loadCoverages();
  }

  changeClaimPage(page: number): void {
    if (page < 1 || page > this.claimPages) return;
    this.claimPage = page;
    this.loadClaims();
  }

  get coveragePages(): number { return Math.max(1, Math.ceil(this.coverageGroupTotal / this.coverageLimit)); }
  get claimPages(): number { return Math.max(1, Math.ceil(this.claimTotal / this.claimLimit)); }
  get canReport(): boolean { return this.currentUser.hasPermission('warranties.report'); }

  toggleGroup(group: WarrantyCoverageGroup): void {
    this.toggleSetValue(this.expandedGroups, group.key);
  }

  toggleItem(group: WarrantyCoverageGroup, item: WarrantyCoverageItemGroup): void {
    this.toggleSetValue(this.expandedItems, `${group.key}:${item.key}`);
  }

  isGroupExpanded(group: WarrantyCoverageGroup): boolean {
    return this.expandedGroups.has(group.key);
  }

  isItemExpanded(group: WarrantyCoverageGroup, item: WarrantyCoverageItemGroup): boolean {
    return this.expandedItems.has(`${group.key}:${item.key}`);
  }

  itemLabel(count: number): string {
    return count === 1 ? 'producto o equipo' : 'productos o equipos';
  }

  isCoverageAvailable(coverage: WarrantyCoverage): boolean {
    return coverage.status === 'ACTIVE' && new Date(coverage.expiresAt).getTime() >= Date.now();
  }

  sourceLabel(source: WarrantySourceType): string {
    return source === 'PRODUCT' ? 'Producto' : 'Servicio técnico';
  }

  coverageStatusLabel(status: WarrantyCoverageStatus): string {
    return ({ ACTIVE: 'Vigente', RESERVED: 'En atención', CONSUMED: 'Consumida', EXPIRED: 'Vencida', REVOKED: 'Revocada' })[status];
  }

  claimStatusLabel(status: WarrantyClaim['status']): string {
    return ({
      RECEIVED: 'Recibida', IN_REVIEW: 'En revisión', RESOLVED_APPLIES: 'Garantía aplicada',
      RESOLVED_REJECTED: 'Garantía rechazada', CANCELLED: 'Cancelada',
    })[status];
  }

  claimOutcomeLabel(outcome: WarrantyClaim['outcome']): string {
    if (outcome === 'WARRANTY_APPLIES') return 'Garantía aplicada';
    if (outcome === 'WARRANTY_REJECTED') return 'Garantía rechazada';
    return 'Pendiente de evaluación';
  }

  equipmentTypeLabel(type: EquipmentType): string {
    return ({
      LAPTOP: 'Laptop', DESKTOP_PC: 'PC de escritorio', ALL_IN_ONE: 'All in One', PRINTER: 'Impresora',
      SCANNER: 'Escáner', PROJECTOR: 'Proyector', MONITOR: 'Monitor', SERVER: 'Servidor',
      NETWORK_DEVICE: 'Equipo de red', OTHER: 'Otro',
    })[type];
  }

  private loadTechnicians(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => this.technicians = (users ?? []).filter((user) =>
        user.isActive && hasAnyRole(user.roles, TECHNICIAN_ROLE_NAMES)),
    });
  }

  private emptyIntake(): WarrantyIntakeRequest {
    return {
      coverageId: 0,
      reportedIssue: '',
      equipmentType: undefined,
      equipmentTypeOther: '',
      brand: '',
      model: '',
      serialNumber: '',
      accessories: '',
      priority: ServiceOrderPriority.LOW,
      notes: '',
    };
  }

  private cleanedIntake(): WarrantyIntakeRequest {
    const clean = (value?: string): string | undefined => value?.trim() || undefined;
    return {
      ...this.intake,
      reportedIssue: this.intake.reportedIssue.trim(),
      equipmentTypeOther: clean(this.intake.equipmentTypeOther),
      brand: clean(this.intake.brand),
      model: clean(this.intake.model),
      serialNumber: clean(this.intake.serialNumber),
      accessories: clean(this.intake.accessories),
      notes: clean(this.intake.notes),
    };
  }

  private errorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;
    return Array.isArray(message) ? message.join('. ') : message || fallback;
  }

  private showToast(type: ToastType, message: string): void {
    this.toast = { show: true, type, message };
    window.setTimeout(() => this.toast.show = false, 4200);
  }

  private toggleSetValue(values: Set<string>, key: string): void {
    if (values.has(key)) values.delete(key);
    else values.add(key);
  }
}
