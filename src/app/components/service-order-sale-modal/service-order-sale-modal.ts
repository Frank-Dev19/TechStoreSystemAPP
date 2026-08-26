import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { ClientKind, ClientSaveRequest } from '../../models/clients-request';
import { ClientResponse } from '../../models/clients-response';
import { DocumentTypeResponse } from '../../models/document-types/document-types-response';
import { DocumentType, PaymentMethod } from '../../models/sales/enums';
import { Sale } from '../../models/sales/sale.model';
import { ServiceOrder } from '../../models/service-orders/service-order';
import { ClientsApiService } from '../../services/clients-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { SalesApiService } from '../../services/sales/sales-api.service';

interface TaxpayerRegistrationDraft {
  name: string;
  documentTypeId: number | null;
  documentNumber: string;
  address: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-service-order-sale-modal',
  standalone: false,
  templateUrl: './service-order-sale-modal.html',
  styleUrls: ['./service-order-sale-modal.scss'],
})
export class ServiceOrderSaleModalComponent implements OnInit {
  @Input({ required: true }) order!: ServiceOrder;
  @Input() companyId = 1;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saleCreated = new EventEmitter<Sale>();

  readonly documentTypeOptions = [
    { value: DocumentType.BOLETA, label: 'Boleta' },
    { value: DocumentType.FACTURA, label: 'Factura' },
  ];
  readonly paymentOptions = [
    { value: PaymentMethod.CASH, label: 'Efectivo' },
    { value: PaymentMethod.CARD, label: 'Tarjeta' },
    { value: PaymentMethod.TRANSFER, label: 'Transferencia' },
    { value: PaymentMethod.YAPE, label: 'Yape' },
    { value: PaymentMethod.PLIN, label: 'Plin' },
    { value: PaymentMethod.CREDIT, label: 'Crédito' },
  ];

  documentType = DocumentType.BOLETA;
  paymentMethod = PaymentMethod.CASH;
  taxpayerSearchText = '';
  selectedTaxpayer: ClientResponse | null = null;
  documentTypes: DocumentTypeResponse[] = [];
  paymentReference = '';
  bankName = '';
  cardType = '';
  errorMessage = '';
  successMessage = '';
  isSearching = false;
  isRegistering = false;
  isSubmitting = false;
  showRegistration = false;
  registrationDraft: TaxpayerRegistrationDraft = this.emptyRegistrationDraft();

  private initialized = false;

  constructor(
    private readonly clientsApi: ClientsApiService,
    private readonly documentTypesApi: DocumentTypesApiService,
    private readonly salesApi: SalesApiService,
  ) {}

  ngOnInit(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.loadDocumentTypes();
    this.loadOperationalClient();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  get saleTotal(): number {
    return Number(Number(this.order?.montoComprometidoVigente ?? 0).toFixed(2));
  }

  get equipmentCount(): number {
    return this.order?.items?.length || 1;
  }

  get requiresReference(): boolean {
    return [PaymentMethod.CARD, PaymentMethod.TRANSFER, PaymentMethod.YAPE, PaymentMethod.PLIN]
      .includes(this.paymentMethod);
  }

  get requiresBank(): boolean {
    return [PaymentMethod.CARD, PaymentMethod.TRANSFER].includes(this.paymentMethod);
  }

  get requiresCardType(): boolean {
    return this.paymentMethod === PaymentMethod.CARD;
  }

  close(): void {
    if (!this.isSubmitting) this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  searchTaxpayer(): void {
    const documentNumber = this.taxpayerSearchText.replace(/\D+/g, '');
    this.errorMessage = '';
    this.successMessage = '';
    if (!documentNumber) {
      this.errorMessage = 'Ingresa el DNI o RUC del contribuyente.';
      return;
    }

    this.isSearching = true;
    this.clientsApi.findAll({ companyId: this.companyId, documentNumber, limit: 1 })
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: ({ data }) => {
          const taxpayer = data?.[0] ?? null;
          if (taxpayer) {
            this.selectTaxpayer(taxpayer);
            this.successMessage = 'Contribuyente seleccionado.';
            return;
          }

          this.selectedTaxpayer = null;
          this.showRegistration = true;
          this.registrationDraft = {
            ...this.emptyRegistrationDraft(),
            documentNumber,
            documentTypeId: this.inferDocumentTypeId(documentNumber),
          };
          this.errorMessage = 'No encontramos el documento. Completa los datos para registrar al contribuyente.';
        },
        error: () => {
          this.selectedTaxpayer = null;
          this.errorMessage = 'No pudimos buscar al contribuyente.';
        },
      });
  }

  selectTaxpayer(taxpayer: ClientResponse): void {
    this.selectedTaxpayer = taxpayer;
    this.taxpayerSearchText = taxpayer.documentNumber;
    this.showRegistration = false;
    this.errorMessage = '';
    this.validateSelectedTaxpayer();
  }

