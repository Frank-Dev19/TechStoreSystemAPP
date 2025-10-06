import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DocumentTypeResponse, DocumentTypesPaginatedResponse } from '../../models/document-types/document-types-response';
import { DocumentTypeSaveRequest, DocumentTypeUpdateRequest } from '../../models/document-types/document-types-request';

@Component({
  selector: 'app-document-types',
  standalone: false,
  templateUrl: './document-types.html',
  styleUrl: './document-types.scss',
})
export class DocumentTypes implements OnInit {

  documentTypes: DocumentTypeResponse[] = [];
  filteredDocumentTypes: DocumentTypeResponse[] = [];
  selectedDocumentTypes: number[] = [];

  searchTerm = '';
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

  confirmMessage = '';
  confirmAction: (() => void) | null = null;

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

  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      digits: [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      description: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    });
  }

  private fetchDocumentTypes(): void {
    this.isLoading = true;

    const params: Record<string, string | number> = {
      page: this.currentPage,
      limit: this.itemsPerPage,
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
      digits: Number(documentType.digits),
      description: documentType.description ?? '',
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.documentTypeForm.reset({ name: '', digits: null, description: '' });
    this.currentDocumentType = null;
  }

  private buildSavePayload(): DocumentTypeSaveRequest {
    const formValue = this.documentTypeForm.value;
    const digitsValue = Number(formValue.digits);
    return {
      name: String(formValue.name ?? '').trim(),
      digits: Number.isFinite(digitsValue) && digitsValue > 0 ? digitsValue : 1,
      description: String(formValue.description ?? '').trim(),
    };
  }

  private buildUpdatePayload(): DocumentTypeUpdateRequest {
    const formValue = this.documentTypeForm.value;
    const digitsValue = Number(formValue.digits);
    return {
      name: formValue.name ? String(formValue.name).trim() : undefined,
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
        console.log(this.isEditMode ? 'Tipo de documento actualizado correctamente' : 'Tipo de documento creado correctamente');
        this.closeModal();
        this.fetchDocumentTypes();
      },
      error: (err) => {
        console.error('Error saving document type', err);
      },
    });
  }

  confirmDelete(documentType: DocumentTypeResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas eliminar el tipo de documento "${documentType.name}"?`;
    this.confirmAction = () => this.deleteDocumentType(documentType.id);
    this.showConfirmModal = true;
  }

  confirmBulkDelete(): void {
    const count = this.selectedDocumentTypes.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Estás seguro de que deseas eliminar ${count} tipo${count > 1 ? 's' : ''} de documento?`;
    this.confirmAction = () => this.deleteBulkDocumentTypes();
    this.showConfirmModal = true;
  }

  private deleteDocumentType(id: number | string): void {
    const numericId = Number(id);
    this.documentTypesApi.remove(numericId).subscribe({
      next: () => {
        console.log('Tipo de documento eliminado correctamente');
        this.fetchDocumentTypes();
      },
      error: (err) => {
        console.error('Error deleting document type', err);
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private deleteBulkDocumentTypes(): void {
    if (!this.selectedDocumentTypes.length) {
      return;
    }

    const ids = this.selectedDocumentTypes.map((value) => Number(value));

    this.documentTypesApi.bulkSoftDelete(ids).subscribe({
      next: () => {
        console.log('Tipos de documento eliminados correctamente');
        this.fetchDocumentTypes();
      },
      error: (err) => {
        console.error('Error deleting document types', err);
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  executeDelete(): void {
    this.executeConfirmAction();
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
}



