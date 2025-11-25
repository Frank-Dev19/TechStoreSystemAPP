import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Service } from '../../models/service-catalog/service';
import { ServiceCategory } from '../../models/service-catalog/service-category';
import {
  ServiceService,
  PaginatedRespones as ServicePaginatedResponse
} from '../../services/service-catalog/service.service';
import {
  ServiceCategoryService,
  PaginatedRespones as CategoryPaginatedResponse
} from '../../services/service-catalog/service-category.service';
import { ServiceSaveRequest, ServiceUpdateRequest } from '../../models/service-catalog/service-request';
import {
  ServiceCategorySaveRequest,
  ServiceCategoryUpdateRequest
} from '../../models/service-catalog/service-category-request';

@Component({
  selector: 'app-service-catalog',
  standalone: false,
  templateUrl: './service-catalog.html',
  styleUrls: ['./service-catalog.scss']
})
export class ServiceCatalog implements OnInit {
  activeTab: 'services' | 'categories' = 'services';

  // Services state
  services: Service[] = [];
  filteredServices: Service[] = [];
  selectedServiceIds: number[] = [];
  serviceSearchTerm = '';
  serviceCategoryFilter: 'all' | number = 'all';
  serviceStatusFilter: 'active' | 'deleted' = 'active';
  servicePage = 1;
  serviceItemsPerPage = 10;
  serviceTotalPages = 1;
  serviceTotalItems = 0;
  serviceLoading = false;

  // Categories state
  categories: ServiceCategory[] = [];
  filteredCategories: ServiceCategory[] = [];
  selectedCategoryIds: number[] = [];
  categorySearchTerm = '';
  categoryStatusFilter: 'active' | 'deleted' = 'active';
  categoryPage = 1;
  categoryItemsPerPage = 10;
  categoryTotalPages = 1;
  categoryTotalItems = 0;
  categoryLoading = false;

  // Forms & modals
  showServiceModal = false;
  showCategoryModal = false;
  isServiceEditMode = false;
  isCategoryEditMode = false;
  serviceForm: FormGroup;
  categoryForm: FormGroup;
  currentService: Service | null = null;
  currentCategory: ServiceCategory | null = null;

  // Confirmation & alerts
  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  confirmModalMode: 'delete' | 'restore' = 'delete';
  showAlert = false;
  AlertType = '';
  AlertMessage = '';
  AlertIcon = '';

  // Catalogs
  categoryOptions: ServiceCategory[] = [];
  private categoryCatalog: ServiceCategory[] = [];

