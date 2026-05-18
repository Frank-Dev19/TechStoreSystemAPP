import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DocumentTypeResponse, DocumentTypesPaginatedResponse } from '../../models/document-types/document-types-response';
import { DocumentTypeKind, DocumentTypeSaveRequest, DocumentTypeUpdateRequest } from '../../models/document-types/document-types-request';

@Component({
  selector: 'app-document-types',
  standalone: false,
  templateUrl: './document-types.html',
  styleUrl: './document-types.scss',
})
export class DocumentTypes implements OnInit {
  readonly documentTypeKinds = Object.values(DocumentTypeKind);

  documentTypes: DocumentTypeResponse[] = [];
  filteredDocumentTypes: DocumentTypeResponse[] = [];
  selectedDocumentTypes: number[] = [];

  searchTerm = '';
  statusFilter: 'active' | 'deleted' = 'active';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  totalItems = 0;

  isLoading = false;

  showModal = false;
  showConfirmModal = false;
  isEditMode = false;
  documentTypeForm: FormGroup;
  currentDocumentType: DocumentTypeResponse | null = null;

  showAlert = false;
  AlertType = "";
  AlertMessage = "";
  AlertIcon = "";

  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  confirmModalMode: 'delete' | 'restore' = 'delete';
  showRestoreSuggestion = false;
  restoreSuggestionData: DocumentTypeResponse | null = null;

