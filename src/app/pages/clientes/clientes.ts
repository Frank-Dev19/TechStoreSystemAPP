import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { CustomersApiService, PaginatedResponse } from "../../services/customers-api.service";
import { CustomersResponse } from "../../models/customers/customers-response";
import { CustomersSaveRequest } from "../../models/customers/customers-request";
import { DocumentTypesApiService } from "../../services/document-types-api.service";
import { DocumentTypeResponse, DocumentTypesPaginatedResponse } from "../../models/document-types/document-types-response";

@Component({
  selector: 'app-clientes',
  standalone: false,
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes implements OnInit {

  clientes: CustomersResponse[] = [];
  filteredClientes: CustomersResponse[] = [];
  selectedClients: number[] = [];

  searchTerm = "";
  statusFilter = "";

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  totalItems = 0;

  isLoading = false;
  documentTypes: DocumentTypeResponse[] = [];

  showModal = false;
  showConfirmModal = false;
  isEditMode = false;
  clientForm: FormGroup;
  currentClient: CustomersResponse | null = null;

  confirmMessage = "";
  deleteAction: (() => void) | null = null;

  Math = Math;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly customersApi: CustomersApiService,
    private readonly documentTypesApi: DocumentTypesApiService,
  ) {
    this.clientForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.fetchClientes();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ["", [Validators.required, Validators.minLength(2)]],
      documentTypeId: ["", Validators.required],
      documentNumber: ["", [Validators.required, Validators.minLength(8)]],
      email: ["", [Validators.required, Validators.email]],
      phone: [""],
      isActive: [true],
    });
  }

  private loadDocumentTypes(): void {
    this.documentTypesApi.findAll({ limit: 50, isActive: 'true' }).subscribe({
      next: (response) => {
        this.documentTypes = response.data.map((item) => ({
          ...item,  
          id: Number(item.id),
        }));
      },
      error: (err) => {
        console.error("Error fetching document types", err);
      },
    });
  }

  private fetchClientes(): void {
    this.isLoading = true;

    const params: Record<string, string | number | boolean> = {
      page: this.currentPage,
      limit: this.itemsPerPage,
    };

    if (this.searchTerm.trim()) {
      params['search'] = this.searchTerm.trim();
    }

    if (this.statusFilter !== "") {
      params['isActive'] = this.statusFilter;
    }

    this.customersApi.findAll(params).subscribe({
      next: (response: PaginatedResponse<CustomersResponse>) => {
        this.clientes = response.data.map((cliente) => ({
          ...cliente,
          id: Number(cliente.id),
          documentTypeId: Number(cliente.documentTypeId),
        }));
        this.filteredClientes = [...this.clientes];
        this.totalItems = response.total;
        this.itemsPerPage = this.itemsPerPage;
        this.currentPage = this.currentPage;
        this.updatePagination();
        this.selectedClients = [];
      },
      error: (err) => {
        console.error("Error fetching customers", err);
        this.clientes = [];
        this.filteredClientes = [];
        this.totalItems = 0;
        this.totalPages = 1;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  refreshData(): void {
    this.fetchClientes();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchClientes();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchClientes();
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
      this.fetchClientes();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchClientes();
    }
  }

  toggleSelect(clientId: number | string): void {
    const id = Number(clientId);
    const index = this.selectedClients.indexOf(id);
    if (index > -1) {
      this.selectedClients.splice(index, 1);
    } else {
      this.selectedClients.push(id);
    }
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedClients = [];
    } else {
      this.selectedClients = this.filteredClientes.map((cliente) => Number(cliente.id));
    }
  }

  isSelected(clientId: number): boolean {
    return this.selectedClients.includes(clientId);
  }

  isAllSelected(): boolean {
    return this.filteredClientes.length > 0 && this.selectedClients.length === this.filteredClientes.length;
  }

  isIndeterminate(): boolean {
    return this.selectedClients.length > 0 && this.selectedClients.length < this.filteredClientes.length;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentClient = null;
    this.clientForm.reset({
      name: "",
      documentTypeId: "",
      documentNumber: "",
      email: "",
      phone: "",
      isActive: true,
    });
    this.showModal = true;
  }

  openEditModal(cliente: CustomersResponse): void {
    this.isEditMode = true;
    this.currentClient = cliente;
    this.clientForm.patchValue({
      name: cliente.name,
      documentTypeId: String(cliente.documentTypeId),
      documentNumber: cliente.documentNumber,
      email: cliente.email ?? "",
      phone: cliente.phone ?? "",
      isActive: cliente.isActive,
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.clientForm.reset({ isActive: true });
    this.currentClient = null;
  }

  private buildPayload(): CustomersSaveRequest {
    const formValue = this.clientForm.value;
    return {
      name: String(formValue.name).trim(),
      documentTypeId: Number(formValue.documentTypeId),
      documentNumber: String(formValue.documentNumber).trim(),
      email: formValue.email ? String(formValue.email).trim() : undefined,
      phone: formValue.phone ? String(formValue.phone).trim() : undefined,
      isActive: formValue.isActive,
    };
  }

  private markFormAsTouched(): void {
    Object.keys(this.clientForm.controls).forEach((key) => {
      this.clientForm.get(key)?.markAsTouched();
    });
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    const payload = this.buildPayload();

    const request$ = this.isEditMode && this.currentClient
      ? this.customersApi.update(this.currentClient.id, payload)
      : this.customersApi.create(payload);

    request$.subscribe({
      next: () => {
        console.log(this.isEditMode ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
        this.closeModal();
        this.fetchClientes();
      },
      error: (err) => {
        console.error("Error saving customer", err);
      },
    });
  }

  confirmDelete(cliente: CustomersResponse): void {
    this.confirmMessage = `Estas seguro de que deseas eliminar al cliente "${cliente.name}"?`;
    this.deleteAction = () => this.deleteClient(cliente.id);
    this.showConfirmModal = true;
  }

  confirmBulkDelete(): void {
    const count = this.selectedClients.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `Estas seguro de que deseas eliminar ${count} cliente${count > 1 ? "s" : ""}?`;
    this.deleteAction = () => this.deleteBulkClients();
    this.showConfirmModal = true;
  }

  private deleteClient(clientId: number): void {
    this.customersApi.remove(clientId).subscribe({
      next: () => {
        console.log("Cliente eliminado correctamente");
        this.fetchClientes();
      },
      error: (err) => {
        console.error("Error deleting customer", err);
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private deleteBulkClients(): void {
    if (!this.selectedClients.length) {
      return;
    }

    const ids = this.selectedClients.map((value) => Number(value));

    this.customersApi.bulkSoftDelete(ids).subscribe({
      next: () => {
        console.log("Clientes eliminados correctamente");
        this.fetchClientes();
      },
      error: (err) => {
        console.error("Error deleting customers", err);
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  executeDelete(): void {
    if (this.deleteAction) {
      this.deleteAction();
    }
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmMessage = "";
    this.deleteAction = null;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) {
      return "";
    }
    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  }

  getDocTypeClass(documentTypeId: number): string {
    const label = this.getDocumentTypeName(documentTypeId).toLowerCase();
    return label.replace(/\s+/g, '-');
  }

  getDocumentTypeName(documentTypeId: number): string {
    const docType = this.documentTypes.find((item) => item.id === documentTypeId);
    return docType?.name ?? documentTypeId.toString();
  }
}