  Math = Math;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly serviceApi: ServiceService,
    private readonly categoryApi: ServiceCategoryService,
  ) {
    this.serviceForm = this.createServiceForm();
    this.categoryForm = this.createCategoryForm();
  }

  ngOnInit(): void {
    this.fetchServices();
    this.fetchCategories();
    this.refreshCategoryDataSets();
  }

  get isServiceDeletedView(): boolean {
    return this.serviceStatusFilter === 'deleted';
  }

  get isCategoryDeletedView(): boolean {
    return this.categoryStatusFilter === 'deleted';
  }

  get isRestoreConfirm(): boolean {
    return this.confirmModalMode === 'restore';
  }

  // ===== Services =====
  private fetchServices(): void {
    this.serviceLoading = true;

    const params: Record<string, string | number | boolean> = {
      page: this.servicePage,
      limit: this.serviceItemsPerPage,
    };

    if (this.isServiceDeletedView) {
      params['withDeleted'] = true;
    } else {
      params['status'] = this.serviceStatusFilter;
    }

    if (this.serviceSearchTerm.trim()) {
      params['search'] = this.serviceSearchTerm.trim();
    }

    if (this.serviceCategoryFilter !== 'all') {
      params['categoryId'] = Number(this.serviceCategoryFilter);
    }

    this.serviceApi.findAll(params).subscribe({
      next: (response: ServicePaginatedResponse<Service>) => {
        const data = response.data ?? [];
        this.services = this.sortByCode(data.map((item) => this.normalizeService(item)));
        this.filteredServices = this.filterServicesByView(this.services);
        this.serviceTotalItems = Number(response.total ?? this.filteredServices.length);
        this.serviceItemsPerPage = Number(response.limit ?? this.serviceItemsPerPage);
        this.servicePage = Number(response.page ?? this.servicePage);
        this.updateServicePagination();
        this.selectedServiceIds = [];
      },
      error: (err) => {
        console.error('Error fetching services', err);
        this.services = [];
        this.filteredServices = [];
        this.serviceTotalItems = 0;
        this.serviceTotalPages = 1;
        this.selectedServiceIds = [];
      },
      complete: () => {
        this.serviceLoading = false;
      },
    });
  }

  refreshServices(): void {
    this.fetchServices();
  }

  onServiceSearch(): void {
    this.servicePage = 1;
    this.fetchServices();
  }

  onServiceStatusFilterChange(): void {
    this.servicePage = 1;
    this.selectedServiceIds = [];
    this.fetchServices();
  }

  onServiceCategoryFilterChange(): void {
    this.servicePage = 1;
    this.fetchServices();
  }

  private updateServicePagination(): void {
    this.serviceTotalPages = Math.max(1, Math.ceil(this.serviceTotalItems / this.serviceItemsPerPage));
    if (this.servicePage > this.serviceTotalPages) {
      this.servicePage = this.serviceTotalPages;
    }
    if (this.servicePage < 1) {
      this.servicePage = 1;
    }
  }

  previousServicePage(): void {
    if (this.servicePage > 1) {
      this.servicePage--;
      this.fetchServices();
    }
  }

  nextServicePage(): void {
    if (this.servicePage < this.serviceTotalPages) {
      this.servicePage++;
      this.fetchServices();
    }
  }

  toggleServiceSelection(id: number | string): void {
    const numericId = Number(id);
    if (this.selectedServiceIds.includes(numericId)) {
      this.selectedServiceIds = this.selectedServiceIds.filter((item) => item !== numericId);
    } else {
      this.selectedServiceIds.push(numericId);
    }
  }

  toggleAllServices(): void {
    if (this.areAllServicesSelected()) {
      this.selectedServiceIds = [];
    } else {
      this.selectedServiceIds = this.filteredServices.map((item) => Number(item.id));
    }
  }

  isServiceSelected(id: number | string): boolean {
    return this.selectedServiceIds.includes(Number(id));
  }

  areAllServicesSelected(): boolean {
    return this.filteredServices.length > 0 && this.selectedServiceIds.length === this.filteredServices.length;
  }

  areServiceSelectionsIndeterminate(): boolean {
    return this.selectedServiceIds.length > 0 && this.selectedServiceIds.length < this.filteredServices.length;
  }

  openCreateServiceModal(): void {
    this.isServiceEditMode = false;
    this.currentService = null;
    this.serviceForm.reset({
      code: '',
      name: '',
      description: '',
      categoryId: this.categoryOptions.length ? this.categoryOptions[0].id : null,
      price: 0,
      estimatedDurationMinutes: 0,
      warrantyDays: 0,
      isActive: true,
    });
    this.showServiceModal = true;
  }

  openEditServiceModal(service: Service): void {
    this.isServiceEditMode = true;
    this.currentService = service;
    const categoryId = Number(service.categoryId);
    const hasCategory = this.categoryOptions.some((item) => Number(item.id) === categoryId);
    if (!hasCategory) {
      const fromList = this.categories.find((item) => Number(item.id) === categoryId);
      if (fromList) {
        this.categoryOptions = [...this.categoryOptions, fromList];
      }
    }
    this.serviceForm.patchValue({
      code: service.code,
      name: service.name,
      description: service.description ?? '',
      categoryId,
      price: Number(service.price),
      estimatedDurationMinutes: Number(service.estimatedDurationMinutes ?? 0),
      warrantyDays: Number(service.warrantyDays ?? 0),
      isActive: !!service.isActive,
    });
    this.showServiceModal = true;
  }

  closeServiceModal(): void {
    this.showServiceModal = false;
    this.serviceForm.reset();
    this.currentService = null;
  }

  saveService(): void {
    if (this.serviceForm.invalid) {
      this.markFormGroupAsTouched(this.serviceForm);
      return;
    }

    const request$ = this.isServiceEditMode && this.currentService
      ? this.serviceApi.update(Number(this.currentService.id), this.buildServiceUpdatePayload())
      : this.serviceApi.create(this.buildServiceSavePayload());

    request$.subscribe({
      next: () => {
        const message = this.isServiceEditMode
          ? 'Servicio actualizado correctamente!'
          : 'Servicio creado correctamente!';
        this.showMessage('success', 'fas fa-check-circle', message);
        this.closeServiceModal();
        this.fetchServices();
      },
      error: () => {
        const message = this.isServiceEditMode
          ? 'No se pudo actualizar el servicio.'
          : 'No se pudo crear el servicio.';
        this.showMessage('error', 'fas fa-exclamation-circle', message);
      },
    });
  }

  confirmServiceDelete(service: Service): void {
    this.confirmMessage = `¿Deseas eliminar el servicio "${service.name}"?`;
    this.confirmAction = () => this.deleteService(service.id);
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmServiceRestore(service: Service): void {
    this.confirmMessage = `¿Deseas restaurar el servicio "${service.name}"?`;
    this.confirmAction = () => this.restoreService(service.id);
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  confirmServiceBulkDelete(): void {
    const count = this.selectedServiceIds.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Deseas eliminar ${count} servicio${count > 1 ? 's' : ''}?`;
    this.confirmAction = () => this.deleteBulkServices();
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmServiceBulkRestore(): void {
    const count = this.selectedServiceIds.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Deseas restaurar ${count} servicio${count > 1 ? 's' : ''}?`;
    this.confirmAction = () => this.restoreBulkServices();
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  private deleteService(id: number | string): void {
    const numericId = Number(id);
    this.serviceApi.softDelete(numericId).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Servicio eliminado correctamente!');
        this.fetchServices();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo eliminar el servicio.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restoreService(id: number | string): void {
    const numericId = Number(id);
    this.serviceApi.restore(numericId).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Servicio restaurado correctamente!');
        this.fetchServices();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo restaurar el servicio.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private deleteBulkServices(): void {
    if (!this.selectedServiceIds.length) {
      return;
    }
    const ids = this.selectedServiceIds.map((value) => Number(value));
    this.serviceApi.bulkSoftDelete(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Servicios eliminados correctamente!');
        this.fetchServices();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudieron eliminar los servicios.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restoreBulkServices(): void {
    if (!this.selectedServiceIds.length) {
      return;
    }
    const ids = this.selectedServiceIds.map((value) => Number(value));
    this.serviceApi.bulkRestore(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Servicios restaurados correctamente!');
        this.fetchServices();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudieron restaurar los servicios.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  getCategoryName(categoryId: number | string): string {
    const numericId = Number(categoryId);
    const catalogMatch = this.categoryCatalog.find((item) => Number(item.id) === numericId);
    if (catalogMatch) {
      return catalogMatch.name;
    }
    return 'Sin categoría';
  }

  // ===== Categories =====
  private fetchCategories(): void {
    this.categoryLoading = true;

    const params: Record<string, string | number | boolean> = {
      page: this.categoryPage,
      limit: this.categoryItemsPerPage,
    };

    if (this.isCategoryDeletedView) {
      params['withDeleted'] = true;
    } else {
      params['status'] = this.categoryStatusFilter;
    }

    if (this.categorySearchTerm.trim()) {
      params['search'] = this.categorySearchTerm.trim();
    }

    this.categoryApi.findAll(params).subscribe({
      next: (response: CategoryPaginatedResponse<ServiceCategory>) => {
        const data = response.data ?? [];
        this.categories = this.sortByCode(data.map((item) => this.normalizeCategory(item)));
        this.filteredCategories = this.filterCategoriesByView(this.categories);
        this.categoryTotalItems = Number(response.total ?? this.filteredCategories.length);
        this.categoryItemsPerPage = Number(response.limit ?? this.categoryItemsPerPage);
        this.categoryPage = Number(response.page ?? this.categoryPage);
        this.updateCategoryPagination();
        this.selectedCategoryIds = [];

        this.syncCategoryCatalog(this.categories);
      },
      error: (err) => {
        console.error('Error fetching service categories', err);
        this.categories = [];
        this.filteredCategories = [];
        this.categoryTotalItems = 0;
        this.categoryTotalPages = 1;
        this.selectedCategoryIds = [];
      },
      complete: () => {
        this.categoryLoading = false;
      },
    });
  }

  refreshCategories(): void {
    this.fetchCategories();
  }

  onCategorySearch(): void {
    this.categoryPage = 1;
    this.fetchCategories();
  }

  onCategoryStatusFilterChange(): void {
    this.categoryPage = 1;
    this.selectedCategoryIds = [];
    this.fetchCategories();
  }

  private updateCategoryPagination(): void {
    this.categoryTotalPages = Math.max(1, Math.ceil(this.categoryTotalItems / this.categoryItemsPerPage));
    if (this.categoryPage > this.categoryTotalPages) {
      this.categoryPage = this.categoryTotalPages;
    }
    if (this.categoryPage < 1) {
      this.categoryPage = 1;
    }
  }

  previousCategoryPage(): void {
    if (this.categoryPage > 1) {
      this.categoryPage--;
      this.fetchCategories();
    }
  }

  nextCategoryPage(): void {
    if (this.categoryPage < this.categoryTotalPages) {
      this.categoryPage++;
      this.fetchCategories();
    }
  }

  toggleCategorySelection(id: number | string): void {
    const numericId = Number(id);
    if (this.selectedCategoryIds.includes(numericId)) {
      this.selectedCategoryIds = this.selectedCategoryIds.filter((item) => item !== numericId);
    } else {
      this.selectedCategoryIds.push(numericId);
    }
  }

  toggleAllCategories(): void {
    if (this.areAllCategoriesSelected()) {
      this.selectedCategoryIds = [];
    } else {
      this.selectedCategoryIds = this.filteredCategories.map((item) => Number(item.id));
    }
  }

  isCategorySelected(id: number | string): boolean {
    return this.selectedCategoryIds.includes(Number(id));
  }

  areAllCategoriesSelected(): boolean {
    return this.filteredCategories.length > 0 && this.selectedCategoryIds.length === this.filteredCategories.length;
  }

  areCategorySelectionsIndeterminate(): boolean {
    return this.selectedCategoryIds.length > 0 && this.selectedCategoryIds.length < this.filteredCategories.length;
  }

  openCreateCategoryModal(): void {
    this.isCategoryEditMode = false;
    this.currentCategory = null;
    this.categoryForm.reset({
      code: '',
      name: '',
      description: '',
      isActive: true,
    });
    this.showCategoryModal = true;
  }

  openEditCategoryModal(category: ServiceCategory): void {
    this.isCategoryEditMode = true;
    this.currentCategory = category;
    this.categoryForm.patchValue({
      code: category.code,
      name: category.name,
      description: category.description ?? '',
      isActive: !!category.isActive,
    });
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.currentCategory = null;
    this.categoryForm.reset();
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupAsTouched(this.categoryForm);
      return;
    }

    const request$ = this.isCategoryEditMode && this.currentCategory
      ? this.categoryApi.update(Number(this.currentCategory.id), this.buildCategoryUpdatePayload())
      : this.categoryApi.create(this.buildCategorySavePayload());

    request$.subscribe({
      next: () => {
        const message = this.isCategoryEditMode
          ? 'Categoría de servicio actualizada correctamente!'
          : 'Categoría de servicio creada correctamente!';
        this.showMessage('success', 'fas fa-check-circle', message);
        this.closeCategoryModal();
        this.fetchCategories();
        this.refreshCategoryDataSets();
      },
      error: () => {
        const message = this.isCategoryEditMode
          ? 'No se pudo actualizar la categoría.'
          : 'No se pudo crear la categoría.';
        this.showMessage('error', 'fas fa-exclamation-circle', message);
      },
    });
  }

  confirmCategoryDelete(category: ServiceCategory): void {
    this.confirmMessage = `¿Deseas eliminar la categoría "${category.name}"?`;
    this.confirmAction = () => this.deleteCategory(category.id);
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmCategoryRestore(category: ServiceCategory): void {
    this.confirmMessage = `¿Deseas restaurar la categoría "${category.name}"?`;
    this.confirmAction = () => this.restoreCategory(category.id);
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  confirmCategoryBulkDelete(): void {
    const count = this.selectedCategoryIds.length;
    if (!count) {
      return;
    }

    this.confirmMessage = `¿Deseas eliminar ${count} categoría${count > 1 ? 's' : ''}?`;
    this.confirmAction = () => this.deleteBulkCategories();
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmCategoryBulkRestore(): void {
    const count = this.selectedCategoryIds.length;
    if (!count) {
      return;
    }

    this.confirmMessage = `¿Deseas restaurar ${count} categoría${count > 1 ? 's' : ''}?`;
    this.confirmAction = () => this.restoreBulkCategories();
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  private deleteCategory(id: number | string): void {
    const numericId = Number(id);
    this.categoryApi.softDelete(numericId).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Categoría eliminada correctamente!');
        this.fetchCategories();
        this.refreshCategoryDataSets();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo eliminar la categoría.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restoreCategory(id: number | string): void {
    const numericId = Number(id);
    this.categoryApi.restore(numericId).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Categoría restaurada correctamente!');
        this.fetchCategories();
        this.refreshCategoryDataSets();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo restaurar la categoría.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private deleteBulkCategories(): void {
    if (!this.selectedCategoryIds.length) {
      return;
    }

    const ids = this.selectedCategoryIds.map((value) => Number(value));
    this.categoryApi.bulkSoftDelete(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Categorías eliminadas correctamente!');
        this.fetchCategories();
        this.refreshCategoryDataSets();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudieron eliminar las categorías.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restoreBulkCategories(): void {
    if (!this.selectedCategoryIds.length) {
      return;
    }

    const ids = this.selectedCategoryIds.map((value) => Number(value));
    this.categoryApi.bulkRestore(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Categorías restauradas correctamente!');
        this.fetchCategories();
        this.refreshCategoryDataSets();
      },
      error: () => {
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudieron restaurar las categorías.');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  // ===== Confirm & alerts =====
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

  private showMessage(tipo: string, icono: string, mensaje: string): void {
    this.AlertType = tipo;
    this.AlertIcon = icono;
    this.AlertMessage = mensaje;
    this.showAlert = true;
    setTimeout(() => this.closeAlert(), 5000);
  }

  closeAlert(): void {
    this.showAlert = false;
  }

  // ===== Helpers =====
  private createServiceForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      description: [''],
      categoryId: [null, Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      estimatedDurationMinutes: [0, [Validators.required, Validators.min(0)]],
      warrantyDays: [0, [Validators.min(0)]],
      isActive: [true],
    });
  }

  private createCategoryForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      description: [''],
      isActive: [true],
    });
  }

  private markFormGroupAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      form.get(key)?.markAsTouched();
    });
  }

  private buildServiceSavePayload(): ServiceSaveRequest {
    const formValue = this.serviceForm.value;
    return {
      name: String(formValue.name ?? '').trim(),
      description: formValue.description ? String(formValue.description).trim() : null,
      categoryId: Number(formValue.categoryId),
      price: this.toPositiveNumber(formValue.price),
      estimatedDurationMinutes: Math.max(0, Number(formValue.estimatedDurationMinutes) || 0),
      warrantyDays: Math.max(0, Number(formValue.warrantyDays) || 0),
      isActive: Boolean(formValue.isActive),
    };
  }

  private buildServiceUpdatePayload(): ServiceUpdateRequest {
    return this.buildServiceSavePayload();
  }

  private buildCategorySavePayload(): ServiceCategorySaveRequest {
    const formValue = this.categoryForm.value;
    return {
      name: String(formValue.name ?? '').trim(),
      description: formValue.description ? String(formValue.description).trim() : null,
      isActive: Boolean(formValue.isActive),
    };
  }

  private buildCategoryUpdatePayload(): ServiceCategoryUpdateRequest {
    return this.buildCategorySavePayload();
  }

  private normalizeService(service: Service): Service {
    return {
      ...service,
      id: Number(service.id),
      categoryId: Number(service.categoryId),
      price: Number(service.price),
      estimatedDurationMinutes: Number(service.estimatedDurationMinutes ?? 0),
      warrantyDays: Number(service.warrantyDays ?? 0),
      isActive: Boolean(service.isActive),
    };
  }

  private normalizeCategory(category: ServiceCategory): ServiceCategory {
    return {
      ...category,
      id: Number(category.id),
      isActive: Boolean(category.isActive),
    };
  }

  private toPositiveNumber(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return numeric < 0 ? 0 : numeric;
  }

  private loadCategoryOptions(): void {
    const params: Record<string, string | number | boolean> = {
      page: 1,
      limit: 1000,
      withDeleted: false,
    };

    this.categoryApi.findAll(params).subscribe({
      next: (response: CategoryPaginatedResponse<ServiceCategory>) => {
        const data = response.data ?? [];
        const normalized = this.sortByCode(data.map((item) => this.normalizeCategory(item)));
        this.categoryOptions = normalized;
        if (this.serviceCategoryFilter !== 'all') {
          const exists = normalized.some((item) => Number(item.id) === Number(this.serviceCategoryFilter));
          if (!exists) {
            this.serviceCategoryFilter = 'all';
          }
        }
      },
      error: (err) => {
        console.error('Error loading category options', err);
      },
    });
  }

  private loadCategoryCatalog(): void {
    const params: Record<string, string | number | boolean> = {
      page: 1,
      limit: 1000,
      withDeleted: true,
    };

    this.categoryApi.findAll(params).subscribe({
      next: (response: CategoryPaginatedResponse<ServiceCategory>) => {
        const data = response.data ?? [];
        this.categoryCatalog = this.sortByCode(data.map((item) => this.normalizeCategory(item)));
      },
      error: (err) => {
        console.error('Error loading category catalog', err);
      },
    });
  }

  private refreshCategoryDataSets(): void {
    this.loadCategoryOptions();
    this.loadCategoryCatalog();
  }

  private syncCategoryCatalog(list: ServiceCategory[]): void {
    // combine existing catalog with incoming list to keep deleted items references
    const map = new Map<number, ServiceCategory>();
    [...this.categoryCatalog, ...list].forEach((item) => {
      map.set(Number(item.id), item);
    });
    this.categoryCatalog = this.sortByCode(Array.from(map.values()));
    this.categoryOptions = this.categoryCatalog.filter((item) => !item.deletedAt);
  }

  private filterServicesByView(list: Service[]): Service[] {
    if (this.isServiceDeletedView) {
      return list.filter((item) => !!item.deletedAt);
    }
    return list.filter((item) => !item.deletedAt);
  }

  private filterCategoriesByView(list: ServiceCategory[]): ServiceCategory[] {
    if (this.isCategoryDeletedView) {
      return list.filter((item) => !!item.deletedAt);
    }
    return list.filter((item) => !item.deletedAt);
  }

  private sortByCode<T extends { code: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? '')));
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

  formatCurrency(value: number | string): string {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(numberValue);
  }
}