  Math = Math;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly documentTypesApi: DocumentTypesApiService,
  ) {
    this.documentTypeForm = this.createForm();
  }

  ngOnInit(): void {
    this.fetchDocumentTypes();
  }

  get isDeletedView(): boolean {
    return this.statusFilter === 'deleted';
  }

  get isRestoreConfirm(): boolean {
    return this.confirmModalMode === 'restore';
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      kind: [null, Validators.required],
      sunatCode: ['', [Validators.required, Validators.maxLength(4)]],
      digits: [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      description: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    });
  }

  private fetchDocumentTypes(): void {
    this.isLoading = true;

    const params: Record<string, string | number> = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      status: this.statusFilter,
    };

    if (this.searchTerm.trim()) {
      params['search'] = this.searchTerm.trim();
    }

    this.documentTypesApi.findAll(params).subscribe({
      next: (response: DocumentTypesPaginatedResponse) => {
        const data = response.data ?? [];
        this.documentTypes = data.map((item) => ({
          ...item,
          id: Number(item.id),
          digits: Number(item.digits),
        }));
        this.filteredDocumentTypes = [...this.documentTypes];
        this.totalItems = Number(response.total ?? this.filteredDocumentTypes.length);
        this.itemsPerPage = Number(response.limit ?? this.itemsPerPage);
        this.currentPage = Number(response.page ?? this.currentPage);
        this.updatePagination();
        this.selectedDocumentTypes = [];
      },
      error: (err) => {
        console.error('Error fetching document types', err);
        this.documentTypes = [];
        this.filteredDocumentTypes = [];
        this.totalItems = 0;
        this.totalPages = 1;
        this.selectedDocumentTypes = [];
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  refreshData(): void {
    this.fetchDocumentTypes();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchDocumentTypes();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.selectedDocumentTypes = [];
    this.fetchDocumentTypes();
  }


  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchDocumentTypes();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchDocumentTypes();
    }
  }

  toggleSelect(id: number | string): void {
    const numericId = Number(id);
    if (this.selectedDocumentTypes.includes(numericId)) {
      this.selectedDocumentTypes = this.selectedDocumentTypes.filter((item) => item !== numericId);
    } else {
      this.selectedDocumentTypes.push(numericId);
    }
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedDocumentTypes = [];
    } else {
      this.selectedDocumentTypes = this.filteredDocumentTypes.map((item) => Number(item.id));
    }
  }

  isSelected(id: number | string): boolean {
    return this.selectedDocumentTypes.includes(Number(id));
  }

  isAllSelected(): boolean {
    return this.filteredDocumentTypes.length > 0 && this.selectedDocumentTypes.length === this.filteredDocumentTypes.length;
  }

  isIndeterminate(): boolean {
    return this.selectedDocumentTypes.length > 0 && this.selectedDocumentTypes.length < this.filteredDocumentTypes.length;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentDocumentType = null;
    this.documentTypeForm.reset({
      name: '',
      kind: null,
      sunatCode: '',
      digits: null,
      description: '',
    });
    this.showModal = true;
  }

  openEditModal(documentType: DocumentTypeResponse): void {
    this.isEditMode = true;
    this.currentDocumentType = documentType;
    this.documentTypeForm.patchValue({
      name: documentType.name,
      kind: documentType.kind ?? null,
      sunatCode: documentType.sunatCode ?? '',
      digits: Number(documentType.digits),
      description: documentType.description ?? '',
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.documentTypeForm.reset({ name: '', kind: null, sunatCode: '', digits: null, description: '' });
    this.currentDocumentType = null;
  }

  private buildSavePayload(): DocumentTypeSaveRequest {
    const formValue = this.documentTypeForm.value;
    const digitsValue = Number(formValue.digits);
    return {
      name: String(formValue.name ?? '').trim(),
      kind: formValue.kind as DocumentTypeKind,
      sunatCode: String(formValue.sunatCode ?? '').trim(),
      digits: Number.isFinite(digitsValue) && digitsValue > 0 ? digitsValue : 1,
      description: String(formValue.description ?? '').trim(),
    };
  }

  private buildUpdatePayload(): DocumentTypeUpdateRequest {
    const formValue = this.documentTypeForm.value;
    const digitsValue = Number(formValue.digits);
    return {
      name: formValue.name ? String(formValue.name).trim() : undefined,
      kind: formValue.kind ?? undefined,
      sunatCode: formValue.sunatCode ? String(formValue.sunatCode).trim() : undefined,
      digits: Number.isFinite(digitsValue) && digitsValue > 0 ? digitsValue : undefined,
      description: formValue.description ? String(formValue.description).trim() : undefined,
    };
  }

  private markFormAsTouched(): void {
    Object.keys(this.documentTypeForm.controls).forEach((key) => {
      this.documentTypeForm.get(key)?.markAsTouched();
    });
  }

  saveDocumentType(): void {
    if (this.documentTypeForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    const request$ = this.isEditMode && this.currentDocumentType
      ? this.documentTypesApi.update(Number(this.currentDocumentType.id), this.buildUpdatePayload())
      : this.documentTypesApi.create(this.buildSavePayload());

    request$.subscribe({
      next: () => {
        this.isEditMode ? this.showMessage("success", "fas fa-check-circle", "Tipo de documento actualizado correctamente!") : this.showMessage("success", "fas fa-check-circle", "Tipo de documento creado correctamente!")
        this.closeModal();
        this.fetchDocumentTypes();
      },
      error: (err) => {
        if (!this.isEditMode && err?.status === 409) {
          if (err?.error?.deleted && err?.error?.data) {
            const candidate = err.error.data as DocumentTypeResponse;
            this.openRestoreSuggestion(candidate);
            return;
          }
          const nameValue = String(this.documentTypeForm.get('name')?.value ?? '').trim();
          this.showMessage(
            "error",
            "fas fa-exclamation-circle",
            `No se pudo crear el tipo de documento porque el nombre "${nameValue}" ya existe!`,
          );
          return;
        }
        this.isEditMode ? this.showMessage("error", "fas fa-exclamation-circle", "No se pudo actualizar el tipo de documento") : this.showMessage("error", "fas fa-exclamation-circle", "No se pudo crear el tipo de documento!")
      },
    });
  }

  confirmDelete(documentType: DocumentTypeResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas eliminar el tipo de documento "${documentType.name}"?`;

    this.confirmAction = () => this.deleteDocumentType(documentType.id);
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmRestore(documentType: DocumentTypeResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas restaurar el tipo de documento "${documentType.name}"?`;

    this.confirmAction = () => this.restoreDocumentType(documentType.id);
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  confirmBulkDelete(): void {
    const count = this.selectedDocumentTypes.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Estás seguro de que deseas eliminar ${count} tipo${count > 1 ? 's' : ''} de documento?`;

    this.confirmAction = () => this.deleteBulkDocumentTypes();
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmBulkRestore(): void {
    const count = this.selectedDocumentTypes.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Estás seguro de que deseas restaurar ${count} tipo${count > 1 ? 's' : ''} de documento?`;

    this.confirmAction = () => this.restoreBulkDocumentTypes();
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  private deleteDocumentType(id: number | string): void {
    const numericId = Number(id);
    this.documentTypesApi.delete(numericId).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Tipo de documento eliminado correctamente!");
        this.fetchDocumentTypes();
      },
      error: (err) => {
        this.showMessage("error", "fas fa-exclamation-circle", "No se pudo eliminar el tipo de documento!");
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restoreDocumentType(id: number | string): void {
    this.restoreDocumentTypeWithOptions(id);
  }

  private restoreDocumentTypeWithOptions(id: number | string, options?: { onSuccess?: () => void; closeConfirm?: boolean }): void {
    const numericId = Number(id);
    const closeConfirm = options?.closeConfirm ?? true;
    const onSuccess = options?.onSuccess;

    this.documentTypesApi.restore(numericId).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Tipo de documento restaurado correctamente!");
        this.fetchDocumentTypes();
        onSuccess?.();
      },
      error: () => {
        this.showMessage("error", "fas fa-exclamation-circle", "No se pudo restaurar el tipo de documento!");
      },
      complete: () => {
        if (closeConfirm) {
          this.closeConfirmModal();
        }
      },
    });
  }

  private deleteBulkDocumentTypes(): void {
    if (!this.selectedDocumentTypes.length) {
      return;
    }

    const ids = this.selectedDocumentTypes.map((value) => Number(value));

    this.documentTypesApi.bulkDelete(ids).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Tipos de documento eliminados correctamente!");
        this.fetchDocumentTypes();
      },
      error: (err) => {
        this.showMessage("error", "fas fa-exclamation-circle", "No se pudieron eliminar los tipos de documento!");
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restoreBulkDocumentTypes(): void {
    if (!this.selectedDocumentTypes.length) {
      return;
    }

    const ids = this.selectedDocumentTypes.map((value) => Number(value));

    this.documentTypesApi.bulkRestore(ids).subscribe({
      next: () => {
        this.showMessage("success", "fas fa-check-circle", "Tipos de documento restaurados correctamente!");
        this.fetchDocumentTypes();
      },
      error: () => {
        this.showMessage("error", "fas fa-exclamation-circle", "No se pudieron restaurar los tipos de documento!");
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  executeConfirmAction(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmMessage = '';
    this.confirmAction = null;
    this.confirmModalMode = 'delete';
  }

  openRestoreSuggestion(data: DocumentTypeResponse): void {
    this.restoreSuggestionData = {
      ...data,
      id: Number(data.id),
      digits: Number(data.digits),
    };
    this.showRestoreSuggestion = true;
  }

  closeRestoreSuggestion(): void {
    this.showRestoreSuggestion = false;
    this.restoreSuggestionData = null;
  }

  confirmRestoreSuggestion(): void {
    if (!this.restoreSuggestionData) {
      return;
    }
    const id = Number(this.restoreSuggestionData.id);
    this.showRestoreSuggestion = false;
    this.restoreDocumentTypeWithOptions(id, {
      closeConfirm: false,
      onSuccess: () => {
        this.closeModal();
      },
    });
    this.restoreSuggestionData = null;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
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



