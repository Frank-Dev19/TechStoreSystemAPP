import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as XLSX from 'xlsx';
import { config } from '../../../environments/environment';
import { ClientsApiService, PaginatedResponse } from '../../services/clients-api.service';
import {
  ClientImportCommitResponse,
  ClientImportSource,
  ClientImportStatus,
  ClientImportValidateResponse,
} from '../../models/client-import.models';
import { ClientContactResponse, ClientResponse } from '../../models/clients-response';
import {
  ClientContactRequest,
  ClientKind,
  ClientSaveRequest,
  ClientUpdateRequest,
} from '../../models/clients-request';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DocumentTypeResponse } from '../../models/document-types/document-types-response';
import { CurrentUserService } from '../../services/current-user.service';
import {
  buildPhoneFormValue,
  DEFAULT_PHONE_COUNTRY,
  e164PhoneValidator,
  findPhoneCountry,
  invalidPhoneSentinel,
  PHONE_COUNTRIES,
  normalizePhoneToE164,
  parseStoredPhoneToFormValue,
  PhoneCountry,
  sanitizeNationalPhoneInput,
} from '../../utils/phone.util';

type ImportFilterStatus = 'all' | ClientImportStatus;

type ClientImportPreviewRow = {
  localId: number;
  rowNumber: number;
  documentTypeId: number | null;
  documentNumber: string;
  name: string;
  tradeName: string;
  phoneCountryCode: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  localErrors: string[];
  serverErrors: string[];
  duplicateExistingClientId?: number;
  requiresServerValidation: boolean;
  isOmitted: boolean;
  status: ClientImportStatus;
};