  clearTaxpayer(): void {
    this.selectedTaxpayer = null;
    this.taxpayerSearchText = '';
    this.successMessage = '';
  }

  registerTaxpayer(): void {
    this.errorMessage = '';
    const draft = this.registrationDraft;
    const documentNumber = draft.documentNumber.replace(/\D+/g, '');
    const documentType = this.documentTypes.find((item) => Number(item.id) === Number(draft.documentTypeId));

    if (!draft.name.trim() || !documentType || !documentNumber) {
      this.errorMessage = 'Completa el nombre, tipo y número de documento.';
      return;
    }
    if (documentType.digits && documentNumber.length !== Number(documentType.digits)) {
      this.errorMessage = `El documento debe tener ${documentType.digits} dígitos.`;
      return;
    }

    const payload: ClientSaveRequest = {
      companyId: this.companyId,
      name: draft.name.trim(),
      kind: documentType.kind === 'COMPANY' ? ClientKind.COMPANY : ClientKind.PERSON,
      documentTypeId: Number(documentType.id),
      documentNumber,
      address: draft.address.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      isClient: true,
    };

    this.isRegistering = true;
    this.clientsApi.create(payload)
      .pipe(finalize(() => (this.isRegistering = false)))
      .subscribe({
        next: (created) => {
          this.selectTaxpayer(created);
          this.successMessage = 'Contribuyente registrado y seleccionado.';
        },
        error: (error) => {
          this.errorMessage = this.resolveApiMessage(error, 'No pudimos registrar al contribuyente.');
        },
      });
  }

  onDocumentTypeChange(): void {
    this.errorMessage = '';
    this.validateSelectedTaxpayer();
  }

  confirmSale(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.selectedTaxpayer) {
      this.errorMessage = 'Selecciona el contribuyente que figurará en el comprobante.';
      return;
    }
    if (!this.validateSelectedTaxpayer()) return;
    if (this.saleTotal <= 0) {
      this.errorMessage = 'La orden no tiene un importe pendiente válido para facturar.';
      return;
    }

    const payment = {
      method: this.paymentMethod,
      amount: this.saleTotal,
      reference: this.paymentReference.trim() || undefined,
      bankName: this.resolveBankName(),
      cardType: this.requiresCardType ? this.cardType || undefined : undefined,
    };

    this.isSubmitting = true;
    this.salesApi.createFromServiceAgreements({
      companyId: this.companyId,
      serviceOrderIds: [Number(this.order.id)],
      taxpayerCustomerId: Number(this.selectedTaxpayer.id),
      documentType: this.documentType,
      issueDate: this.getToday(),
      observations: `Venta desde orden ${this.order.code}`,
      payments: [payment],
    })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (sale) => this.saleCreated.emit(sale),
        error: (error) => {
          this.errorMessage = this.resolveApiMessage(error, 'No pudimos registrar la venta.');
        },
      });
  }

  private loadOperationalClient(): void {
    const clientId = Number(this.order?.clientId ?? 0);
    if (!clientId) return;
    this.clientsApi.findOne(clientId).subscribe({
      next: (client) => this.selectTaxpayer(client),
      error: () => undefined,
    });
  }

  private loadDocumentTypes(): void {
    this.documentTypesApi.findAll({ page: 1, limit: 50 }).subscribe({
      next: ({ data }) => (this.documentTypes = data ?? []),
      error: () => (this.documentTypes = []),
    });
  }

  private validateSelectedTaxpayer(): boolean {
    if (this.documentType !== DocumentType.FACTURA || !this.selectedTaxpayer) return true;
    const documentNumber = this.selectedTaxpayer.documentNumber.replace(/\D+/g, '');
    const selectedDocumentType = this.documentTypes.find(
      (item) => Number(item.id) === Number(this.selectedTaxpayer?.documentTypeId),
    );
    const isRuc = selectedDocumentType?.sunatCode === '6' || documentNumber.length === 11;
    if (isRuc) return true;
    this.errorMessage = 'Una factura requiere un contribuyente con RUC.';
    return false;
  }

  private inferDocumentTypeId(documentNumber: string): number | null {
    const digits = documentNumber.length;
    return this.documentTypes.find((item) => Number(item.digits) === digits)?.id ?? null;
  }

  private resolveBankName(): string | undefined {
    if (this.paymentMethod === PaymentMethod.YAPE) return 'BCP';
    if (this.paymentMethod === PaymentMethod.PLIN) return 'BBVA';
    return this.requiresBank ? this.bankName.trim() || undefined : undefined;
  }

  private resolveApiMessage(error: any, fallback: string): string {
    const raw = error?.error?.message;
    if (Array.isArray(raw)) return raw.join(' ');
    return typeof raw === 'string' && raw.trim() ? raw : fallback;
  }

  private getToday(): string {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }

  private emptyRegistrationDraft(): TaxpayerRegistrationDraft {
    return {
      name: '',
      documentTypeId: null,
      documentNumber: '',
      address: '',
      email: '',
      phone: '',
    };
  }
}
