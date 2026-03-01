import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { config } from '../../../environments/environment';
import { PaginatedResponse, SuppliersApiService } from '../../services/suppliers-api.service';
import { SupplierResponse } from '../../models/suppliers-response';
import { SupplierSaveRequest, SupplierUpdateRequest } from '../../models/suppliers-request';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DocumentTypeResponse } from '../../models/document-types/document-types-response';

@Component({
  selector: 'app-suppliers',
  standalone: false,
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
})
export class Suppliers implements OnInit {
  private readonly documentNumberPattern = /^[A-Za-z0-9-]+$/;
  partners: SupplierResponse[] = [];
  visiblePartners: SupplierResponse[] = [];
  selectedPartnerIds: number[] = [];
  searchTerm = '';
  statusFilter: 'active' | 'deleted' = 'active';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  totalItems = 0;
  isLoading = false;
  documentTypes: DocumentTypeResponse[] = [];
  showModal = false;
  showConfirmModal = false;
  isEditMode = false;
  partnerForm: FormGroup;
  currentPartner: SupplierResponse | null = null;
  showAlert = false;
  AlertType = '';
  AlertMessage = '';
  AlertIcon = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  confirmModalMode: 'delete' | 'restore' = 'delete';
  showRestoreSuggestion = false;
  restoreSuggestionData: SupplierResponse | null = null;
  documentDigitsHint: number | null = null;
  Math = Math;
  readonly pageTitle = 'Proveedores';
  readonly pageSubtitle = 'Administra proveedores desde un solo lugar';
  readonly entityLabel = 'proveedor';
  readonly entityLabelPlural = 'proveedores';
  readonly entityDisplayLabel = 'Proveedor';
  private readonly companyId = Number(config.defaultCompanyId ?? 1) || 1;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly suppliersApi: SuppliersApiService,
    private readonly documentTypesApi: DocumentTypesApiService,
  ) {
    this.partnerForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.observeDocumentTypeChanges();
    this.fetchPartners();
  }

  get isDeletedView(): boolean {
    return this.statusFilter === 'deleted';
  }

  get isRestoreConfirm(): boolean {
    return this.confirmModalMode === 'restore';
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      tradeName: [''],
      documentTypeId: [null, Validators.required],
      documentNumber: ['', [Validators.required, Validators.pattern(this.documentNumberPattern)]],
      email: ['', Validators.email],
      phone: ['', Validators.required],
      address: [''],
      city: [''],
      country: [''],
    });
  }

  private observeDocumentTypeChanges(): void {
    this.partnerForm.get('documentTypeId')?.valueChanges.subscribe((value) => {
      const docTypeId = Number(value);
      const docType = this.documentTypes.find((item) => Number(item.id) === docTypeId);
      this.documentDigitsHint = docType?.digits ?? null;
      this.updateDocumentNumberValidators(this.documentDigitsHint);
      this.enforceDocumentNumberLength();
    });
  }

  onDocumentNumberInput(): void {
    this.enforceDocumentNumberLength();
  }

  private enforceDocumentNumberLength(): void {
    const control = this.partnerForm.get('documentNumber');
    const rawValue = String(control?.value ?? '');
    if (!control) return;

    const safeValue = rawValue.replace(/[^A-Za-z0-9-]/g, '');
    const trimmedValue = this.documentDigitsHint
      ? safeValue.slice(0, this.documentDigitsHint)
      : safeValue;

    if (trimmedValue !== rawValue) {
      control.setValue(trimmedValue, { emitEvent: false });
    }
  }

  private updateDocumentNumberValidators(digits: number | null): void {
    const control = this.partnerForm.get('documentNumber');
    if (!control) return;
    const validators = [Validators.required, Validators.pattern(this.documentNumberPattern)];
    if (digits && digits > 0) {
      validators.push(Validators.minLength(digits));
      validators.push(Validators.maxLength(digits));
    } else {
      validators.push(Validators.minLength(4));
    }
    control.setValidators(validators);
    control.updateValueAndValidity();
  }

  private loadDocumentTypes(): void {
    this.documentTypesApi.findAll({ limit: 100 }).subscribe({
      next: (response) => {
        this.documentTypes = (response.data ?? []).map((item) => ({
          ...item,
          id: Number(item.id),
          digits: Number(item.digits),
        }));
      },
      error: (err) => console.error('Error fetching document types', err),
    });
  }

  private fetchPartners(): void {
    this.isLoading = true;
    const params: Record<string, string | number | boolean> = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      companyId: this.companyId ?? undefined,
      status: this.statusFilter,
    };
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();

    this.suppliersApi.findAll(params).subscribe({
      next: (response: PaginatedResponse<SupplierResponse>) => {
        this.partners = (response.data ?? []).map((partner) => ({
          ...partner,
          id: Number(partner.id),
          companyId: Number(partner.companyId),
          documentTypeId: Number(partner.documentTypeId),
          isClient: false,
          isSupplier: true,
        }));
        this.visiblePartners = [...this.partners];
        this.totalItems = Number(response.total ?? this.partners.length);
        this.itemsPerPage = Number(response.limit ?? this.itemsPerPage);
        this.currentPage = Number(response.page ?? this.currentPage);
        this.updatePagination();
        this.selectedPartnerIds = [];
      },
      error: (err) => {
        console.error('Error fetching suppliers', err);
        this.partners = [];
        this.visiblePartners = [];
        this.totalItems = 0;
        this.totalPages = 1;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  refreshData(): void { this.fetchPartners(); }
  onSearch(): void { this.currentPage = 1; this.fetchPartners(); }
  onStatusFilterChange(): void { this.currentPage = 1; this.selectedPartnerIds = []; this.fetchPartners(); }

  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
  }

  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.fetchPartners(); } }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.fetchPartners(); } }
  toggleSelect(partnerId: number | string): void {
    const id = Number(partnerId);
    const index = this.selectedPartnerIds.indexOf(id);
    if (index > -1) this.selectedPartnerIds.splice(index, 1);
    else this.selectedPartnerIds.push(id);
  }
  toggleSelectAll(): void {
    this.selectedPartnerIds = this.isAllSelected() ? [] : this.visiblePartners.map((partner) => Number(partner.id));
  }
  isSelected(partnerId: number): boolean { return this.selectedPartnerIds.includes(Number(partnerId)); }
  isAllSelected(): boolean { return this.visiblePartners.length > 0 && this.selectedPartnerIds.length === this.visiblePartners.length; }
  isIndeterminate(): boolean { return this.selectedPartnerIds.length > 0 && this.selectedPartnerIds.length < this.visiblePartners.length; }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentPartner = null;
    this.partnerForm.reset({
      name: '',
      tradeName: '',
      documentTypeId: null,
      documentNumber: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
    });
    this.documentDigitsHint = null;
    this.showModal = true;
  }

  openEditModal(partner: SupplierResponse): void {
    this.isEditMode = true;
    this.currentPartner = partner;
    this.partnerForm.patchValue({
      name: partner.name,
      tradeName: partner.tradeName ?? '',
      documentTypeId: Number(partner.documentTypeId),
      documentNumber: partner.documentNumber,
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      address: partner.address ?? '',
      city: partner.city ?? '',
      country: partner.country ?? '',
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.partnerForm.reset();
    this.currentPartner = null;
    this.documentDigitsHint = null;
  }

  private buildSavePayload(): SupplierSaveRequest {
    const formValue = this.partnerForm.value;
    return {
      companyId: this.companyId ?? undefined,
      name: String(formValue.name).trim(),
      tradeName: formValue.tradeName ? String(formValue.tradeName).trim() : undefined,
      documentTypeId: Number(formValue.documentTypeId),
      documentNumber: String(formValue.documentNumber).trim(),
      email: formValue.email ? String(formValue.email).trim() : undefined,
      phone: String(formValue.phone).trim(),
      address: formValue.address ? String(formValue.address).trim() : undefined,
      city: formValue.city ? String(formValue.city).trim() : undefined,
      country: formValue.country ? String(formValue.country).trim() : undefined,
    };
  }

  private buildUpdatePayload(): SupplierUpdateRequest {
    const payload = this.buildSavePayload();
    if (this.currentPartner) delete payload.companyId;
    return payload;
  }

  private markFormAsTouched(): void {
    Object.keys(this.partnerForm.controls).forEach((key) => {
      this.partnerForm.get(key)?.markAsTouched();
    });
  }

  savePartner(): void {
    if (this.partnerForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    const request$ = this.isEditMode && this.currentPartner
      ? this.suppliersApi.update(Number(this.currentPartner.id), this.buildUpdatePayload())
      : this.suppliersApi.create(this.buildSavePayload());

    request$.subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', this.isEditMode ? 'Proveedor actualizado correctamente!' : 'Proveedor creado correctamente!');
        this.closeModal();
        this.fetchPartners();
      },
      error: (err) => {
        if (!this.isEditMode && err?.status === 409) {
          const deleted = !!err?.error?.deleted;
          const candidate = err?.error?.data as SupplierResponse | undefined;
          if (deleted && candidate) {
            this.openRestoreSuggestion(candidate);
            return;
          }
        }
        this.showMessage('error', 'fas fa-exclamation-circle', this.isEditMode ? 'No se pudo actualizar el proveedor!' : 'No se pudo crear el proveedor!');
      },
    });
  }

  confirmDelete(partner: SupplierResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas eliminar al proveedor "${partner.name}"?`;
    this.confirmAction = () => this.deletePartner(partner.id);
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmBulkDelete(): void {
    const count = this.selectedPartnerIds.length;
    if (!count) return;
    this.confirmMessage = `¿Estás seguro de que deseas eliminar ${count} proveedor${count > 1 ? 'es' : ''}?`;
    this.confirmAction = () => this.deleteBulkPartners();
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmRestore(partner: SupplierResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas restaurar al proveedor "${partner.name}"?`;
    this.confirmAction = () => this.restorePartner(partner.id);
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  confirmBulkRestore(): void {
    const count = this.selectedPartnerIds.length;
    if (!count) return;
    this.confirmMessage = `¿Estás seguro de que deseas restaurar ${count} proveedor${count > 1 ? 'es' : ''}?`;
    this.confirmAction = () => this.restoreBulkPartners();
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  private deletePartner(partnerId: number | string): void {
    const id = Number(partnerId);
    this.suppliersApi.remove(id).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Proveedor eliminado correctamente!');
        this.fetchPartners();
      },
      error: () => this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo eliminar el proveedor!'),
      complete: () => this.closeConfirmModal(),
    });
  }

  private deleteBulkPartners(): void {
    if (!this.selectedPartnerIds.length) return;
    const ids = this.selectedPartnerIds.map((value) => Number(value));
    this.suppliersApi.bulkSoftDelete(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Proveedores eliminados correctamente!');
        this.fetchPartners();
      },
      error: () => this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudieron eliminar los proveedores!'),
      complete: () => this.closeConfirmModal(),
    });
  }

  private restorePartner(partnerId: number | string): void { this.restorePartnerWithOptions(partnerId); }

  private restorePartnerWithOptions(partnerId: number | string, options?: { onSuccess?: () => void; closeConfirm?: boolean }): void {
    const id = Number(partnerId);
    const closeConfirm = options?.closeConfirm ?? true;
    const onSuccess = options?.onSuccess;
    this.suppliersApi.restore(id).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Proveedor restaurado correctamente!');
        this.fetchPartners();
        onSuccess?.();
      },
      error: () => this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo restaurar el proveedor!'),
      complete: () => { if (closeConfirm) this.closeConfirmModal(); },
    });
  }

  private restoreBulkPartners(): void {
    if (!this.selectedPartnerIds.length) return;
    const ids = this.selectedPartnerIds.map((value) => Number(value));
    this.suppliersApi.bulkRestore(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Proveedores restaurados correctamente!');
        this.fetchPartners();
      },
      error: () => this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudieron restaurar los proveedores!'),
      complete: () => this.closeConfirmModal(),
    });
  }

  executeConfirmAction(): void { if (this.confirmAction) this.confirmAction(); }
  closeConfirmModal(): void { this.showConfirmModal = false; this.confirmMessage = ''; this.confirmAction = null; this.confirmModalMode = 'delete'; }
  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
  }
  getDocTypeName(documentTypeId: number): string {
    const docType = this.documentTypes.find((item) => Number(item.id) === Number(documentTypeId));
    return docType?.name ?? documentTypeId.toString();
  }
  getRoleLabels(_partner?: SupplierResponse): string { return 'Proveedor'; }

  openRestoreSuggestion(data: SupplierResponse): void {
    const docTypeId = Number(data.documentTypeId ?? data.documentType?.id ?? 0);
    this.restoreSuggestionData = { ...data, id: Number(data.id), companyId: Number(data.companyId), documentTypeId: docTypeId };
    this.showRestoreSuggestion = true;
  }

  closeRestoreSuggestion(): void { this.showRestoreSuggestion = false; this.restoreSuggestionData = null; }
  confirmRestoreSuggestion(): void {
    if (!this.restoreSuggestionData) return;
    const id = Number(this.restoreSuggestionData.id);
    this.showRestoreSuggestion = false;
    this.restorePartnerWithOptions(id, { closeConfirm: false, onSuccess: () => this.closeModal() });
    this.restoreSuggestionData = null;
  }

  private showMessage(tipo: string, icono: string, mensaje: string): void {
    this.AlertType = tipo;
    this.AlertIcon = icono;
    this.AlertMessage = mensaje;
    this.showAlert = true;
    setTimeout(() => this.closeAlert(), 5000);
  }

  closeAlert(): void { this.showAlert = false; }
}