@Component({
  selector: 'app-clients',
  standalone: false,
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients implements OnInit {
  private readonly documentNumberPattern = /^[A-Za-z0-9-]+$/;

  partners: ClientResponse[] = [];
  visiblePartners: ClientResponse[] = [];
  selectedPartnerIds: number[] = [];

  searchTerm = '';
  statusFilter: 'active' | 'deleted' = 'active';
  documentTypeFilter: number | 'all' = 'all';

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
  currentPartner: ClientResponse | null = null;
  showContactsDrawer = false;
  contactsDrawerClient: ClientResponse | null = null;
  contactsDrawerForm: FormGroup;
  isSavingContactsDrawer = false;

  showAlert = false;
  AlertType = '';
  AlertMessage = '';
  AlertIcon = '';

  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  confirmModalMode: 'delete' | 'restore' = 'delete';
  showRestoreSuggestion = false;
  restoreSuggestionData: ClientResponse | null = null;

  documentDigitsHint: number | null = null;

  showImportModal = false;
  importStep: 1 | 2 | 3 = 1;
  importSource: ClientImportSource = 'excel';
  importFileName = '';
  importRows: ClientImportPreviewRow[] = [];
  visibleImportRows: ClientImportPreviewRow[] = [];
  selectedImportRowIds: number[] = [];
  importCurrentPage = 1;
  importItemsPerPage = 25;
  importTotalPages = 1;
  importSearchTerm = '';
  importStatusFilter: ImportFilterStatus = 'all';
  importValidationInProgress = false;
  importValidationProgress = 0;
  importValidationSummary = '';
  importCommitInProgress = false;
  importCommitProgress = 0;
  importCommitSummary: ClientImportCommitResponse | null = null;
  importFileError = '';
  private importUserPermissions = new Set<string>();

  Math = Math;
  readonly pageTitle = 'Clientes';
  readonly pageSubtitle = 'Administra clientes desde un solo lugar';
  readonly entityLabel = 'cliente';
  readonly entityLabelPlural = 'clientes';
  readonly entityDisplayLabel = 'Cliente';
  readonly importPhoneCountries = PHONE_COUNTRIES;

  private readonly companyId = Number(config.defaultCompanyId ?? 1) || 1;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly clientsApi: ClientsApiService,
    private readonly documentTypesApi: DocumentTypesApiService,
    private readonly currentUserService: CurrentUserService,
  ) {
    this.partnerForm = this.createForm();
    this.contactsDrawerForm = this.createContactsDrawerForm();
  }

  ngOnInit(): void {
    this.restorePermissions();
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

  get canImportClients(): boolean {
    return this.importUserPermissions.has('clients.import');
  }

  get importReadyCount(): number {
    return this.importRows.filter((row) => row.status === 'ready').length;
  }

  get importErrorCount(): number {
    return this.importRows.filter((row) => row.status === 'error').length;
  }

  get importDuplicateCount(): number {
    return this.importRows.filter((row) => row.status === 'duplicate').length;
  }

  get importOmittedCount(): number {
    return this.importRows.filter((row) => row.status === 'omitted').length;
  }

  get importPendingCount(): number {
    return this.importRows.filter((row) => row.status === 'pending').length;
  }

  get importFilteredRowsCount(): number {
    return this.getFilteredImportRows().length;
  }

  get canStartImportCommit(): boolean {
    return (
      !!this.importRows.length &&
      this.importReadyCount > 0 &&
      this.importErrorCount === 0 &&
      this.importDuplicateCount === 0 &&
      this.importPendingCount === 0 &&
      !this.importValidationInProgress &&
      !this.importCommitInProgress
    );
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      kind: [ClientKind.PERSON, Validators.required],
      tradeName: [''],
      documentTypeId: [null, Validators.required],
      documentNumber: ['', [Validators.required, Validators.pattern(this.documentNumberPattern)]],
      email: ['', Validators.email],
      phone: ['', [e164PhoneValidator({ required: true })]],
      phoneCountry: [DEFAULT_PHONE_COUNTRY],
      phoneNationalNumber: [''],
      contactName: [''],
      contactEmail: ['', Validators.email],
      contactPhone: [''],
      contactPhoneCountry: [DEFAULT_PHONE_COUNTRY],
      contactPhoneNationalNumber: [''],
      address: [''],
      city: [''],
      country: [''],
    });
  }

  private createContactsDrawerForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', Validators.email],
      phone: ['', [e164PhoneValidator({ required: true })]],
      phoneCountry: [DEFAULT_PHONE_COUNTRY],
      phoneNationalNumber: [''],
      isPrimary: [false],
    });
  }

  private observeDocumentTypeChanges(): void {
    this.partnerForm.get('documentTypeId')?.valueChanges.subscribe((value) => {
      const docTypeId = Number(value);
      const docType = this.documentTypes.find((item) => Number(item.id) === docTypeId);
      this.documentDigitsHint = docType?.digits ?? null;
      this.partnerForm
        .get('kind')
        ?.setValue(this.inferClientKindFromDocumentTypeId(docTypeId), { emitEvent: false });
      this.updateDocumentNumberValidators(this.documentDigitsHint);
      this.syncClientKindValidation();
      this.enforceDocumentNumberLength();
    });
  }

  private inferClientKindFromDocumentTypeId(documentTypeId: number | null | undefined): ClientKind {
    const docType = this.documentTypes.find((item) => Number(item.id) === Number(documentTypeId));
    if (docType?.kind === ClientKind.COMPANY) {
      return ClientKind.COMPANY;
    }
    if (docType?.kind === ClientKind.PERSON) {
      return ClientKind.PERSON;
    }
    const normalizedName = String(docType?.name ?? '').toUpperCase();
    if (normalizedName.includes('RUC') || Number(docType?.digits) === 11) {
      return ClientKind.COMPANY;
    }
    return ClientKind.PERSON;
  }

  isCompanyClientFlow(): boolean {
    return this.partnerForm.get('kind')?.value === ClientKind.COMPANY;
  }

  canManageContacts(partner: ClientResponse): boolean {
    const inferredKind =
      partner.kind ?? this.inferClientKindFromDocumentTypeId(partner.documentTypeId);
    return inferredKind === ClientKind.COMPANY;
  }

  private syncClientKindValidation(): void {
    const isCompany = this.isCompanyClientFlow();
    const phoneControl = this.partnerForm.get('phone');
    const emailControl = this.partnerForm.get('email');
    const contactNameControl = this.partnerForm.get('contactName');
    const contactEmailControl = this.partnerForm.get('contactEmail');
    const contactPhoneControl = this.partnerForm.get('contactPhone');

    if (isCompany) {
      phoneControl?.setValidators([e164PhoneValidator({ required: false })]);
      emailControl?.setValidators([Validators.email]);
      contactNameControl?.setValidators([Validators.required]);
      contactEmailControl?.setValidators([Validators.email]);
      contactPhoneControl?.setValidators([e164PhoneValidator({ required: true })]);
    } else {
      phoneControl?.setValidators([e164PhoneValidator({ required: true })]);
      emailControl?.setValidators([Validators.email]);
      contactNameControl?.clearValidators();
      contactEmailControl?.setValidators([Validators.email]);
      contactPhoneControl?.clearValidators();
      contactNameControl?.setValue('', { emitEvent: false });
      contactEmailControl?.setValue('', { emitEvent: false });
      this.patchPhoneControls(this.partnerForm, 'contactPhone', '', { emitEvent: false });
    }

    phoneControl?.updateValueAndValidity({ emitEvent: false });
    emailControl?.updateValueAndValidity({ emitEvent: false });
    contactNameControl?.updateValueAndValidity({ emitEvent: false });
    contactEmailControl?.updateValueAndValidity({ emitEvent: false });
    contactPhoneControl?.updateValueAndValidity({ emitEvent: false });
  }

  onDocumentNumberInput(): void {
    this.enforceDocumentNumberLength();
  }

  private enforceDocumentNumberLength(): void {
    const control = this.partnerForm.get('documentNumber');
    const rawValue = String(control?.value ?? '');
    if (!control) {
      return;
    }

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
    if (!control) {
      return;
    }

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
        const currentDocTypeId = Number(this.partnerForm.get('documentTypeId')?.value);
        if (currentDocTypeId) {
          const currentDocType = this.documentTypes.find(
            (item) => Number(item.id) === currentDocTypeId,
          );
          this.documentDigitsHint = currentDocType?.digits ?? null;
          this.updateDocumentNumberValidators(this.documentDigitsHint);
        }
      },
      error: (err) => {
        console.error('Error fetching document types', err);
      },
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

    if (this.searchTerm.trim()) {
      params['search'] = this.searchTerm.trim();
    }

    if (this.documentTypeFilter !== 'all') {
      params['documentTypeId'] = Number(this.documentTypeFilter);
    }

    this.clientsApi.findAll(params).subscribe({
      next: (response: PaginatedResponse<ClientResponse>) => {
        this.partners = (response.data ?? []).map((partner) => ({
          ...this.normalizeClientResponse(partner),
          isClient: !!partner.isClient,
          isSupplier: !!partner.isSupplier,
        }));
        this.visiblePartners = [...this.partners];
        this.totalItems = Number(response.total ?? this.partners.length);
        this.itemsPerPage = Number(response.limit ?? this.itemsPerPage);
        this.currentPage = Number(response.page ?? this.currentPage);
        this.updatePagination();
        this.selectedPartnerIds = [];
      },
      error: (err) => {
        console.error('Error fetching clients', err);
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

  refreshData(): void {
    this.fetchPartners();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchPartners();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.selectedPartnerIds = [];
    this.fetchPartners();
  }

  onDocumentTypeFilterChange(): void {
    this.currentPage = 1;
    this.selectedPartnerIds = [];
    this.fetchPartners();
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
      this.fetchPartners();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchPartners();
    }
  }

  toggleSelect(partnerId: number | string): void {
    const id = Number(partnerId);
    const index = this.selectedPartnerIds.indexOf(id);
    if (index > -1) {
      this.selectedPartnerIds.splice(index, 1);
    } else {
      this.selectedPartnerIds.push(id);
    }
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedPartnerIds = [];
    } else {
      this.selectedPartnerIds = this.visiblePartners.map((partner) => Number(partner.id));
    }
  }

  isSelected(partnerId: number): boolean {
    return this.selectedPartnerIds.includes(Number(partnerId));
  }

  isAllSelected(): boolean {
    return (
      this.visiblePartners.length > 0 &&
      this.selectedPartnerIds.length === this.visiblePartners.length
    );
  }

  isIndeterminate(): boolean {
    return (
      this.selectedPartnerIds.length > 0 &&
      this.selectedPartnerIds.length < this.visiblePartners.length
    );
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentPartner = null;
    this.partnerForm.reset({
      name: '',
      kind: ClientKind.PERSON,
      tradeName: '',
      documentTypeId: null,
      documentNumber: '',
      email: '',
      phone: '',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '',
      address: '',
      city: '',
      country: '',
    });
    this.documentDigitsHint = null;
    this.showModal = true;
  }

  openEditModal(partner: ClientResponse): void {
    this.isEditMode = true;
    this.currentPartner = partner;
    const editContactSeed = this.getEditContactSeed(partner);
    const companyPhoneSeed = String(partner.phone ?? '').trim();
    this.partnerForm.patchValue({
      name: partner.name,
      kind: partner.kind ?? this.inferClientKindFromDocumentTypeId(Number(partner.documentTypeId)),
      tradeName: partner.tradeName ?? '',
      documentTypeId: Number(partner.documentTypeId),
      documentNumber: partner.documentNumber,
      email: partner.email ?? '',
      phone: companyPhoneSeed,
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '',
      contactName: editContactSeed.name,
      contactEmail: editContactSeed.email,
      contactPhone: editContactSeed.phone,
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '',
      address: partner.address ?? '',
      city: partner.city ?? '',
      country: partner.country ?? '',
    });
    this.patchPhoneControls(this.partnerForm, 'phone', companyPhoneSeed, { emitEvent: false });
    this.patchPhoneControls(this.partnerForm, 'contactPhone', editContactSeed.phone, {
      emitEvent: false,
    });
    const docType = this.documentTypes.find(
      (item) => Number(item.id) === Number(partner.documentTypeId),
    );
    this.documentDigitsHint = docType?.digits ?? null;
    this.updateDocumentNumberValidators(this.documentDigitsHint);
    this.syncClientKindValidation();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.partnerForm.reset();
    this.currentPartner = null;
    this.documentDigitsHint = null;
  }

  openContactsDrawer(partner: ClientResponse): void {
    if (!this.canManageContacts(partner)) {
      return;
    }
    this.contactsDrawerClient = this.normalizeClientResponse({
      ...partner,
      contacts: this.getSortedContacts(partner.contacts ?? []),
    } as ClientResponse);
    this.contactsDrawerForm.reset({
      name: '',
      email: '',
      phone: '',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '',
      isPrimary: !this.getDrawerContacts().length,
    });
    this.showContactsDrawer = true;
  }

  closeContactsDrawer(): void {
    this.showContactsDrawer = false;
    this.contactsDrawerClient = null;
    this.contactsDrawerForm.reset({
      name: '',
      email: '',
      phone: '',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '',
      isPrimary: false,
    });
  }

  getDrawerContacts(): ClientContactResponse[] {
    return this.getSortedContacts(this.contactsDrawerClient?.contacts ?? []);
  }

  saveDrawerContact(): void {
    if (!this.contactsDrawerClient) {
      return;
    }
    this.syncPhoneControls(this.contactsDrawerForm, 'phone');
    if (this.contactsDrawerForm.invalid) {
      this.contactsDrawerForm.markAllAsTouched();
      return;
    }

    const formValue = this.contactsDrawerForm.getRawValue();
    const existingContacts = this.getDrawerContacts().map((contact) => ({
      id: Number(contact.id),
      name: String(contact.name ?? '').trim(),
      email: String(contact.email ?? '').trim() || null,
      phone: this.normalizeOptionalPhone(contact.phone),
      isPrimary: !!contact.isPrimary,
      isActive: contact.isActive ?? true,
    }));

    const shouldBePrimary = !!formValue.isPrimary || existingContacts.length === 0;
    const nextContacts: ClientContactRequest[] = [
      ...existingContacts.map((contact) => ({
        ...contact,
        isPrimary: shouldBePrimary ? false : contact.isPrimary,
      })),
      {
        name: String(formValue.name ?? '').trim(),
        email: String(formValue.email ?? '').trim() || null,
        phone: this.normalizeOptionalPhone(formValue.phone),
        isPrimary: shouldBePrimary,
        isActive: true,
      },
    ];

    this.persistDrawerContacts(nextContacts, 'Contacto agregado correctamente.');
  }

  setDrawerPrimaryContact(contactId: number): void {
    if (!this.contactsDrawerClient) {
      return;
    }

    const nextContacts: ClientContactRequest[] = this.getDrawerContacts().map((contact) => ({
      id: Number(contact.id),
      name: String(contact.name ?? '').trim(),
      email: String(contact.email ?? '').trim() || null,
      phone: this.normalizeOptionalPhone(contact.phone),
      isPrimary: Number(contact.id) === Number(contactId),
      isActive: contact.isActive ?? true,
    }));

    this.persistDrawerContacts(nextContacts, 'Contacto principal actualizado correctamente.');
  }

  private persistDrawerContacts(contacts: ClientContactRequest[], successMessage: string): void {
    const targetClient = this.contactsDrawerClient;
    if (!targetClient) {
      return;
    }

    this.isSavingContactsDrawer = true;
    this.clientsApi.update(Number(targetClient.id), { contacts }).subscribe({
      next: (updatedClient) => {
        const normalized = this.normalizeClientResponse(updatedClient);
        this.applyUpdatedClient(normalized);
        this.contactsDrawerClient = normalized;
        this.contactsDrawerForm.reset({
          name: '',
          email: '',
          phone: '',
          phoneCountry: DEFAULT_PHONE_COUNTRY,
          phoneNationalNumber: '',
          isPrimary: false,
        });
        this.showMessage('success', 'fas fa-check-circle', successMessage);
      },
      error: () => {
        this.showMessage(
          'error',
          'fas fa-exclamation-circle',
          'No se pudieron guardar los contactos.',
        );
      },
      complete: () => {
        this.isSavingContactsDrawer = false;
      },
    });
  }

  private applyUpdatedClient(updatedClient: ClientResponse): void {
    this.partners = this.partners.map((partner) =>
      Number(partner.id) === Number(updatedClient.id) ? updatedClient : partner,
    );
    this.visiblePartners = this.visiblePartners.map((partner) =>
      Number(partner.id) === Number(updatedClient.id) ? updatedClient : partner,
    );
    if (this.currentPartner && Number(this.currentPartner.id) === Number(updatedClient.id)) {
      this.currentPartner = updatedClient;
    }
  }

  private getSortedContacts(contacts: ClientContactResponse[]): ClientContactResponse[] {
    return [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }

  private getPrimaryContact(
    partner: ClientResponse | null | undefined,
  ): ClientContactResponse | null {
    const contacts = this.getSortedContacts(partner?.contacts ?? []);
    return contacts.find((contact) => contact.isPrimary) ?? contacts[0] ?? null;
  }

  private getEditContactSeed(partner: ClientResponse | null | undefined): {
    name: string;
    email: string;
    phone: string;
  } {
    const primaryContact = this.getPrimaryContact(partner);
    return {
      name: String(primaryContact?.name ?? partner?.name ?? '').trim(),
      email: String(primaryContact?.email ?? partner?.email ?? '').trim(),
      phone: String(primaryContact?.phone ?? partner?.phone ?? '').trim(),
    };
  }

  private normalizeClientResponse(partner: ClientResponse): ClientResponse {
    return {
      ...partner,
      id: Number(partner.id),
      companyId: Number(partner.companyId),
      documentTypeId: Number(partner.documentTypeId),
      contacts: this.getSortedContacts(
        (partner.contacts ?? []).map((contact) => ({
          ...contact,
          id: Number(contact.id),
          clientId: Number(contact.clientId),
        })),
      ),
    };
  }

  private normalizeOptionalPhone(value: unknown): string | null {
    return normalizePhoneToE164(value) ?? null;
  }

  private buildPhoneControlsValue(value: unknown): {
    country: PhoneCountry;
    nationalNumber: string;
    e164: string;
  } {
    const parsed = parseStoredPhoneToFormValue(value);
    return {
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
      e164: parsed.e164 ?? '',
    };
  }

  private patchPhoneControls(
    form: FormGroup,
    baseControlName: 'phone' | 'contactPhone',
    value: unknown,
    options?: { emitEvent?: boolean },
  ): void {
    const phoneValue = this.buildPhoneControlsValue(value);
    form.patchValue(
      {
        [baseControlName]: phoneValue.e164,
        [`${baseControlName}Country`]: phoneValue.country,
        [`${baseControlName}NationalNumber`]: phoneValue.nationalNumber,
      },
      options,
    );
  }

  private syncPhoneControls(form: FormGroup, baseControlName: 'phone' | 'contactPhone'): void {
    const parsed = buildPhoneFormValue(
      form.get(`${baseControlName}Country`)?.value,
      form.get(`${baseControlName}NationalNumber`)?.value,
    );
    form
      .get(baseControlName)
      ?.setValue(!parsed.nationalNumber ? '' : (parsed.e164 ?? invalidPhoneSentinel()), {
        emitEvent: false,
      });
    form.get(baseControlName)?.updateValueAndValidity({ emitEvent: false });
  }

  private buildSavePayload(): ClientSaveRequest {
    const formValue = this.partnerForm.value;
    const kind =
      (formValue.kind as ClientKind | null | undefined) ??
      this.inferClientKindFromDocumentTypeId(formValue.documentTypeId);
    const basePayload: ClientSaveRequest = {
      companyId: this.companyId ?? undefined,
      name: String(formValue.name).trim(),
      kind,
      tradeName: formValue.tradeName ? String(formValue.tradeName).trim() : undefined,
      documentTypeId: Number(formValue.documentTypeId),
      documentNumber: String(formValue.documentNumber).trim(),
      address: formValue.address ? String(formValue.address).trim() : undefined,
      city: formValue.city ? String(formValue.city).trim() : undefined,
      country: formValue.country ? String(formValue.country).trim() : undefined,
    };

    if (kind === ClientKind.COMPANY) {
      const firstContact: ClientContactRequest = {
        name: String(formValue.contactName ?? '').trim(),
        email: String(formValue.contactEmail ?? '').trim() || null,
        phone: this.normalizeOptionalPhone(formValue.contactPhone),
        isPrimary: true,
        isActive: true,
      };

      return {
        ...basePayload,
        email: formValue.email ? String(formValue.email).trim() : null,
        phone: this.normalizeOptionalPhone(formValue.phone),
        contacts: [firstContact],
      };
    }

    return {
      ...basePayload,
      email: formValue.email ? String(formValue.email).trim() : undefined,
      phone: this.normalizeOptionalPhone(formValue.phone) ?? undefined,
      contacts: [],
    };
  }

  private buildUpdatePayload(): ClientUpdateRequest {
    const payload = this.buildSavePayload();
    if (this.currentPartner) {
      delete payload.companyId;
    }
    return payload;
  }

  private markFormAsTouched(): void {
    Object.keys(this.partnerForm.controls).forEach((key) => {
      this.partnerForm.get(key)?.markAsTouched();
    });
  }

  savePartner(): void {
    this.syncPhoneControls(this.partnerForm, 'phone');
    this.syncPhoneControls(this.partnerForm, 'contactPhone');
    if (this.partnerForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    const request$ =
      this.isEditMode && this.currentPartner
        ? this.clientsApi.update(Number(this.currentPartner.id), this.buildUpdatePayload())
        : this.clientsApi.create(this.buildSavePayload());

    request$.subscribe({
      next: () => {
        this.isEditMode
          ? this.showMessage('success', 'fas fa-check-circle', 'Cliente actualizado correctamente!')
          : this.showMessage('success', 'fas fa-check-circle', 'Cliente creado correctamente!');
        this.closeModal();
        this.fetchPartners();
      },
      error: (err) => {
        if (!this.isEditMode && err?.status === 409) {
          const deleted = !!err?.error?.deleted;
          const candidate = err?.error?.data as ClientResponse | undefined;
          if (deleted && candidate) {
            this.openRestoreSuggestion(candidate);
            return;
          }
          const docTypeId = Number(this.partnerForm.get('documentTypeId')?.value);
          const docNumber = String(this.partnerForm.get('documentNumber')?.value ?? '').trim();
          const docTypeName = this.getDocTypeName(docTypeId);
          this.showMessage(
            'error',
            'fas fa-exclamation-circle',
            `No se pudo crear el cliente porque el documento ${docTypeName} - ${docNumber} ya existe!`,
          );
          return;
        }
        this.isEditMode
          ? this.showMessage(
              'error',
              'fas fa-exclamation-circle',
              'No se pudo actualizar el cliente!',
            )
          : this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo crear el cliente!');
      },
    });
  }

  confirmDelete(partner: ClientResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas eliminar al cliente "${partner.name}"?`;
    this.confirmAction = () => this.deletePartner(partner.id);
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmBulkDelete(): void {
    const count = this.selectedPartnerIds.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Estás seguro de que deseas eliminar ${count} cliente${count > 1 ? 's' : ''}?`;
    this.confirmAction = () => this.deleteBulkPartners();
    this.confirmModalMode = 'delete';
    this.showConfirmModal = true;
  }

  confirmRestore(partner: ClientResponse): void {
    this.confirmMessage = `¿Estás seguro de que deseas restaurar al cliente "${partner.name}"?`;
    this.confirmAction = () => this.restorePartner(partner.id);
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  confirmBulkRestore(): void {
    const count = this.selectedPartnerIds.length;
    if (!count) {
      return;
    }
    this.confirmMessage = `¿Estás seguro de que deseas restaurar ${count} cliente${count > 1 ? 's' : ''}?`;
    this.confirmAction = () => this.restoreBulkPartners();
    this.confirmModalMode = 'restore';
    this.showConfirmModal = true;
  }

  private deletePartner(partnerId: number | string): void {
    const id = Number(partnerId);
    this.clientsApi.remove(id).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Cliente eliminado correctamente!');
        this.fetchPartners();
      },
      error: (err) => {
        console.error('Error deleting client', err);
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo eliminar el cliente!');
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private deleteBulkPartners(): void {
    if (!this.selectedPartnerIds.length) {
      return;
    }

    const ids = this.selectedPartnerIds.map((value) => Number(value));

    this.clientsApi.bulkSoftDelete(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Clientes eliminados correctamente!');
        this.fetchPartners();
      },
      error: (err) => {
        console.error('Error deleting clients', err);
        this.showMessage(
          'error',
          'fas fa-exclamation-circle',
          'No se pudieron eliminar los clientes!',
        );
      },
      complete: () => {
        this.closeConfirmModal();
      },
    });
  }

  private restorePartner(partnerId: number | string): void {
    this.restorePartnerWithOptions(partnerId);
  }

  private restorePartnerWithOptions(
    partnerId: number | string,
    options?: { onSuccess?: () => void; closeConfirm?: boolean },
  ): void {
    const id = Number(partnerId);
    const closeConfirm = options?.closeConfirm ?? true;
    const onSuccess = options?.onSuccess;

    this.clientsApi.restore(id).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Cliente restaurado correctamente!');
        this.fetchPartners();
        onSuccess?.();
      },
      error: (err) => {
        console.error('Error restoring client', err);
        this.showMessage('error', 'fas fa-exclamation-circle', 'No se pudo restaurar el cliente!');
      },
      complete: () => {
        if (closeConfirm) {
          this.closeConfirmModal();
        }
      },
    });
  }

  private restoreBulkPartners(): void {
    if (!this.selectedPartnerIds.length) {
      return;
    }

    const ids = this.selectedPartnerIds.map((value) => Number(value));

    this.clientsApi.bulkRestore(ids).subscribe({
      next: () => {
        this.showMessage('success', 'fas fa-check-circle', 'Clientes restaurados correctamente!');
        this.fetchPartners();
      },
      error: (err) => {
        console.error('Error restoring clients', err);
        this.showMessage(
          'error',
          'fas fa-exclamation-circle',
          'No se pudieron restaurar los clientes!',
        );
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

  getDocTypeName(documentTypeId: number): string {
    const docType = this.documentTypes.find((item) => Number(item.id) === Number(documentTypeId));
    return docType?.name ?? documentTypeId.toString();
  }

  getRoleLabels(_partner?: ClientResponse): string {
    return 'Cliente';
  }

  openImportModal(): void {
    this.resetImportState();
    this.showImportModal = true;
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.resetImportState();
  }

  private resetImportState(): void {
    this.importStep = 1;
    this.importFileName = '';
    this.importRows = [];
    this.visibleImportRows = [];
    this.selectedImportRowIds = [];
    this.importCurrentPage = 1;
    this.importTotalPages = 1;
    this.importSearchTerm = '';
    this.importStatusFilter = 'all';
    this.importValidationInProgress = false;
    this.importValidationProgress = 0;
    this.importValidationSummary = '';
    this.importCommitInProgress = false;
    this.importCommitProgress = 0;
    this.importCommitSummary = null;
    this.importFileError = '';
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.importFileError = '';
    this.importFileName = file.name;
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const workbook = XLSX.read(reader.result, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
          header: 1,
          defval: '',
          blankrows: false,
          raw: false,
        });

        const previewRows = this.buildImportRowsFromSheet(rows);
        if (!previewRows.length) {
          this.importFileError = 'No encontramos filas de datos válidas en el archivo.';
          return;
        }

        this.importRows = previewRows;
        this.recomputeImportRows();
        this.refreshImportView();
        this.importStep = 2;
        await this.validatePendingImportRows();
      } catch (error) {
        console.error('Error parsing import file', error);
        this.importFileError =
          'No pudimos leer el archivo Excel. Revisa el formato e inténtalo de nuevo.';
      } finally {
        if (input) {
          input.value = '';
        }
      }
    };

    reader.onerror = () => {
      this.importFileError = 'No pudimos leer el archivo seleccionado.';
      if (input) {
        input.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  }

  onImportSearch(): void {
    this.importCurrentPage = 1;
    this.refreshImportView();
  }

  onImportStatusFilterChange(): void {
    this.importCurrentPage = 1;
    this.selectedImportRowIds = [];
    this.refreshImportView();
  }

  previousImportPage(): void {
    if (this.importCurrentPage > 1) {
      this.importCurrentPage--;
      this.refreshImportView();
    }
  }

  nextImportPage(): void {
    if (this.importCurrentPage < this.importTotalPages) {
      this.importCurrentPage++;
      this.refreshImportView();
    }
  }

  toggleImportRowSelection(localId: number): void {
    const index = this.selectedImportRowIds.indexOf(localId);
    if (index > -1) {
      this.selectedImportRowIds.splice(index, 1);
    } else {
      this.selectedImportRowIds.push(localId);
    }
  }

  toggleSelectAllImportRows(): void {
    const visibleIds = this.visibleImportRows.map((row) => row.localId);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => this.selectedImportRowIds.includes(id));

    if (allSelected) {
      this.selectedImportRowIds = this.selectedImportRowIds.filter(
        (id) => !visibleIds.includes(id),
      );
      return;
    }

    const nextSelection = new Set([...this.selectedImportRowIds, ...visibleIds]);
    this.selectedImportRowIds = Array.from(nextSelection);
  }

  isImportRowSelected(localId: number): boolean {
    return this.selectedImportRowIds.includes(localId);
  }

  areAllVisibleImportRowsSelected(): boolean {
    return (
      this.visibleImportRows.length > 0 &&
      this.visibleImportRows.every((row) => this.selectedImportRowIds.includes(row.localId))
    );
  }

  onImportRowFieldChanged(
    row: ClientImportPreviewRow,
    field: keyof ClientImportPreviewRow,
    value: string | number | null,
  ): void {
    if (
      ![
        'documentTypeId',
        'documentNumber',
        'name',
        'tradeName',
        'phoneCountryCode',
        'phone',
        'address',
        'city',
        'country',
      ].includes(String(field))
    ) {
      return;
    }

    if (field === 'documentTypeId') {
      row.documentTypeId = value != null && value !== '' ? Number(value) : null;
    } else if (field === 'phoneCountryCode') {
      row.phoneCountryCode = this.normalizeImportPhoneCountryCode(String(value ?? ''));
    } else if (field === 'phone') {
      row.phone = sanitizeNationalPhoneInput(value);
    } else {
      (row as Record<string, unknown>)[field] = this.normalizeImportText(String(value ?? ''));
    }

    row.requiresServerValidation = true;
    row.duplicateExistingClientId = undefined;
    row.serverErrors = [];
    if (field === 'documentNumber' && !row.documentTypeId) {
      row.documentTypeId = this.inferDocumentTypeId(row.documentNumber);
    }
    this.recomputeImportRows();
    this.refreshImportView();
  }

  omitImportRow(row: ClientImportPreviewRow): void {
    row.isOmitted = true;
    this.recomputeImportRows();
    this.refreshImportView();
  }

  restoreImportRow(row: ClientImportPreviewRow): void {
    row.isOmitted = false;
    row.requiresServerValidation = row.localErrors.length === 0;
    this.recomputeImportRows();
    this.refreshImportView();
  }

  omitSelectedImportRows(): void {
    const selected = new Set(this.selectedImportRowIds);
    this.importRows.forEach((row) => {
      if (selected.has(row.localId)) {
        row.isOmitted = true;
      }
    });
    this.selectedImportRowIds = [];
    this.recomputeImportRows();
    this.refreshImportView();
  }

  restoreSelectedImportRows(): void {
    const selected = new Set(this.selectedImportRowIds);
    this.importRows.forEach((row) => {
      if (selected.has(row.localId)) {
        row.isOmitted = false;
        row.requiresServerValidation = row.localErrors.length === 0;
      }
    });
    this.selectedImportRowIds = [];
    this.recomputeImportRows();
    this.refreshImportView();
  }

  omitImportRowsByStatus(status: 'error' | 'duplicate' | 'pending'): void {
    this.importRows.forEach((row) => {
      if (row.status === status) {
        row.isOmitted = true;
      }
    });
    this.recomputeImportRows();
    this.refreshImportView();
  }

  restoreAllOmittedImportRows(): void {
    this.importRows.forEach((row) => {
      if (row.isOmitted) {
        row.isOmitted = false;
        row.requiresServerValidation = row.localErrors.length === 0;
      }
    });
    this.recomputeImportRows();
    this.refreshImportView();
  }

  async revalidateImportRows(): Promise<void> {
    await this.validatePendingImportRows();
  }

  async commitImportRows(): Promise<void> {
    if (!this.canStartImportCommit) {
      return;
    }

    const rowsToImport = this.importRows
      .filter((row) => row.status === 'ready')
      .map((row) => this.toImportPayloadRow(row));

    const chunkSize = 500;
    const chunks = this.chunkArray(rowsToImport, chunkSize);
    let createdCount = 0;
    let skippedCount = 0;
    const skippedRows: ClientImportCommitResponse['skippedRows'] = [];
    const failedRows: ClientImportCommitResponse['failedRows'] = [];

    this.importStep = 3;
    this.importCommitInProgress = true;
    this.importCommitProgress = 0;

    try {
      for (let index = 0; index < chunks.length; index++) {
        const response = await this.clientsApi
          .commitImport({
            companyId: this.companyId,
            rows: chunks[index],
          })
          .toPromise();

        if (response) {
          createdCount += Number(response.createdCount ?? 0);
          skippedCount += Number(response.skippedCount ?? 0);
          skippedRows.push(...(response.skippedRows ?? []));
          failedRows.push(...(response.failedRows ?? []));
        }

        this.importCommitProgress = Math.round(((index + 1) / chunks.length) * 100);
      }

      this.importCommitSummary = {
        createdCount,
        skippedCount,
        summary: {
          totalRows: rowsToImport.length,
          createdRows: createdCount,
          skippedRows: skippedRows.length,
          failedRows: failedRows.length,
        },
        skippedRows,
        failedRows,
      };

      this.showMessage(
        'success',
        'fas fa-check-circle',
        `Importación completada. Se registraron ${createdCount} cliente(s).`,
      );
      this.fetchPartners();
    } catch (error) {
      console.error('Error committing client import', error);
      this.showMessage(
        'error',
        'fas fa-exclamation-circle',
        'No pudimos completar la importación.',
      );
    } finally {
      this.importCommitInProgress = false;
    }
  }

  private restorePermissions(): void {
    this.currentUserService.restoreFromStorage();
    const user = this.currentUserService.value;
    const codes = (user?.roles ?? []).flatMap((role) => role.permissions ?? []);
    this.importUserPermissions = new Set(codes);
  }

  private buildImportRowsFromSheet(
    rawRows: (string | number | null)[][],
  ): ClientImportPreviewRow[] {
    if (!rawRows.length) {
      return [];
    }

    const headerInfo = this.findImportHeaderRow(rawRows);
    if (!headerInfo) {
      throw new Error('Missing required Excel headers');
    }

    const { headerRowIndex, indexes } = headerInfo;
    const documentNumberIndex = indexes.documentNumber;
    const legalNameIndex = indexes.legalName;
    const tradeNameIndex = indexes.tradeName;
    const documentTypeIndex = indexes.documentType;
    const phoneCountryCodeIndex = indexes.phoneCountryCode;
    const phoneIndex = indexes.phone;
    const addressIndex = indexes.address;

    return rawRows
      .slice(headerRowIndex + 1)
      .map((columns, index) => {
        const documentNumber = this.normalizeDocumentNumber(
          String(columns[documentNumberIndex] ?? ''),
        );
        const documentTypeLabel = this.normalizeImportText(
          String(documentTypeIndex >= 0 ? (columns[documentTypeIndex] ?? '') : ''),
        );
        const inferredDocumentTypeId = this.inferDocumentTypeId(documentNumber, documentTypeLabel);
        const phoneParts = this.buildImportPhoneParts(
          String(columns[phoneIndex] ?? ''),
          String(phoneCountryCodeIndex >= 0 ? (columns[phoneCountryCodeIndex] ?? '') : ''),
        );
        return {
          localId: index + 1,
          rowNumber: headerRowIndex + index + 2,
          documentTypeId: inferredDocumentTypeId,
          documentNumber,
          name: this.normalizeImportName(String(columns[legalNameIndex] ?? '')),
          tradeName: this.normalizeImportText(String(columns[tradeNameIndex] ?? '')),
          phoneCountryCode: phoneParts.phoneCountryCode,
          phone: phoneParts.phone,
          address: this.normalizeImportText(String(columns[addressIndex] ?? '')),
          city: '',
          country: '',
          localErrors: [],
          serverErrors: [],
          requiresServerValidation: true,
          isOmitted: false,
          status: 'pending',
        } satisfies ClientImportPreviewRow;
      })
      .filter((row) =>
        [
          row.documentNumber,
          row.name,
          row.tradeName,
          row.phoneCountryCode,
          row.phone,
          row.address,
        ].some((value) => !!String(value ?? '').trim()),
      );
  }

  private findImportHeaderRow(rawRows: (string | number | null)[][]): {
    headerRowIndex: number;
    indexes: {
      documentNumber: number;
      documentType: number;
      legalName: number;
      tradeName: number;
      phoneCountryCode: number;
      phone: number;
      address: number;
    };
  } | null {
    const aliasGroups = {
      documentNumber: [
        'ruc',
        'numero de ruc',
        'nro ruc',
        'nro de ruc',
        'num ruc',
        'numero documento',
        'numero de documento',
        'nro documento',
        'documento',
        'document number',
      ],
      documentType: [
        'tipo documento',
        'tipo de documento',
        'document type',
        'tipo doc',
        'doc type',
      ],
      legalName: ['razon social', 'razon_social', 'nombre', 'cliente', 'nombre o razon social'],
      tradeName: ['razon comercial', 'nombre comercial', 'trade name', 'razon_comercial'],
      phoneCountryCode: [
        'codigo pais',
        'codigo de pais',
        'cod pais',
        'country code',
        'phone country code',
        'lada',
        'prefijo',
      ],
      phone: ['celular', 'telefono', 'telefono celular', 'movil', 'mobile'],
      address: ['direccion', 'direccion fiscal', 'domicilio', 'address'],
    } as const;

    for (let rowIndex = 0; rowIndex < Math.min(rawRows.length, 10); rowIndex++) {
      const headers = (rawRows[rowIndex] ?? []).map((value) =>
        this.normalizeHeader(String(value ?? '')),
      );
      const phoneIndex =
        headers.findIndex((header) => header === 'celular') >= 0
          ? headers.findIndex((header) => header === 'celular')
          : headers.findIndex((header) => aliasGroups.phone.includes(header as never));
      const indexes = {
        documentNumber: headers.findIndex((header) =>
          aliasGroups.documentNumber.includes(header as never),
        ),
        documentType: headers.findIndex((header) =>
          aliasGroups.documentType.includes(header as never),
        ),
        legalName: headers.findIndex((header) => aliasGroups.legalName.includes(header as never)),
        tradeName: headers.findIndex((header) => aliasGroups.tradeName.includes(header as never)),
        phoneCountryCode: headers.findIndex((header) =>
          aliasGroups.phoneCountryCode.includes(header as never),
        ),
        phone: phoneIndex,
        address: headers.findIndex((header) => aliasGroups.address.includes(header as never)),
      };

      if (indexes.documentNumber >= 0 && indexes.legalName >= 0) {
        return { headerRowIndex: rowIndex, indexes };
      }
    }

    return null;
  }

  private normalizeHeader(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[.:/\\|]+/g, ' ')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private normalizeImportText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private normalizeDocumentNumber(value: string): string {
    return value.replace(/\s+/g, '').trim();
  }

  private normalizeImportPhoneCountryCode(value: string): string {
    const normalized = this.normalizeImportText(value);
    if (!normalized) {
      return DEFAULT_PHONE_COUNTRY.iso2;
    }

    return findPhoneCountry(normalized).iso2;
  }

  private buildImportPhoneParts(
    value: string,
    phoneCountryCode?: string,
  ): { phoneCountryCode: string; phone: string } {
    const normalized = this.normalizeImportText(value);
    if (!normalized) {
      return {
        phoneCountryCode: this.normalizeImportPhoneCountryCode(phoneCountryCode ?? ''),
        phone: '',
      };
    }

    if (normalized.startsWith('+')) {
      const parsed = parseStoredPhoneToFormValue(normalized);
      return {
        phoneCountryCode: parsed.country.iso2,
        phone: sanitizeNationalPhoneInput(parsed.nationalNumber),
      };
    }

    return {
      phoneCountryCode: this.normalizeImportPhoneCountryCode(phoneCountryCode ?? ''),
      phone: sanitizeNationalPhoneInput(normalized),
    };
  }

  private normalizeImportName(value: string): string {
    const normalized = this.normalizeImportText(value);
    if (!normalized) {
      return '';
    }

    const lowerCased = normalized.toLocaleLowerCase('es-PE');
    return lowerCased.replace(/\b\p{L}/gu, (match) => match.toLocaleUpperCase('es-PE'));
  }

  private inferDocumentTypeId(documentNumber: string, typeLabel?: string): number | null {
    const normalizedTypeLabel = this.normalizeHeader(typeLabel ?? '');
    if (normalizedTypeLabel) {
      const typeByName = this.documentTypes.find(
        (item) => this.normalizeHeader(item.name) === normalizedTypeLabel,
      );
      if (typeByName) {
        return Number(typeByName.id);
      }
    }

    if (!/^\d+$/.test(documentNumber)) {
      return null;
    }

    const matchingByDigits = this.documentTypes.filter(
      (item) => Number(item.digits) === documentNumber.length,
    );
    if (!matchingByDigits.length) {
      return null;
    }

    if (matchingByDigits.length === 1) {
      return Number(matchingByDigits[0].id);
    }

    const preferredByName =
      matchingByDigits.find((item) => {
        const normalizedName = this.normalizeHeader(item.name);
        return (
          (documentNumber.length === 8 && normalizedName.includes('dni')) ||
          (documentNumber.length === 9 && normalizedName.includes('ce')) ||
          (documentNumber.length === 11 && normalizedName.includes('ruc'))
        );
      }) ??
      matchingByDigits.find((item) => {
        if (documentNumber.length === 11) {
          return item.kind === ClientKind.COMPANY;
        }
        return item.kind === ClientKind.PERSON;
      });

    return preferredByName ? Number(preferredByName.id) : null;
  }

  private recomputeImportRows(): void {
    const duplicateMap = new Map<string, number>();

    for (const row of this.importRows) {
      const docTypeId = row.documentTypeId ? Number(row.documentTypeId) : null;
      row.localErrors = [];

      if (!row.documentTypeId && row.documentNumber) {
        row.documentTypeId = this.inferDocumentTypeId(row.documentNumber);
      }

      if (!row.documentNumber) {
        row.localErrors.push('Completa el número de documento.');
      } else if (!/^\d+$/.test(row.documentNumber)) {
        row.localErrors.push('El documento solo puede contener dígitos.');
      } else if (/^0+$/.test(row.documentNumber)) {
        row.localErrors.push('El número de documento no puede ser 0 ni contener solo ceros.');
      }

      if (!row.documentTypeId) {
        row.localErrors.push(
          'No pudimos inferir el tipo de documento con la configuración actual.',
        );
      } else {
        const docType = this.documentTypes.find((item) => Number(item.id) === docTypeId);
        if (!docType) {
          row.localErrors.push('El tipo de documento no existe.');
        } else if (row.documentNumber && row.documentNumber.length !== Number(docType.digits)) {
          row.localErrors.push(`El documento debe tener ${docType.digits} dígitos.`);
        }
      }

      if (!row.name) {
        row.localErrors.push('Completa la razón social o nombre del cliente.');
      }

      if (row.phone && !buildPhoneFormValue(row.phoneCountryCode, row.phone).e164) {
        row.localErrors.push('El teléfono no es válido incluso aplicando el código de país.');
      }

      const key =
        row.documentTypeId && row.documentNumber && /^\d+$/.test(row.documentNumber)
          ? `${row.documentTypeId}:${row.documentNumber}`
          : '';

      if (key) {
        duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
      }
    }

    for (const row of this.importRows) {
      const key =
        row.documentTypeId && row.documentNumber && /^\d+$/.test(row.documentNumber)
          ? `${row.documentTypeId}:${row.documentNumber}`
          : '';

      if (key && (duplicateMap.get(key) ?? 0) > 1) {
        row.localErrors.push('El documento está duplicado dentro del mismo archivo.');
      }

      if (row.localErrors.length > 0) {
        row.serverErrors = [];
        row.duplicateExistingClientId = undefined;
        row.requiresServerValidation = false;
      }

      if (row.isOmitted) {
        row.status = 'omitted';
      } else if (row.localErrors.length > 0) {
        row.status = 'error';
      } else if (row.serverErrors.length > 0) {
        row.status = row.serverErrors.some((error) => error.includes('base de datos'))
          ? 'duplicate'
          : 'error';
      } else if (row.requiresServerValidation) {
        row.status = 'pending';
      } else {
        row.status = 'ready';
      }
    }
  }

  private async validatePendingImportRows(): Promise<void> {
    const rowsToValidate = this.importRows.filter(
      (row) => !row.isOmitted && row.localErrors.length === 0 && row.requiresServerValidation,
    );

    if (!rowsToValidate.length) {
      this.importValidationSummary = 'No hay filas pendientes de revalidación.';
      return;
    }

    this.importValidationInProgress = true;
    this.importValidationProgress = 0;
    const chunkSize = 500;
    const chunks = this.chunkArray(rowsToValidate, chunkSize);
    const resultMap = new Map<number, ClientImportValidateResponse['rows'][number]>();

    try {
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const response = await this.clientsApi
          .validateImport({
            companyId: this.companyId,
            rows: chunk.map((row) => this.toImportPayloadRow(row)),
          })
          .toPromise();

        (response?.rows ?? []).forEach((row) => resultMap.set(Number(row.rowNumber), row));
        this.importValidationProgress = Math.round(((index + 1) / chunks.length) * 100);
      }

      for (const row of this.importRows) {
        if (!row.requiresServerValidation || row.isOmitted || row.localErrors.length > 0) {
          continue;
        }

        const validated = resultMap.get(row.rowNumber);
        row.serverErrors = [...(validated?.errors ?? [])];
        row.duplicateExistingClientId = validated?.duplicateExistingClientId;
        row.requiresServerValidation = false;
      }

      this.importValidationSummary = `Validación completada para ${rowsToValidate.length} fila(s).`;
    } catch (error) {
      console.error('Error validating import rows', error);
      this.importValidationSummary = 'No pudimos validar las filas contra la base de datos.';
      this.showMessage(
        'error',
        'fas fa-exclamation-circle',
        'No pudimos validar las filas del archivo.',
      );
    } finally {
      this.importValidationInProgress = false;
      this.recomputeImportRows();
      this.refreshImportView();
    }
  }

  private toImportPayloadRow(row: ClientImportPreviewRow) {
    return {
      rowNumber: row.rowNumber,
      documentTypeId: row.documentTypeId ? Number(row.documentTypeId) : undefined,
      documentNumber: row.documentNumber || undefined,
      name: row.name || undefined,
      tradeName: row.tradeName || undefined,
      phone: buildPhoneFormValue(row.phoneCountryCode, row.phone).e164 || undefined,
      address: row.address || undefined,
      city: row.city || undefined,
      country: row.country || undefined,
    };
  }

  private refreshImportView(): void {
    const filteredRows = this.getFilteredImportRows();

    this.importTotalPages = Math.max(1, Math.ceil(filteredRows.length / this.importItemsPerPage));
    if (this.importCurrentPage > this.importTotalPages) {
      this.importCurrentPage = this.importTotalPages;
    }

    const start = (this.importCurrentPage - 1) * this.importItemsPerPage;
    this.visibleImportRows = filteredRows.slice(start, start + this.importItemsPerPage);
  }

  getImportStatusLabel(status: ClientImportStatus): string {
    const labels: Record<ClientImportStatus, string> = {
      pending: 'Pendiente',
      ready: 'Lista',
      error: 'Con error',
      duplicate: 'Duplicada',
      omitted: 'Omitida',
    };

    return labels[status] ?? status;
  }

  get importEmptyStateMessage(): string {
    if (!this.importRows.length) {
      return 'Todavía no hay filas cargadas para previsualizar.';
    }

    const hasSearch = !!this.importSearchTerm.trim();
    if (this.importStatusFilter === 'all') {
      return hasSearch
        ? 'No hay filas que coincidan con la búsqueda actual.'
        : 'No hay filas para mostrar en este momento.';
    }

    const statusLabels: Record<Exclude<ImportFilterStatus, 'all'>, string> = {
      ready: 'listas',
      pending: 'pendientes',
      error: 'con error',
      duplicate: 'duplicadas',
      omitted: 'omitidas',
    };

    const statusLabel = statusLabels[this.importStatusFilter];
    return hasSearch
      ? `No hay filas ${statusLabel} que coincidan con la búsqueda actual.`
      : `No hay filas ${statusLabel}.`;
  }

  private getFilteredImportRows(): ClientImportPreviewRow[] {
    return this.importRows.filter((row) => {
      if (this.importStatusFilter !== 'all' && row.status !== this.importStatusFilter) {
        return false;
      }

      const term = this.importSearchTerm.trim().toLocaleLowerCase('es-PE');
      if (!term) {
        return true;
      }

      return [
        row.documentNumber,
        row.name,
        row.tradeName,
        row.phoneCountryCode,
        row.phone,
        row.address,
      ]
        .join(' ')
        .toLocaleLowerCase('es-PE')
        .includes(term);
    });
  }

  private chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
      chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
  }

  openRestoreSuggestion(data: ClientResponse): void {
    const docTypeId = Number(data.documentTypeId ?? data.documentType?.id ?? 0);
    this.restoreSuggestionData = {
      ...data,
      id: Number(data.id),
      companyId: Number(data.companyId),
      documentTypeId: docTypeId,
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
    this.restorePartnerWithOptions(id, {
      closeConfirm: false,
      onSuccess: () => {
        this.closeModal();
      },
    });
    this.restoreSuggestionData = null;
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
}
