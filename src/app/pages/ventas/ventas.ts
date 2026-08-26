import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { DocumentSeriesApiService } from '../../services/sales/document-series-api.service';
import { ProductsApiService } from '../../services/products-api.service';
import { catchError, forkJoin, lastValueFrom, of } from 'rxjs';
import { CashFlowApiService } from '../../services/sales/cash-flow-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { PricingStockApiService } from '../../services/pricing-stock-api.service';
import { ProductPriceStockInfo } from '../../models/pricing/product-price-stock-info.model';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { StockService } from '../../services/inventory/stock.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DocumentTypeResponse } from '../../models/document-types/document-types-response';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { CurrentUserService } from '../../services/current-user.service';
import { PriceCalculation } from '../../models/pricing/pricing.models';
import { DocumentSeries, CreateDocumentSeriesDto, UpdateDocumentSeriesDto } from '../../models/sales/document-series.model';
import { DocumentType } from '../../models/sales/enums';
import { ClientKind, ClientSaveRequest } from '../../models/clients-request';
import { ClientResponse } from '../../models/clients-response';
import { ElectronicBillingApiService } from '../../services/electronic-billing/electronic-billing-api.service';
import { ElectronicDocument, ElectronicDocumentStatus } from '../../models/electronic-billing/electronic-document.model';
// ============================================
// INTERFACES & TYPES (siguiendo exactamente el prompt)
// ============================================

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  categoryId: number
  baseUnitId: number
  isSerialized: boolean
  managesExpiration: boolean
  minStock: number
  maxStock: number
  reorderPoint: number
  salePrice: number
  stock: number
}

export interface StockLine {
  id: number
  productId: number
  lotId?: number | null
  qtyOnHand: number
  avgUnitCost: number
  totalCost: number
}

type NewCustomerForm = Partial<ClientSaveRequest> & {
  documentTypeId?: number | null
}

export type DocumentTypeCode = 'BOLETA' | 'FACTURA'
// PAYMENT TYPES - Frontend values
export type PaymentType = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'YAPE' | 'PLIN'

// Payment Method mapping (Frontend -> Backend)
const paymentMethodMap: { [key: string]: string } = {
  'EFECTIVO': 'CASH',
  'TARJETA': 'CARD',
  'TRANSFERENCIA': 'TRANSFER',
  'YAPE': 'YAPE',
  'PLIN': 'PLIN',
  'CREDITO': 'CREDIT'
}

// Bank options for card and transfer
export const bankOptions = [
  { value: 'BCP', label: 'BCP' },
  { value: 'BBVA', label: 'BBVA' },
  { value: 'Interbank', label: 'Interbank' },
  { value: 'Scotiabank', label: 'Scotiabank' },
  { value: 'Falabella', label: 'Falabella' }
]

// Card type options
export const cardTypeOptions = [
  { value: 'CREDITO', label: 'Credito' },
  { value: 'DEBITO', label: 'Debito' }
]
export type SaleStatus = 'PENDIENTE' | 'EMITIDO' | 'ANULADO'

export interface SaleLine {
  itemType: 'PRODUCT' | 'SERVICE'
  productId?: number | null
  serviceId?: number | null
  productSku?: string
  productName: string
  quantity: number
  unitPrice: number
  originalUnitPrice?: number
  discountPct?: number
  lineTotal: number
  // Informacion de lote y seriales
  hasLot?: boolean
  hasSerial?: boolean
  lotId?: number | null
  lotCode?: string
  expirationDate?: string
  serials?: Array<{ serialId: number; serialCode: string }>
}

interface SaleCatalogSearchResult {
  itemType: 'PRODUCT'
  name: string
  code: string
  price: number
  stock?: number
  product?: Product
}

export interface Sale {
  id: number
  companyId: number
  customerId: number
  customer: {
    id: number
    name: string
    documentNumber: string
  }
  saleType: string
  documentType: string
  series: string
  number: string
  issueDate: string
  dueDate?: string
  baseSubtotal: number
  subtotal: number
  discountTotal: number
  taxAmount: number
  total: number
  taxRate: number
  status: string
  observations?: string
  createdBy?: string
  confirmedBy?: string
  cancelledBy?: string
  cancelledReason?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
  items: any[]
  payments: any[]
  lineDiscounts: any[]
  comboItems: any[]
}

// export interface CreateSaleDto {
//   documentType: DocumentTypeCode
//   customerId: number
//   paymentType: PaymentType
//   lines: {
//     productId: number
//     quantity: number
//     unitPrice: number
//   }[]
// }

export interface CreditNote {
  id: number
  saleId: number
  saleSeries: string
  saleNumber: string
  saleIssueDate: string
  series: string
  number: string
  issueDate: string
  currency: 'PEN' | 'USD'
  reasonCode: string
  reasonDescription: string
  customerId: number
  customerName: string
  customerDocumentType: string
  customerDocumentNumber: string
  customerAddress: string
  totalTaxableAmount: number
  totalExemptAmount: number
  totalUnaffectedAmount: number
  totalIsc: number
  totalIcbper: number
  totalDiscount: number
  totalIgv: number
  grandTotal: number
  amountInWords: string
  paymentCondition: 'CONTADO' | 'CREDITO'
  installments?: CreditNoteInstallment[]
  observations?: string | null
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED'
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

export interface CreditNoteItem {
  id: number
  creditNoteId: number
  productId: number | null
  itemCode: string
  description: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export interface CreditNoteInstallment {
  id: number
  creditNoteId: number
  installmentNumber: number
  dueDate: string
  amount: number
}

export interface ShippingGuide {
  id: number
  saleId: number | null
  relatedInvoiceSeries: string | null
  relatedInvoiceNumber: string | null
  series: string
  number: string
  issueDate: string
  deliveryDate: string
  transferReason: string
  senderRuc: string
  senderName: string
  senderAddress: string
  departureAddress: string
  arrivalAddress: string
  weightUnit: string
  totalGrossWeight: number
  totalPackages: number
  hasPlannedTransshipment: boolean
  isM1OrLVehicle: boolean
  requiresVehicleDriverRegistration: boolean
  transportMode: 'PUBLICO' | 'PRIVADO'
  carrierRuc: string | null
  carrierName: string | null
  carrierMtcCode: string | null
  driverDni: string | null
  driverName: string | null
  driverLicense: string | null
  vehicleBrand: string | null
  vehiclePlate: string | null
  observations?: string | null
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED'
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
  items: ShippingGuideItem[]
}

export interface ShippingGuideItem {
  id: number
  shippingGuideId: number
  productId: number | null
  itemCode: string
  description: string
  unitOfMeasure: string
  quantity: number
  weightKg: number
  packages: number
}

export interface CashFlowSummary {
  totalSales: number
  totalCash: number
  totalCard: number
  totalTransfer: number
  totalCredit: number
}

export interface Toast {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface SalesFilters {
  dateFrom: string
  dateTo: string
  customerId?: number
  customerName?: string
  documentType: string | null
  status: string | null
  paymentType: string | null
  search: string
  page: number
  limit: number
}

// Date filter presets
export type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'manual'

// Phase 4: Mock data service removed. All data flows through backend APIs only.


@Component({
  selector: 'app-ventas',
  standalone: false,
  templateUrl: './ventas.html',
  styleUrl: './ventas.scss'
})
export class Ventas implements OnInit {
  // Expose Math to template
  Math = Math;
  private readonly defaultSaleTaxRate = 0.18;

  constructor(
    private salesApi: SalesApiService,
    private documentSeriesApi: DocumentSeriesApiService,
    private productsApi: ProductsApiService,
    private cashFlowApi: CashFlowApiService,
    private clientsApi: ClientsApiService,
    private pricingStockApi: PricingStockApiService,
    private pricingProductsApi: PricingProductsApiService,
    private stockService: StockService,
    private documentTypesApi: DocumentTypesApiService,
    private pricingQueryApi: PricingQueryApiService,
    private currentUser: CurrentUserService,
    private electronicBillingApi: ElectronicBillingApiService,
  ) { }

  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>
  @ViewChild('quantityInput') quantityInput!: ElementRef<HTMLInputElement>


  private readonly COMPANY_ID = 1;
  // STATE
  sales: Sale[] = []
  selectedSale: Sale | null = null
  electronicDocumentsBySaleId: { [saleId: number]: ElectronicDocument | null } = {}
  selectedElectronicDocument: ElectronicDocument | null = null
  electronicBillingLoadingBySaleId: { [saleId: number]: boolean } = {}
  electronicEmailLoadingBySaleId: { [saleId: number]: boolean } = {}
  isLoading = false

  // Cache para precios y stock de productos con informacion completa
  productPriceStockMap: {
    [productId: number]: {
      stock: number;
      options: any[]; // Lista de precios disponibles
      applied: any;    // Precio actualmente aplicado
      discounts: any[]; // Descuentos activos
      priceCalc?: any;  // Resultado del motor de porcentajes
      stockByLot?: Array<{
        lotId: number;
        lotCode: string;
        quantity: number;
        expirationDate?: string;
      }>;
    }
  } = {}

  // Busqueda de productos (separado de currentSaleItem)
  productSearchText = ''

  // Tipos de documento para nuevo cliente
  documentTypesB: DocumentTypeResponse[] = []
  documentDigitsHint: number | null = null
  toasts: Toast[] = []

  // UI STATES
  activeTab: 'sales' | 'cashflow' | 'create' | 'cashbox' | 'document-series' = 'sales'
  showCreditNoteModal = false
  showDispatchGuideModal = false
  showCancelConfirmModal = false
  showLotSerialModal = false
  showElectronicInvoiceConfirmModal = false
  pendingElectronicInvoiceSale: Sale | null = null
  saleToCancel: Sale | null = null
  cancelReason: 'ERROR' | 'RETURN' = 'ERROR'
  //showDetailDrawer = false
  showNewCustomerModal = false
  newCustomerForm: NewCustomerForm = {}

  // DOCUMENT SERIES
  documentSeries: DocumentSeries[] = []
  filteredDocumentSeries: DocumentSeries[] = []
  selectedDocumentSeries: DocumentSeries | null = null
  documentSeriesForm: Partial<CreateDocumentSeriesDto> = {}
  documentSeriesEditMode = false
  documentSeriesSearchText = ''
  documentSeriesFilter: { documentType?: DocumentType; isActive?: boolean } = {}
  showDocumentSeriesForm = false


  //FORM DATA
  saleFormData: any = null
  creditNoteFormData: Partial<CreditNote> | null = null
  dispatchGuideFormData: Partial<ShippingGuide> | null = null
  currentSaleItem: any = {}
  customerSearchText = ''
  foundCustomer: ClientResponse | null = null
  selectedPaymentMethods: PaymentType[] = []

  // Control de lineas expandidas para mostrar lote/seriales
  expandedLines: Set<number> = new Set()

  // PAYMENT ADDITIONAL FIELDS
  paymentReference = ''           // Para Yape, Plin, Transferencia, Tarjeta
  paymentBankName = ''           // Para Transferencia y Tarjeta
  paymentCardType = ''           // Para Tarjeta (CREDITO o DEBITO)

  //SELECTS PARA PAGOS
  cardTypeOptions = cardTypeOptions;
  bankOptions = bankOptions;

  // PAGINATION
  currentPage = 1
  pageSize = 20
  totalItems = 0

  //PRODUCTS
  products: Product[] = []
  filteredProducts: Product[] = []
  filteredSaleItems: SaleCatalogSearchResult[] = []

  //PAGOS
  paymentOperationNumber = ''

  // FILTERS
  datePreset: DatePreset = 'last30days'
  salesFilters: SalesFilters = {
    dateFrom: this.getDateNDaysAgo(30),
    dateTo: this.getToday(),
    customerId: undefined,
    customerName: '',
    documentType: null,
    status: null,
    paymentType: null,
    search: '',
    page: 1,
    limit: 50,
  }

  // Client autocomplete
  clientSearchText = ''
  filteredClients: any[] = []
  showClientDropdown = false

  // CASH FLOW
  cashFlowEntries: any[] = []
  cashFlowFilters = { dateFrom: this.getDateNDaysAgo(30), dateTo: this.getToday(), paymentType: null as string | null }
  cashFlowMetrics = { total: 0, cash: 0, card: 0, transfer: 0, yape: 0, plin: 0, returns: 0 }
  cashFlowDatePreset: string = 'last30days'
  cashFlowPage = 1
  cashFlowLimit = 20
  cashFlowTotal = 0
  cashFlowTotalPages = 0

  // Cash Flow Box Filter
  cashFlowSelectedBox: any = null
  cashFlowBoxSearchText: string = ''
  filteredBoxes: any[] = []
  showBoxDropdown: boolean = false



  // METRICS
  metrics = { totalSales: 0, totalEmitted: 0, totalCancelled: 0, totalAmount: 0 }

  // ENUMS FOR TEMPLATES
  documentTypes: DocumentTypeCode[] = ['BOLETA', 'FACTURA']
  readonly documentSeriesTypes: DocumentType[] = [
    DocumentType.BOLETA,
    DocumentType.FACTURA,
    DocumentType.NOTA_CREDITO,
    DocumentType.NOTA_DEBITO,
    DocumentType.GUIA_REMISION,
  ];
  saleStatuses: SaleStatus[] = ['PENDIENTE', 'EMITIDO', 'ANULADO']
  paymentTypes: string[] = ['CASH', 'CARD', 'TRANSFER', 'YAPE', 'PLIN', 'CREDIT']
  paymentTypeLabels: { [key: string]: string } = {
    'CASH': 'Efectivo',
    'CARD': 'Tarjeta',
    'TRANSFER': 'Transferencia',
    'YAPE': 'Yape',
    'PLIN': 'Plin',
    'CREDIT': 'Credito'
  }

  getPaymentLabel(method?: string | null): string {
    return this.paymentTypeLabels[method || ''] || method || '-'
  }

  // UI helpers for caja (fase 1: mock, mas adelante conectaremos a backend)
  cashBoxCode: string = ''
  openingBalanceTemp: number = 0
  currentCashRegister: any = null
  showNoOpenCashModal: boolean = false

  // Income Modal
  showIncomeModal: boolean = false
  incomeForm = { amount: 0, description: '', reference: '' }

  // Phase 5: estado real de cajas desde backend
  currentOpenRegister: any = null
  registersList: any[] = []

  // Box Pagination
  boxesPage = 1
  boxesLimit = 5
  boxesTotal = 0
  boxesTotalPages = 0

  ngOnInit(): void {
    this.loadSales()
    this.productsApiGet()
    this.loadProductsPriceAndStock()
    this.loadDocumentTypes()
    this.loadOpenRegister()
    this.loadRegisters()
    this.loadDocumentSeries()
    this.loadCashFlowData()
  }
  private get currentUserName(): string {
    return this.currentUser.value?.name || 'Usuario Front';
  }

  private productsApiGet(): void {
    this.productsApi.getProducts().then(p => this.products = p as any)
  }

  private loadDocumentTypes(): void {
    this.documentTypesApi.findAll({ limit: 100 }).subscribe({
      next: (response) => {
        this.documentTypesB = (response.data ?? []).map((item: any) => ({
          ...item,
          id: Number(item.id),
          digits: Number(item.digits),
        }));
        console.log('DocumentTypes cargados:', this.documentTypesB);

        // Si hay un documentTypeId seleccionado, actualizar hint
        const currentDocTypeId = this.newCustomerForm?.documentTypeId;
        if (currentDocTypeId) {
          const currentDocType = this.documentTypesB.find((item) => Number(item.id) === Number(currentDocTypeId));
          this.documentDigitsHint = currentDocType?.digits ?? null;
        }
      },
      error: (err) => {
        console.error('Error cargando document types:', err);
        this.showToast('error', 'Error cargando tipos de documento');
      },
    });
  }

  onDocumentTypeChange(): void {
    const docTypeId = Number(this.newCustomerForm?.documentTypeId);
    const docType = this.documentTypesB.find((item) => Number(item.id) === docTypeId);
    this.documentDigitsHint = docType?.digits ?? null;

    // Validar el numero de documento actual si ya hay uno
    if (this.newCustomerForm?.documentNumber && this.documentDigitsHint) {
      this.validateDocumentNumber();
    }
  }

  validateDocumentNumber(): boolean {
    if (!this.newCustomerForm?.documentNumber || !this.documentDigitsHint) {
      return true;
    }

    const docNumber = this.newCustomerForm.documentNumber.trim();
    return docNumber.length === this.documentDigitsHint;
  }

  private async loadProductsPriceAndStock(): Promise<void> {
    try {
      // Cargar todos los productos
      const products = await lastValueFrom(this.pricingProductsApi.list());

      // Cargar todo el stock
      const stockData = await lastValueFrom(this.stockService.list());

      // Acumular stock de todos los lotes para cada producto
      const stockMap: { [productId: number]: number } = {};
      stockData.forEach(stock => {
        if (!stockMap[stock.product_id]) {
          stockMap[stock.product_id] = 0;
        }
        stockMap[stock.product_id] += stock.qty_on_hand;
      });

      // Para cada producto, obtener su precio calculado con el nuevo motor
      for (const product of products) {
        try {
          const priceCalc = await lastValueFrom(
            this.pricingQueryApi.calculatePrice(product.id)
          );

          if (priceCalc) {
            const salePriceWithIgv = Number(priceCalc.salePriceWithIgv ?? priceCalc.salePrice ?? 0);
            this.productPriceStockMap[product.id] = {
              stock: stockMap[product.id] || 0,
              options: [],
              applied: {
                priceListCode: '',
                currency: 'PEN',
                baseUnitPrice: salePriceWithIgv,
                finalUnitPrice: salePriceWithIgv,
                autoAppliedDiscounts: [],
              },
              discounts: [],
              priceCalc, // Almacenar resultado completo
            };
          }
        } catch (err) {
          console.warn(`No se pudo obtener pricing para producto ${product.id}:`, err);
          this.productPriceStockMap[product.id] = {
            stock: stockMap[product.id] || 0,
            options: [],
            applied: null,
            discounts: []
          };
        }
      }

      console.log('Cache completo de pricing cargado:', this.productPriceStockMap);
    } catch (error) {
      console.error('Error cargando informacion de productos:', error);
      this.showToast('error', 'Error cargando informacion de productos');
    }
  }

  private loadOpenRegister(): void {
    this.cashFlowApi.getOpenRegister(1).subscribe((r: any) => {
      this.currentOpenRegister = r
      this.currentCashRegister = r
    })
  }

  private loadRegisters(): void {
    this.cashFlowApi.listRegisters({
      companyId: 1,
      page: this.boxesPage,
      limit: this.boxesLimit
    }).subscribe((resp: any) => {
      this.registersList = resp.data || []
      this.boxesTotal = resp.total || 0
      this.boxesTotalPages = resp.totalPages || 0
    })
  }

  goToBoxPage(page: number): void {
    if (page >= 1 && page <= this.boxesTotalPages) {
      this.boxesPage = page
      this.loadRegisters()
    }
  }

  openCajaFromRow(box: any): void {
    const payload: any = { openingBalance: box.openingBalance ?? 0, observations: '' }
    this.cashFlowApi.openRegister(1, box.code, payload).subscribe({
      next: (reg: any) => {
        this.currentOpenRegister = reg
        this.showToast('success', 'Caja abierta')
        this.loadOpenRegister()
        this.loadRegisters()
        // Refresh the list of cajas with the newly opened one
        const newBox: any = {
          code: reg?.code ?? box.code,
          name: reg?.name ?? box.name ?? `Caja ${box.code}`,
          status: reg?.status ?? 'OPEN',
          openingBalance: reg?.openingBalance ?? box.openingBalance ?? 0,
          currentBalance: reg?.currentBalance ?? reg?.openingBalance ?? 0,
          openedAt: reg?.openedAt ?? new Date().toISOString(),
        }
        const others = (this.registersList || []).filter((b: any) => b.code !== newBox.code)
        this.registersList = [newBox, ...others]
        // Reset input fields after opening a caja
        this.cashBoxCode = ''
        this.openingBalanceTemp = 0
      },
      error: (err) => {
      const msg = err?.error?.message || err?.message || 'Ya existe una caja abierta. Cierrala primero.'
        this.showToast('error', msg)
      }
    })
  }

  closeCajaFromRow(box: any): void {
    const payload: any = { actualCash: box.currentBalance ?? 0, observations: '' }
    this.cashFlowApi.closeRegister(1, box.code, payload).subscribe({
      next: () => {
        this.currentOpenRegister = null
        this.showToast('success', 'Caja cerrada')
        this.loadOpenRegister()
        this.loadRegisters()
        // Clear inputs after closing
        this.cashBoxCode = ''
        this.openingBalanceTemp = 0
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Error cerrando caja'
        this.showToast('error', msg)
      }
    })
  }

  // ============================================
  // LOADING & SEARCH
  // ============================================

  loadSales(): void {
    this.isLoading = true

    // Map frontend status to backend status
    const apiFilters: any = {
      companyId: 1,
      dateFrom: this.salesFilters.dateFrom,
      dateTo: this.salesFilters.dateTo,
      search: this.salesFilters.search || undefined,
      documentType: this.salesFilters.documentType || undefined,
      paymentType: this.salesFilters.paymentType || undefined,
      customerId: this.salesFilters.customerId || undefined,
      page: this.currentPage,
      limit: this.pageSize,
    }

    // Map frontend status (EMITIDO/ANULADO) to backend status (CONFIRMED/CANCELLED)
    if (this.salesFilters.status) {
      if (this.salesFilters.status === 'EMITIDO') {
        apiFilters.status = 'CONFIRMED'
      } else if (this.salesFilters.status === 'ANULADO') {
        apiFilters.status = 'CANCELLED'
      }
    }

    this.salesApi.list(apiFilters).subscribe({
      next: (resp: any) => {
        this.sales = resp.data
        this.totalItems = resp.total
        this.loadElectronicDocumentsForSales()
        this.loadMetrics()
        this.loadCashFlowData()
        this.isLoading = false
        this.showToast('info', `${resp.data.length} ventas cargadas`)
      },
      error: () => {
        this.isLoading = false
        this.showToast('error', 'Error cargando ventas')
      }
    })
  }

  private loadElectronicDocumentsForSales(): void {
    this.electronicDocumentsBySaleId = {};

    if (!this.sales.length) {
      return;
    }

    const requests = this.sales.map((sale) =>
      this.electronicBillingApi.getDocumentBySale(sale.id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(requests).subscribe((documents) => {
      documents.forEach((document, index) => {
        const saleId = this.sales[index]?.id;
        if (saleId) {
          this.electronicDocumentsBySaleId[saleId] = document;
        }
      });
    });
  }

  loadMetrics(): void {
    const apiFilters: any = {
      companyId: 1,
      dateFrom: this.salesFilters.dateFrom,
      dateTo: this.salesFilters.dateTo,
      documentType: this.salesFilters.documentType || undefined,
      paymentType: this.salesFilters.paymentType || undefined,
    }

    if (this.salesFilters.status) {
      if (this.salesFilters.status === 'EMITIDO') {
        apiFilters.status = 'CONFIRMED'
      } else if (this.salesFilters.status === 'ANULADO') {
        apiFilters.status = 'CANCELLED'
      }
    }

    this.salesApi.metrics(apiFilters.companyId, apiFilters.dateFrom, apiFilters.dateTo, apiFilters.status, apiFilters.documentType, apiFilters.paymentType).subscribe({
      next: (resp: any) => {
        this.metrics = {
          totalSales: resp.totalSales || 0,
          totalEmitted: resp.confirmedSales || 0,
          totalCancelled: resp.cancelledSales || 0,
          totalAmount: resp.totalAmount || 0,
        }
      },
      error: () => {
        this.metrics = { totalSales: 0, totalEmitted: 0, totalCancelled: 0, totalAmount: 0 }
      }
    })
  }


  applySalesFilters(): void {
    this.currentPage = 1
    this.loadSales()
  }

  resetSalesFilters(): void {
    this.datePreset = 'last30days'
    this.salesFilters = {
      dateFrom: this.getDateNDaysAgo(30),
      dateTo: this.getToday(),
      customerId: undefined,
      customerName: '',
      documentType: null,
      status: null,
      paymentType: null,
      search: '',
      page: 1,
      limit: 50,
    }
    this.clientSearchText = ''
    this.filteredClients = []
    this.showClientDropdown = false
    this.applySalesFilters()
    this.showToast('info', 'Filtros limpiados')
  }

  // Client autocomplete
  onClientSearch(): void {
    if (!this.clientSearchText || this.clientSearchText.length < 2) {
      this.filteredClients = []
      this.showClientDropdown = false
      return
    }

    this.clientsApi.findAll({
      companyId: 1,
      search: this.clientSearchText,
      limit: 15,
    }).subscribe({
      next: (resp) => {
        this.filteredClients = resp.data || []
        this.showClientDropdown = this.filteredClients.length > 0
      },
      error: () => {
        this.filteredClients = []
        this.showClientDropdown = false
      }
    })
  }

  selectClient(client: any): void {
    this.salesFilters.customerId = client.id
    this.clientSearchText = client.name
    this.showClientDropdown = false
    this.applySalesFilters()
  }

  onClientFocus(): void {
    if (this.filteredClients.length > 0) {
      this.showClientDropdown = true
    }
  }

  onClientBlur(): void {
    setTimeout(() => {
      this.showClientDropdown = false
    }, 200)
  }

  // Cash Flow Box Filter Methods
  onBoxSearch(): void {
    const search = this.cashFlowBoxSearchText.toLowerCase()
    if (!search) {
      this.filteredBoxes = this.registersList || []
      this.showBoxDropdown = this.filteredBoxes.length > 0
      return
    }

    this.filteredBoxes = (this.registersList || []).filter((box: any) =>
      box.code?.toLowerCase().includes(search) ||
      box.name?.toLowerCase().includes(search)
    )
    this.showBoxDropdown = this.filteredBoxes.length > 0
  }

  selectBox(box: any): void {
    this.cashFlowSelectedBox = box
    this.cashFlowBoxSearchText = box.code || box.name || ''
    this.showBoxDropdown = false
    this.cashFlowPage = 1
    this.loadCashFlowData()
  }

  onBoxFocus(): void {
    this.onBoxSearch()
  }

  onBoxBlur(): void {
    setTimeout(() => {
      this.showBoxDropdown = false
    }, 200)
  }

  clearBoxFilter(): void {
    this.cashFlowSelectedBox = null
    this.cashFlowBoxSearchText = ''
    this.cashFlowPage = 1
    this.loadCashFlowData()
  }

  // Date preset handling
  onDatePresetChange(preset: DatePreset): void {
    this.datePreset = preset
    const today = new Date()

    switch (preset) {
      case 'today':
        this.salesFilters.dateFrom = this.formatDate(today)
        this.salesFilters.dateTo = this.formatDate(today)
        break
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        this.salesFilters.dateFrom = this.formatDate(yesterday)
        this.salesFilters.dateTo = this.formatDate(yesterday)
        break
      case 'last7days':
        this.salesFilters.dateFrom = this.getDateNDaysAgo(7)
        this.salesFilters.dateTo = this.getToday()
        break
      case 'last30days':
        this.salesFilters.dateFrom = this.getDateNDaysAgo(30)
        this.salesFilters.dateTo = this.getToday()
        break
      case 'manual':
        // Don't change dates, let user select manually
        break
    }

    if (preset !== 'manual') {
      this.applySalesFilters()
    }
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage = page
    this.loadSales()
  }

  // ============================================
  // NEW SALE
  // ============================================

  onNewSale(): void {
    this.cashFlowApi.getOpenRegister(1).subscribe({
      next: (reg: any) => {
        if (!reg) {
          this.showNoOpenCashModal = true
          return
        }
        this.currentOpenRegister = reg
        this.foundCustomer = null
        this.saleFormData = {
          documentType: 'BOLETA',
          paymentType: 'EFECTIVO',
          lines: [],
          customerId: 0,
          customerName: '',
          customerDocumentNumber: '',
          taxRate: this.defaultSaleTaxRate,
        };
        // Limpiar campos de pago
        this.paymentOperationNumber = ''
        this.paymentReference = ''
        this.paymentBankName = ''
        this.paymentCardType = ''
        this.activeTab = 'create'
      },
      error: () => {
        this.showNoOpenCashModal = true
      }
    })
  }

  onSaleDocumentTypeChange(): void {
    if (this.saleFormData?.documentType === 'FACTURA' && this.foundCustomer && !this.isRucCustomer(this.foundCustomer)) {
      this.showToast('warning', 'Para factura selecciona un contribuyente con RUC')
    }
  }

  private isRucCustomer(customer: ClientResponse | null | undefined): boolean {
    if (!customer) {
      return false
    }

    const documentNumber = String(customer.documentNumber ?? '').replace(/\D+/g, '')
    const documentType = this.documentTypesB.find((item) => Number(item.id) === Number(customer.documentTypeId))
    const sunatCode = String((documentType as any)?.sunatCode ?? (documentType as any)?.sunatDocumentCode ?? '').trim()

    return sunatCode === '6' || documentNumber.length === 11
  }

  selectProductOrPrice(p: any): void {
    if (!p) return;

    const quantity = this.currentSaleItem.quantity || 1;
    const priceState = this.productPriceStockMap[p.id];
    const fallbackPrice =
      priceState?.applied?.finalUnitPrice
      ?? priceState?.options?.[0]?.finalUnitPrice
      ?? priceState?.priceCalc?.salePriceWithIgv
      ?? p.salePrice
      ?? 0;

    this.currentSaleItem = {
      itemType: 'PRODUCT',
      productId: p.id,
      productName: p.name,
      productSku: p.sku,
      quantity,
      stock: priceState?.stock || 0,
      unitPrice: Number(fallbackPrice),
      appliedPriceListCode: priceState?.applied?.priceListCode,
      appliedDiscounts: priceState?.applied?.autoAppliedDiscounts || []
    } as any;

    this.filteredProducts = [];
    this.filteredSaleItems = [];
    this.productSearchText = '';

    if (this.productSearchInput) {
      this.productSearchInput.nativeElement.value = '';
    }

    setTimeout(() => {
      this.quantityInput?.nativeElement?.focus();
    }, 100);

    this.pricingQueryApi.calculatePrice(p.id)
      .subscribe((priceCalc: PriceCalculation) => {
        if (!priceCalc) return;

        const salePriceWithIgv = Number(priceCalc.salePriceWithIgv ?? priceCalc.salePrice ?? 0);

        this.currentSaleItem = {
          ...this.currentSaleItem,
          itemType: 'PRODUCT',
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          quantity,
          stock: this.productPriceStockMap[p.id]?.stock || 0,
          unitPrice: salePriceWithIgv,
          originalUnitPrice: salePriceWithIgv,
          discountPct: 0,
          appliedPriceListCode: '',
          appliedDiscounts: [],
          maxDiscountPct: priceCalc.maxDiscountPct,
          cpp: priceCalc.cpp,
        } as any;
      }, () => {
        this.showToast('warning', 'No se pudo calcular el mejor precio. Se uso el precio base del producto.');
        this.currentSaleItem.originalUnitPrice = this.currentSaleItem.unitPrice;
        this.currentSaleItem.discountPct = 0;
        this.currentSaleItem.maxDiscountPct = 0;
      });
  }

  isSaleItemDiscountOverLimit(): boolean {
    return (this.currentSaleItem.discountPct || 0) > (this.currentSaleItem.maxDiscountPct || 0);
  }

  updateSaleItemDiscount(delta: number): void {
    if (!this.currentSaleItem.productId || this.currentSaleItem.itemType === 'SERVICE') return;
    
    let currentPct = this.currentSaleItem.discountPct || 0;
    currentPct += delta;
    
    if (currentPct < 0) currentPct = 0;
    
    this.currentSaleItem.discountPct = currentPct;
    
    // Calculate new unit price
    if (!this.isSaleItemDiscountOverLimit()) {
      const basePrice = this.currentSaleItem.originalUnitPrice || 0;
      this.currentSaleItem.unitPrice = Number((basePrice * (1 - currentPct / 100)).toFixed(2));
    }
  }

  onSaleItemSearch(): void {
    const query = (this.productSearchText || '').trim().toLowerCase()

    if (!query) {
      this.filteredProducts = []
      this.filteredSaleItems = []
      return
    }

    this.filteredProducts = this.products.filter((product) =>
      product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query),
    )

    const productResults: SaleCatalogSearchResult[] = this.filteredProducts.slice(0, 8).map((product) => {
      const priceState = this.productPriceStockMap[product.id]
      const suggestedPrice =
        priceState?.applied?.finalUnitPrice
        ?? priceState?.options?.[0]?.finalUnitPrice
        ?? priceState?.priceCalc?.salePriceWithIgv
        ?? product.salePrice
        ?? 0

      return {
        itemType: 'PRODUCT',
        name: product.name,
        code: product.sku,
        price: Number(suggestedPrice),
        stock: priceState?.stock || 0,
        product,
      }
    })

    this.filteredSaleItems = productResults.slice(0, 12)
  }

  selectSaleCatalogItem(result: SaleCatalogSearchResult): void {
    if (result.product) {
      this.selectProductOrPrice(result.product)
    }
  }

  onCancelSaleForm(): void {
    this.foundCustomer = null
    this.saleFormData = null
    this.paymentOperationNumber = ''   // <- limpiar
    this.paymentReference = ''
    this.paymentBankName = ''
    this.paymentCardType = ''
    this.activeTab = 'sales'
  }


  onConfirmSale(): void {
    if (!this.saleFormData || !this.saleFormData.lines || this.saleFormData.lines.length === 0) {
      this.showToast('error', 'Agregue al menos un item')
      return
    }
    if (!this.foundCustomer) {
      this.showToast('error', 'Seleccione un cliente')
      return
    }

    const paymentType = this.saleFormData.paymentType as PaymentType
    const backendMethod = paymentMethodMap[paymentType] || 'CASH'

    // Construir el pago segun el tipo
    const paymentData: any = {
      method: backendMethod,
      amount: this.saleFormData.total || 0,
      reference: null,
      bankName: null,
      cardType: null
    }

    // Agregar campos especificos segun el metodo de pago
    if (paymentType === 'TARJETA') {
      paymentData.reference = this.paymentReference || null
      paymentData.bankName = this.paymentBankName || null
      paymentData.cardType = this.paymentCardType || null
    } else if (paymentType === 'TRANSFERENCIA') {
      paymentData.reference = this.paymentReference || null
      paymentData.bankName = this.paymentBankName || null
    } else if (paymentType === 'YAPE') {
      paymentData.reference = this.paymentReference || null
      paymentData.bankName = 'BCP'  // Yape es de BCP
    } else if (paymentType === 'PLIN') {
      paymentData.reference = this.paymentReference || null
      paymentData.bankName = 'BBVA'  // Plin es de BBVA
    }
    // CASH: reference, bankName, cardType = null

    const createDto: any = {
      companyId: this.COMPANY_ID,
      customerId: Number(this.foundCustomer.id),
      saleType: 'PRODUCT',
      documentType: this.saleFormData.documentType as any,
      series: null,
      number: null,
      issueDate: this.getToday(),
      dueDate: this.getToday(),
      payments: [paymentData],
      items: this.saleFormData.lines.map((line) => ({
        itemType: 'PRODUCT',
        productId: line.productId,
        serviceId: null,
        quantity: line.quantity,
        finalUnitPrice: line.unitPrice,
        discountPct: line.discountPct || 0,
        lotId: null,
        serialIds: [],
        comboId: null,
        description: line.productName,
      })),
      applyAutoDiscounts: true
    }

    this.salesApi.create(createDto).subscribe({
      next: (newSale) => {
        this.showToast('success', 'Venta registrada exitosamente')
        this.onCancelSaleForm()
        this.loadSales()
        this.loadOpenRegister()
      },
      error: () => this.showToast('error', 'Error registrando venta')
    })
  }

  // ============================================
  // CUSTOMER SEARCH
  // ============================================

  onSearchCustomer(): void {
    const document = this.customerSearchText.trim()

    // 1. Validacion: campo vacio
    if (!document) {
      this.foundCustomer = null
      this.showToast('warning', 'Ingrese un DNI o RUC')
      return
    }

    // 2. Buscar cliente por DNI/RUC usando el nuevo endpoint
    const companyId = 1
    this.clientsApi.findAll({ companyId, documentNumber: document, limit: 1 })
      .subscribe({
        next: (response) => {
          const customer = response.data?.[0] ?? null
          if (customer) {
            this.foundCustomer = customer
            this.onSaleDocumentTypeChange()
            this.showToast('success', 'Cliente encontrado')
            return
          }

          this.foundCustomer = null
          this.showToast('warning', 'Cliente no encontrado')
          this.newCustomerForm = {
            name: '',
            documentNumber: document,
            documentTypeId: null,
            address: '',
            email: '',
            phone: '',
          }
          this.showNewCustomerModal = true
        },
        error: (error) => {
          console.log('Error buscando cliente:', error);
          this.showToast('error', 'Error buscando cliente')
        }
      })
  }


  // ============================================
  // SALE ITEMS
  // ============================================

  onAddSaleItem(): void {
    if (!this.saleFormData) return
    const itemType = this.currentSaleItem?.itemType || 'PRODUCT'
    const hasRequiredEntity = !!this.currentSaleItem?.productId

    if (!hasRequiredEntity || !this.currentSaleItem?.quantity) {
      this.showToast('error', 'Completa los datos del producto')
      return
    }

    // Convertir unitPrice a numero (viene como string del backend)
    const unitPrice = Number(this.currentSaleItem.unitPrice) || 0;
    const lineTotal = this.roundMoney((this.currentSaleItem.quantity || 0) * unitPrice);

    let newLine: SaleLine
    const product = this.products.find(p => p.id === this.currentSaleItem.productId)
    if (!product) {
      this.showToast('error', 'Producto invalido')
      return
    }

    const productInfo = this.productPriceStockMap[this.currentSaleItem.productId!];
    const hasLot = productInfo?.stockByLot && productInfo.stockByLot.length > 0;
    const hasSerial = product.isSerialized || false;

    newLine = {
      itemType: 'PRODUCT',
      productId: this.currentSaleItem.productId as number,
      productSku: this.currentSaleItem.productSku || '',
      productName: this.currentSaleItem.productName || '',
      quantity: this.currentSaleItem.quantity as number,
      unitPrice: unitPrice,
      originalUnitPrice: Number(this.currentSaleItem.originalUnitPrice || unitPrice),
      discountPct: Number(this.currentSaleItem.discountPct || 0),
      lineTotal: lineTotal,
      hasLot: hasLot,
      hasSerial: hasSerial,
      lotId: null,
      lotCode: undefined,
      expirationDate: undefined,
      serials: []
    }

    const currentStock = this.productPriceStockMap[this.currentSaleItem.productId!]?.stock || 0;
    if (currentStock < this.currentSaleItem.quantity!) {
      this.showToast('error', `Stock insuficiente. Disponible: ${currentStock}`)
      return
    }


    if (!this.saleFormData.lines) this.saleFormData.lines = []
    console.log('Agregando linea:', newLine);
    console.log('Lineas antes:', this.saleFormData.lines.length);
    this.saleFormData.lines.push(newLine)
    console.log('Lineas despues:', this.saleFormData.lines.length);

    // Limpiar completamente currentSaleItem
    this.currentSaleItem = {};

    // Limpiar busqueda
    this.productSearchText = '';
    this.filteredProducts = [];
    this.filteredSaleItems = [];

    this.calculateSaleTotals()
    this.showToast('success', 'Item agregado')
  }

  onRemoveSaleItem(index: number): void {
    if (!this.saleFormData?.lines) return
    this.saleFormData.lines.splice(index, 1)
    this.calculateSaleTotals()
    this.showToast('success', 'Producto eliminado')
  }

  // Alternar visibilidad de detalles de lote/seriales en linea de venta
  toggleLineDetails(index: number): void {
    if (this.expandedLines.has(index)) {
      this.expandedLines.delete(index);
    } else {
      this.expandedLines.add(index);
    }
  }

  // Verificar si una linea esta expandida
  isLineExpanded(index: number): boolean {
    return this.expandedLines.has(index);
  }

  private calculateSaleTotals(): void {
    if (!this.saleFormData?.lines) return
    const total = this.roundMoney(this.saleFormData.lines.reduce((sum, line) => sum + this.roundMoney(line.lineTotal), 0))
    const fiscalBreakdown = this.splitTaxIncludedTotal(total)
    this.saleFormData.subtotal = fiscalBreakdown.subtotal
    this.saleFormData.igv = fiscalBreakdown.taxAmount
    this.saleFormData.total = fiscalBreakdown.total
    this.saleFormData.taxRate = fiscalBreakdown.taxRate
  }

  getCurrentSaleTaxRateLabel(): string {
    return this.formatTaxRateLabel(this.saleFormData?.taxRate)
  }

  getSaleTaxRateLabel(sale: Pick<Sale, 'taxRate'> | null | undefined): string {
    return this.formatTaxRateLabel(sale?.taxRate)
  }

  private splitTaxIncludedTotal(totalAmount: number, rawTaxRate: number = this.defaultSaleTaxRate): {
    subtotal: number
    taxAmount: number
    total: number
    taxRate: number
  } {
    const total = Number((Number(totalAmount) || 0).toFixed(2))
    const normalizedTaxRate = this.normalizeTaxRate(rawTaxRate)

    if (total <= 0 || normalizedTaxRate <= 0) {
      return {
        subtotal: total,
        taxAmount: 0,
        total,
        taxRate: normalizedTaxRate,
      }
    }

    const subtotal = Number((total / (1 + normalizedTaxRate)).toFixed(2))
    const taxAmount = Number((total - subtotal).toFixed(2))

    return {
      subtotal,
      taxAmount,
      total,
      taxRate: normalizedTaxRate,
    }
  }

  private normalizeTaxRate(rate: number | null | undefined): number {
    const numericRate = Number(rate ?? this.defaultSaleTaxRate)
    if (!Number.isFinite(numericRate) || numericRate <= 0) return this.defaultSaleTaxRate
    return numericRate > 1 ? numericRate / 100 : numericRate
  }

  private formatTaxRateLabel(rate: number | null | undefined): string {
    const normalizedTaxRate = this.normalizeTaxRate(rate)
    const pct = Number((normalizedTaxRate * 100).toFixed(2))
    return Number.isInteger(pct) ? `${pct.toFixed(0)}%` : `${pct.toFixed(2)}%`
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  // ============================================
  // CREDIT NOTES
  // ============================================

  onOpenCreditNoteModal(sale: Sale): void {
    if (sale.status !== 'EMITIDO') {
      this.showToast('warning', 'Solo se pueden crear notas de Credito para ventas emitidas')
      return
    }
    this.creditNoteFormData = {
      saleId: sale.id,
      saleSeries: sale.series,
      saleNumber: sale.number,
      series: 'NC01',
      currency: 'PEN',
      totalTaxableAmount: sale.subtotal,
      totalIgv: sale.taxAmount,
      grandTotal: sale.total,
    }
    this.showCreditNoteModal = true
  }

  onConfirmCreditNote(): void {
    this.showToast('success', 'Nota de Credito emitida')
    this.showCreditNoteModal = false
  }

  // ============================================
  // DISPATCH GUIDES
  // ============================================

  onOpenDispatchGuideModal(sale: Sale): void {
    this.dispatchGuideFormData = {
      saleId: sale.id,
      series: 'GR01',
      issueDate: new Date().toISOString().split('T')[0],
      senderName: 'Tu Empresa',
      senderAddress: 'Direccion de tu empresa',
      arrivalAddress: '',
      items: (sale.items || []).filter((line: any) => line.productId).map((line: any) => ({
        id: 0,
        shippingGuideId: 0,
        productId: line.productId,
        itemCode: line.product?.sku || '',
        description: line.product?.name || 'Producto',
        unitOfMeasure: 'UND',
        quantity: line.quantity,
        weightKg: 0,
        packages: 1,
      })),
    }
    this.showDispatchGuideModal = true
  }

  onConfirmDispatchGuide(): void {
    this.showToast('success', 'Guia de remision emitida')
    this.showDispatchGuideModal = false
  }

  // ============================================
  // CANCEL SALE
  // ============================================

  onCancelSale(sale: Sale): void {
    this.saleToCancel = sale
    this.showCancelConfirmModal = true
  }

  confirmCancelSale(): void {
    if (!this.saleToCancel) return

    const totalVenta = Number(this.saleToCancel.total)

    // Primero intentamos crear la transaccion de caja (RETURN)
    const returnTransaction: any = {
      type: 'RETURN',
      subtype: 'CASH',
      amount: totalVenta,
      description: `${this.cancelReason === 'RETURN' ? 'Devolucion' : 'Anulacion por error'} venta ${this.saleToCancel.series}-${this.saleToCancel.number}`,
      reference: ''
    }

    this.cashFlowApi.createTransaction(1, returnTransaction).subscribe({
      next: () => {
        // Solo si la transaccion de caja fue exitosa, cancelamos la venta
        this.salesApi.cancel(this.saleToCancel!.id, { reason: 'ANULADA', observations: '' } as any).subscribe({
          next: () => {
            // Actualizar la venta en el array de sales
            const saleIndex = this.sales.findIndex(s => s.id === this.saleToCancel!.id)
            if (saleIndex >= 0) {
              this.sales[saleIndex].status = 'CANCELLED'
              // Forzar deteccion de cambios
              this.sales = [...this.sales]
            }

            // Actualizar datos
            this.loadRegisters()
            this.loadOpenRegister()
            this.loadCashFlowData()
            // this.calculateMetrics()

            // Mostrar toast y cerrar modal con delay para que se muestre correctamente
            this.closeCancelModal()
            setTimeout(() => {
              this.showToast('success', 'Venta anulada correctamente')
            }, 100)
          },
          error: () => {
            this.showToast('error', 'Error al anular la venta')
          }
        })
      },
      error: (err) => {
        // Si falla la transaccion de caja (ej: no hay efectivo), NO cancelamos la venta
        const msg = err?.error?.message || 'No se pudo completar la anulacion'
        this.showToast('error', msg)
      }
    })
  }

  closeCancelModal(): void {
    this.showCancelConfirmModal = false
    this.saleToCancel = null
    this.cancelReason = 'ERROR'
  }

  // ============================================
  // VIEW
  // ============================================

  onViewSale(sale: Sale): void {
    // Reset any open item details
    if (this.selectedSale && this.selectedSale.items) {
      this.selectedSale.items.forEach((item: any) => {
        item.showDetails = false;
      });
    }

    // Fetch full sale details from API to get lots and serials
    this.salesApi.get(sale.id).subscribe({
      next: (detail) => {
        // Initialize showDetails for each item
        if (detail.items) {
          detail.items.forEach((item: any) => {
            item.showDetails = false;
          });
        }
        this.selectedSale = detail;
        this.loadSelectedElectronicDocument(detail.id);
      },
      error: () => {
        // Fallback to list data if API fails
        this.selectedSale = sale;
        this.loadSelectedElectronicDocument(sale.id);
        this.showToast('error', 'Error cargando detalles de venta');
      }
    });
  }

  private loadSelectedElectronicDocument(saleId: number): void {
    this.selectedElectronicDocument = this.electronicDocumentsBySaleId[saleId] ?? null;

    this.electronicBillingApi.getDocumentBySale(saleId).pipe(
      catchError(() => of(null))
    ).subscribe((document) => {
      this.selectedElectronicDocument = document;
      this.electronicDocumentsBySaleId[saleId] = document;
    });
  }

  onSendElectronicInvoice(sale: Sale | null): void {
    if (!sale) {
      return;
    }

    if (!this.canSendElectronicInvoice(sale)) {
      return;
    }

    this.pendingElectronicInvoiceSale = sale;
    this.showElectronicInvoiceConfirmModal = true;
  }

  closeElectronicInvoiceConfirmModal(): void {
    if (this.pendingElectronicInvoiceSale && this.electronicBillingLoadingBySaleId[this.pendingElectronicInvoiceSale.id]) {
      return;
    }

    this.showElectronicInvoiceConfirmModal = false;
    this.pendingElectronicInvoiceSale = null;
  }

  confirmSendElectronicInvoice(): void {
    const sale = this.pendingElectronicInvoiceSale;
    if (!sale || !this.canSendElectronicInvoice(sale)) {
      this.closeElectronicInvoiceConfirmModal();
      return;
    }

    this.electronicBillingLoadingBySaleId[sale.id] = true;
    this.electronicBillingApi.sendInvoice(sale.id).subscribe({
      next: (response) => {
        this.electronicDocumentsBySaleId[sale.id] = response.document;
        if (this.selectedSale?.id === sale.id) {
          this.selectedElectronicDocument = response.document;
        }

        if (response.document.status === 'ACCEPTED') {
          this.showToast('success', response.document.sunatDescription || 'Comprobante aceptado por SUNAT');
        } else if (response.document.status === 'REJECTED') {
          this.showToast('error', response.document.errorMessage || response.document.sunatDescription || 'SUNAT rechazo el comprobante');
        } else {
          this.showToast('info', 'Comprobante enviado a APIsPeru');
        }
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || 'Error al emitir comprobante electronico';
        this.showToast('error', Array.isArray(message) ? message.join(', ') : message);
        this.electronicBillingLoadingBySaleId[sale.id] = false;
        this.showElectronicInvoiceConfirmModal = false;
        this.pendingElectronicInvoiceSale = null;
      },
      complete: () => {
        this.electronicBillingLoadingBySaleId[sale.id] = false;
        this.showElectronicInvoiceConfirmModal = false;
        this.pendingElectronicInvoiceSale = null;
      },
    });
  }

  toggleItemDetails(line: any): void {
    line.showDetails = !line.showDetails;
  }

  onDownloadSalePdf(sale: Sale | null): void {
    if (!sale) {
      return;
    }

    const document = this.getElectronicDocumentForSale(sale);
    if (document?.status !== 'ACCEPTED') {
      this.showToast('warning', 'Primero emita electronicamente el comprobante.');
      return;
    }

    this.downloadElectronicFile(
      this.electronicBillingApi.downloadPdf(sale.id),
      this.buildElectronicFileName(sale, 'pdf'),
      'PDF electronico descargado',
    );
  }

  onDownloadElectronicXml(sale: Sale | null): void {
    if (!sale || !this.hasElectronicDocumentFile(sale, 'xml')) {
      this.showToast('warning', 'El XML estara disponible cuando el comprobante tenga XML registrado.');
      return;
    }

    this.downloadElectronicFile(
      this.electronicBillingApi.downloadXml(sale.id),
      this.buildElectronicFileName(sale, 'xml'),
      'XML descargado',
    );
  }

  onDownloadElectronicCdr(sale: Sale | null): void {
    if (!sale || !this.hasElectronicDocumentFile(sale, 'cdr')) {
      this.showToast('warning', 'El CDR estara disponible cuando SUNAT acepte el comprobante.');
      return;
    }

    this.downloadElectronicFile(
      this.electronicBillingApi.downloadCdr(sale.id),
      `R-${this.buildElectronicFileName(sale, 'zip')}`,
      'CDR descargado',
    );
  }

  onSendElectronicDocumentEmail(sale: Sale | null): void {
    if (!sale || !this.canSendElectronicDocumentEmail(sale)) {
      this.showToast('warning', 'Primero emita y acepte el comprobante electronico.');
      return;
    }

    this.electronicEmailLoadingBySaleId[sale.id] = true;
    this.electronicBillingApi.sendDocumentEmail(sale.id).subscribe({
      next: (response) => {
        this.showToast('success', response.message || `Comprobante enviado a ${response.to}`);
      },
      error: (err: any) => {
        const message = err?.error?.message || err?.message || 'No se pudo enviar el comprobante por correo';
        this.showToast('error', Array.isArray(message) ? message.join(', ') : message);
        this.electronicEmailLoadingBySaleId[sale.id] = false;
      },
      complete: () => {
        this.electronicEmailLoadingBySaleId[sale.id] = false;
      },
    });
  }

  private downloadElectronicFile(request$: any, filename: string, successMessage: string): void {
    request$.subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, filename);
        this.showToast('success', successMessage);
      },
      error: (err: any) => {
        const message = err?.error?.message || err?.message || 'No se pudo descargar el archivo electronico';
        this.showToast('error', Array.isArray(message) ? message.join(', ') : message);
      },
    });
  }

  closeDetailDrawer(): void {
    this.selectedSale = null
    this.selectedElectronicDocument = null
  }


  // ============================================
  // HELPERS
  // ============================================

  getDateNDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return this.formatDate(date)
  }

  getToday(): string {
    return this.formatDate(new Date())
  }

  formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  formatDateOnly(value?: string | null): string {
    if (!value) return '-'
    const [year, month, day] = value.slice(0, 10).split('-')
    if (!year || !month || !day) return value
    return `${day}/${month}/${year}`
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDIENTE': 'Pendiente',
      'EMITIDO': 'Emitido',
      'ANULADO': 'Anulado',
      'CONFIRMED': 'Emitido',
      'CANCELLED': 'Anulado',
      'DRAFT': 'Borrador'
    }
    return labels[status] || status
  }

  getElectronicDocumentForSale(sale: Sale): ElectronicDocument | null {
    return this.electronicDocumentsBySaleId[sale.id] ?? null;
  }

  getElectronicStatusLabel(status?: ElectronicDocumentStatus | null): string {
    const labels: { [key: string]: string } = {
      PENDING: 'Pendiente',
      SENT: 'Enviado',
      ACCEPTED: 'Aceptado',
      REJECTED: 'Rechazado',
      ERROR: 'Error',
    };
    return status ? labels[status] || status : 'Pendiente';
  }

  getElectronicStatusClass(status?: ElectronicDocumentStatus | null): string {
    switch (status) {
      case 'ACCEPTED':
        return 'electronic-accepted';
      case 'REJECTED':
        return 'electronic-rejected';
      case 'ERROR':
        return 'electronic-error';
      case 'SENT':
        return 'electronic-sent';
      case 'PENDING':
      default:
        return 'electronic-pending';
    }
  }

  canSendElectronicInvoice(sale: Sale | null): boolean {
    if (!sale) {
      return false;
    }

    const document = this.getElectronicDocumentForSale(sale);
    return sale.status === 'CONFIRMED'
      && ['BOLETA', 'FACTURA'].includes(String(sale.documentType))
      && document?.status !== 'ACCEPTED'
      && !this.electronicBillingLoadingBySaleId[sale.id];
  }

  getElectronicNotes(document?: ElectronicDocument | null): string[] {
    const notes = document?.sunatNotes;
    return Array.isArray(notes) ? notes.map((note) => String(note)) : [];
  }

  canDownloadElectronicPdf(sale: Sale | null): boolean {
    return !!sale && this.getElectronicDocumentForSale(sale)?.status === 'ACCEPTED';
  }

  canSendElectronicDocumentEmail(sale: Sale | null): boolean {
    return !!sale
      && this.getElectronicDocumentForSale(sale)?.status === 'ACCEPTED'
      && !this.electronicEmailLoadingBySaleId[sale.id];
  }

  hasElectronicDocumentFile(sale: Sale | null, fileType: 'xml' | 'cdr'): boolean {
    if (!sale) {
      return false;
    }

    const document = this.getElectronicDocumentForSale(sale);
    return fileType === 'xml' ? !!document?.xml : !!document?.cdrZip;
  }

  private buildElectronicFileName(sale: Sale, extension: 'pdf' | 'xml' | 'zip'): string {
    const document = this.getElectronicDocumentForSale(sale);
    const payload = document?.payloadJson as any;
    const ruc = payload?.company?.ruc || sale.companyId;
    const sunatCode = document?.sunatDocumentTypeCode || (sale.documentType === 'FACTURA' ? '01' : '03');
    return `${ruc}-${sunatCode}-${sale.series}-${sale.number}.${extension}`;
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'OPENING': 'APERTURA',
      'SALE': 'VENTA',
      'RETURN': 'ANULACION',
      'INCOME': 'INGRESO',
      'CLOSING': 'CIERRE'
    }
    return labels[type || ''] || type || '-'
  }

  getStatusClass(status: SaleStatus): string {
    if (status === 'EMITIDO') return 'success'
    if (status === 'ANULADO') return 'danger'
    return 'warning'
  }

  exportCsv(): void {
    if (this.sales.length === 0) {
      this.showToast('warning', 'No hay ventas para exportar')
      return
    }
    let csv = 'Fecha,Tipo,Numero,Cliente,Total,Estado\n'
    this.sales.forEach((sale) => {
      csv += `"${sale.issueDate}","${sale.documentType}","${sale.series}-${sale.number}","${sale.customer?.name || ''}",${sale.total},"${this.getStatusLabel(sale.status)}"\n`
    })
    this.downloadFile(csv, `ventas-${this.getToday()}.csv`, 'text/csv')
    this.showToast('success', 'CSV exportado')
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    this.downloadBlob(blob, filename)
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  private calculateMetrics(): void {
    this.metrics = {
      totalSales: this.sales.length,
      totalEmitted: this.sales.filter((s) => s.status === 'EMITIDO').length,
      totalCancelled: this.sales.filter((s) => s.status === 'CANCELLED').length,
      totalAmount: this.sales.reduce((sum, s) => sum + s.total, 0),
    }
  }

  // ============================================
  // TOASTS
  // ============================================

  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    const toast: Toast = { type, message }
    console.log('Toast agregado:', toast, 'Total toasts:', this.toasts.length + 1);
    this.toasts.push(toast)
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t !== toast)
    }, 3000)
  }

  getToastIcon(type: string): string {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
    }
    return icons[type as keyof typeof icons] || 'fas fa-info-circle'
  }

  // MODAL DE CONFIRMACION

  onConfirmCreateCustomer(): void {
    // Validaciones basicas
    if (!this.newCustomerForm.name?.trim()) {
      this.showToast('error', 'El nombre es requerido');
      return;
    }

    if (!this.newCustomerForm.documentTypeId) {
      this.showToast('error', 'Seleccione un tipo de documento');
      return;
    }

    if (!this.validateDocumentNumber()) {
      this.showToast('error', `El numero de documento debe tener ${this.documentDigitsHint} digitos`);
      return;
    }

    const selectedDocumentType = this.documentTypesB.find(
      (item) => Number(item.id) === Number(this.newCustomerForm.documentTypeId),
    )

    const payload: ClientSaveRequest = {
      companyId: 1,
      name: this.newCustomerForm.name!,
      kind: selectedDocumentType?.kind === 'COMPANY' ? ClientKind.COMPANY : ClientKind.PERSON,
      documentNumber: this.newCustomerForm.documentNumber!,
      documentTypeId: Number(this.newCustomerForm.documentTypeId),
      address: this.newCustomerForm.address || '',
      email: this.newCustomerForm.email || '',
      phone: this.newCustomerForm.phone || '',
      city: this.newCustomerForm.city || '',
      country: this.newCustomerForm.country || '',
    }

    this.clientsApi.create(payload).subscribe({
      next: (created) => {
        this.foundCustomer = created
        this.customerSearchText = created.documentNumber
        this.showToast('success', 'Cliente registrado')
        this.showNewCustomerModal = false
      },
      error: () => this.showToast('error', 'Error registrando cliente')
    })
  }

  //PRODUCTOS
  filterProducts(): void {
    this.onSaleItemSearch()
  }


  selectProduct(product: Product): void {
    this.selectProductOrPrice(product)
  }

  onQuantityEnter(): void {
    this.onAddSaleItem()

    // Despues de agregar, volvemos el foco al buscador
    setTimeout(() => {
      if (this.productSearchInput) {
        this.productSearchInput.nativeElement.focus()
        this.productSearchInput.nativeElement.select()
      }
    }, 0)
  }



  //MODAL DE CLIENTES
  onOpenNewCustomerModal(): void {
    const doc = this.customerSearchText.trim()

    this.newCustomerForm = {
      name: '',
      documentNumber: doc || '',
      documentTypeId: doc.length === 8 ? 2 : 1, // 1=RUC, 2=DNI
      address: '',
      email: '',
      phone: '',
    }

    this.showNewCustomerModal = true
  }

  // CAJA: abrir/cerrar usando backend (fase 2)
  openCashRegister(): void {
    const code = (this.cashBoxCode || 'CajaPrincipal').trim()
    const payload: any = { openingBalance: this.openingBalanceTemp ?? 0, observations: '' }
    this.cashFlowApi.openRegister(1, code, payload).subscribe({
      next: (reg) => {
        this.currentCashRegister = reg
        this.loadRegisters()
        this.showToast('success', 'Caja abierta')
      },
      error: () => this.showToast('error', 'Error abriendo caja')
    })
  }

  closeCashRegister(): void {
    const code = (this.currentCashRegister?.code || this.cashBoxCode || 'CajaPrincipal').trim();
    const payload: any = { actualCash: this.currentCashRegister?.currentBalance ?? 0, observations: '' };
    this.cashFlowApi.closeRegister(1, code, payload).subscribe({
      next: (res) => {
        this.currentCashRegister = null;
        this.loadRegisters();
        this.showToast('success', 'Caja cerrada');
      },
      error: () => this.showToast('error', 'Error cerrando caja')
    });
  }

  openIncomeModal(): void {
    this.incomeForm = { amount: 0, description: '', reference: '' }
    this.showIncomeModal = true
  }

  confirmIncome(): void {
    if (!this.incomeForm.amount || this.incomeForm.amount <= 0) {
      this.showToast('error', 'Ingrese un monto valido')
      return
    }

    const transaction: any = {
      type: 'INCOME',
      amount: this.incomeForm.amount,
      description: this.incomeForm.description || 'Ingreso de efectivo',
      reference: this.incomeForm.reference || ''
    }

    this.cashFlowApi.createTransaction(1, transaction).subscribe({
      next: () => {
        this.showIncomeModal = false
        this.loadRegisters()
        this.loadOpenRegister()
        this.showToast('success', 'Ingreso registrado correctamente')
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al registrar ingreso'
        this.showToast('error', msg)
      }
    })
  }

  // ============================================
  // CASH FLOW - API REAL
  // ============================================

  loadCashFlowData(): void {
    this.isLoading = true

    // Initialize with open register if no box is selected
    if (!this.cashFlowSelectedBox && this.currentOpenRegister) {
      this.cashFlowSelectedBox = this.currentOpenRegister
      this.cashFlowBoxSearchText = this.currentOpenRegister.code || this.currentOpenRegister.name || ''
    }

    const params: any = {
      companyId: 1,
      dateFrom: this.cashFlowFilters.dateFrom,
      dateTo: this.cashFlowFilters.dateTo,
      subtype: this.cashFlowFilters.paymentType || undefined,
      page: this.cashFlowPage,
      limit: this.cashFlowLimit
    }

    if (this.cashFlowSelectedBox) {
      params.cashRegisterId = this.cashFlowSelectedBox.id
    }

    this.cashFlowApi.listTransactions(params).subscribe({
      next: (response) => {
        this.cashFlowEntries = response.data || []
        this.cashFlowTotal = response.total || 0
        this.cashFlowTotalPages = response.totalPages || 0
        this.isLoading = false

        this.loadCashFlowMetrics()
      },
      error: (err) => {
        console.error('Error loading cash flow:', err)
        this.isLoading = false
        this.cashFlowEntries = []
        this.cashFlowMetrics = { total: 0, cash: 0, card: 0, transfer: 0, yape: 0, plin: 0, returns: 0 }
      }
    })
  }

  loadCashFlowMetrics(): void {
    const params: any = {
      companyId: 1,
      dateFrom: this.cashFlowFilters.dateFrom,
      dateTo: this.cashFlowFilters.dateTo
    }

    if (this.cashFlowSelectedBox) {
      params.cashRegisterId = this.cashFlowSelectedBox.id
    }

    this.cashFlowApi.getCashFlowMetrics(params).subscribe({
      next: (metrics: any) => {
        this.cashFlowMetrics = {
          total: metrics.total || 0,
          cash: metrics.cash || 0,
          card: metrics.card || 0,
          transfer: metrics.transfer || 0,
          yape: metrics.yape || 0,
          plin: metrics.plin || 0,
          returns: metrics.returns || 0
        }
      },
      error: (err) => {
        console.error('Error loading cash flow metrics:', err)
      }
    })
  }

  applyCashFlowFilters(): void {
    this.cashFlowPage = 1
    this.loadCashFlowData()
  }

  resetCashFlowFilters(): void {
    this.cashFlowDatePreset = 'last30days'
    this.onCashFlowDatePresetChange('last30days')
    this.cashFlowFilters = {
      dateFrom: this.getDateNDaysAgo(30),
      dateTo: this.getToday(),
      paymentType: null
    }
    this.cashFlowPage = 1
    this.loadCashFlowData()
  }

  onCashFlowDatePresetChange(preset: string): void {
    const today = new Date()

    switch (preset) {
      case 'today':
        this.cashFlowFilters.dateFrom = today.toISOString().split('T')[0]
        this.cashFlowFilters.dateTo = today.toISOString().split('T')[0]
        break
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        this.cashFlowFilters.dateFrom = yesterday.toISOString().split('T')[0]
        this.cashFlowFilters.dateTo = yesterday.toISOString().split('T')[0]
        break
      case 'last7days':
        const last7 = new Date(today)
        last7.setDate(last7.getDate() - 7)
        this.cashFlowFilters.dateFrom = last7.toISOString().split('T')[0]
        this.cashFlowFilters.dateTo = today.toISOString().split('T')[0]
        break
      case 'last30days':
        const last30 = new Date(today)
        last30.setDate(last30.getDate() - 30)
        this.cashFlowFilters.dateFrom = last30.toISOString().split('T')[0]
        this.cashFlowFilters.dateTo = today.toISOString().split('T')[0]
        break
      case 'manual':
        break
    }
  }

  goToCashFlowPage(page: number): void {
    if (page >= 1 && page <= this.cashFlowTotalPages) {
      this.cashFlowPage = page
      this.loadCashFlowData()
    }
  }


  // Metodos para obtener informacion del pricing
  getPriceOption(productId: number, priceListCode: string): any {
    const productInfo = this.productPriceStockMap[productId];
    // console.log("aca esta el punto 0")
    // console.log(productInfo)
    if (!productInfo?.options) return null;
    // console.log("aca esta el punto 1")
    // console.log(productInfo.options.find(opt => opt.priceListCode === priceListCode));
    return productInfo.options.find(opt => opt.priceListCode === priceListCode);
  }

  getPriceMinQty(productId: number, priceListCode: string): number {
    // Esto deberia venir del backend, por ahora es una suposicion
    const option = this.getPriceOption(productId, priceListCode);
    return option?.minQty || 1;
  }

  hasDiscount(productId: number, priceListCode: string): boolean {
    const option = this.getPriceOption(productId, priceListCode);
    return option?.autoAppliedDiscounts?.length > 0;
  }

  getDiscountPercent(productId: number, priceListCode: string): string {
    const option = this.getPriceOption(productId, priceListCode);
    const discount = option?.autoAppliedDiscounts?.[0];
    return discount?.discountType === 'PERCENT' ? discount.amount : '0';
  }

  hasAnyDiscount(productId: number): boolean {
    const productInfo = this.productPriceStockMap[productId];
    return productInfo?.discounts?.length > 0;
  }

  getMainDiscountName(productId: number): string {
    const productInfo = this.productPriceStockMap[productId];
    return productInfo?.discounts?.[0]?.name || '';
  }

  onQuantityChange(): void {
    if (!this.currentSaleItem.productId) return;

    const product = this.products.find(p => p.id === this.currentSaleItem.productId);
    if (product) {
      this.selectProductOrPrice(product);
    }
  }

  // Helper para calcular total por metodo de pago
  getTotalForPaymentMethod(method: string): number {
    // Por ahora, dividir equitativamente entre todos los metodos
    // Esto podria mejorarse segun los requerimientos
    const totalMethods = this.selectedPaymentMethods.length;
    const grandTotal = this.saleFormData?.total || 0;

    if (totalMethods === 0) return 0;

    // Asignar el total completo al primer metodo o dividir equitativamente
    if (totalMethods === 1) {
      return grandTotal;
    }

    // Dividir equitativamente
    const perMethod = grandTotal / totalMethods;
    const isLastMethod = this.selectedPaymentMethods[this.selectedPaymentMethods.length - 1] === method;

    return isLastMethod ? grandTotal - (perMethod * (totalMethods - 1)) : perMethod;
  }

  // Helper para generar numero de documento usando series activas
  private generateDocumentSeries(): string {
    // Simular serie activa (en produccion vendria del backend)
    const documentType = this.saleFormData?.documentType;
    const activeSeries = this.documentSeries.find(s =>
      s.documentType === documentType && s.isActive
    );
    return activeSeries?.code || (documentType === 'BOLETA' ? 'B001' : 'F001');
  }

  // Helper para generar numero de documento usando series activas
  private generateDocumentNumber(): string {
    // Simular siguiente numero (en produccion vendria del backend)
    const documentType = this.saleFormData?.documentType;
    const activeSeries = this.documentSeries.find(s =>
      s.documentType === documentType && s.isActive
    );

    if (activeSeries) {
      return activeSeries.currentNumber.toString().padStart(8, '0');
    }

    // Fallback a numero aleatorio
    const random = Math.floor(Math.random() * 999999) + 1;
    return random.toString().padStart(6, '0');
  }

  // =========================
  // DOCUMENT SERIES METHODS
  // =========================

  loadDocumentSeries(): void {
    this.documentSeriesApi.findAll(this.COMPANY_ID).subscribe({
      next: (series) => {
        this.documentSeries = series;
        this.filterDocumentSeries();
      },
      error: (err) => {
        console.error('Error cargando series de documento:', err);
        this.showToast('error', 'Error cargando series de documento');
      },
    });
  }

  filterDocumentSeries(): void {
    this.filteredDocumentSeries = this.documentSeries.filter(series => {
      const matchesSearch = !this.documentSeriesSearchText ||
        series.code.toLowerCase().includes(this.documentSeriesSearchText.toLowerCase()) ||
        series.name.toLowerCase().includes(this.documentSeriesSearchText.toLowerCase());

      const matchesDocumentType = !this.documentSeriesFilter.documentType ||
        series.documentType === this.documentSeriesFilter.documentType;

      const matchesStatus = !this.documentSeriesFilter.isActive ||
        series.isActive === this.documentSeriesFilter.isActive;

      return matchesSearch && matchesDocumentType && matchesStatus;
    });
  }

  onDocumentSeriesSearch(): void {
    this.filterDocumentSeries();
  }

  onDocumentSeriesFilterChange(): void {
    this.filterDocumentSeries();
  }

  selectDocumentSeries(series: DocumentSeries): void {
    this.selectedDocumentSeries = series;
    this.documentSeriesEditMode = true;
    this.documentSeriesForm = {
      companyId: series.companyId,
      documentType: series.documentType,
      code: series.code,
      name: series.name,
      isActive: series.isActive,
      startingNumber: series.startingNumber,
    };
    this.showDocumentSeriesForm = true;
  }

  createNewDocumentSeries(): void {
    this.selectedDocumentSeries = null;
    this.documentSeriesEditMode = false;
    this.documentSeriesForm = {
      companyId: this.COMPANY_ID,
      documentType: DocumentType.BOLETA,
      code: '',
      name: '',
      isActive: true,
      startingNumber: 1,
      createdBy: 'system', // En produccion, usar usuario actual
    };
    this.showDocumentSeriesForm = true;
  }

  saveDocumentSeries(): void {
    if (!this.documentSeriesForm.code || !this.documentSeriesForm.name) {
      this.showToast('warning', 'Complete todos los campos obligatorios');
      return;
    }

    if (this.documentSeriesEditMode && this.selectedDocumentSeries) {
      // Modo edicion
      const updateDto: UpdateDocumentSeriesDto = {
        name: this.documentSeriesForm.name,
        isActive: this.documentSeriesForm.isActive,
        updatedBy: 'system', // En produccion, usar usuario actual
      };

      this.documentSeriesApi.update(this.selectedDocumentSeries.id, updateDto).subscribe({
        next: () => {
          this.showToast('success', 'Serie actualizada correctamente');
          this.loadDocumentSeries();
          this.closeDocumentSeriesForm();
        },
        error: (err) => {
          console.error('Error actualizando serie:', err);
          this.showToast('error', 'Error actualizando serie');
        },
      });
    } else {
      // Modo creacion
      const createDto: CreateDocumentSeriesDto = {
        companyId: this.COMPANY_ID,
        documentType: this.documentSeriesForm.documentType!,
        code: this.documentSeriesForm.code,
        name: this.documentSeriesForm.name,
        isActive: this.documentSeriesForm.isActive!,
        startingNumber: this.documentSeriesForm.startingNumber,
        createdBy: 'system', // En produccion, usar usuario actual
      };
      console.log("pruebita: " + createDto);
      console.log(createDto);

      this.documentSeriesApi.create(createDto).subscribe({
        next: () => {
          this.showToast('success', 'Serie creada correctamente');
          this.loadDocumentSeries();
          this.closeDocumentSeriesForm();
        },
        error: (err) => {
          console.error('Error creando serie:', err);
          this.showToast('error', 'Error creando serie');
        },
      });
    }
  }

  deleteDocumentSeries(id: number): void {
    if (!confirm('Esta seguro de que desea eliminar esta serie? Esta accion no se puede deshacer.')) {
      return;
    }

    this.documentSeriesApi.remove(id).subscribe({
      next: () => {
        this.showToast('success', 'Serie eliminada correctamente');
        this.loadDocumentSeries();
      },
      error: (err) => {
        console.error('Error eliminando serie:', err);
        this.showToast('error', 'Error eliminando serie');
      },
    });
  }

  toggleDocumentSeriesStatus(series: DocumentSeries): void {
    const updateDto: UpdateDocumentSeriesDto = {
      isActive: !series.isActive,
      updatedBy: 'system', // En produccion, usar usuario actual
    };

    this.documentSeriesApi.update(series.id, updateDto).subscribe({
      next: () => {
        this.showToast('success', `Serie ${series.isActive ? 'desactivada' : 'activada'} correctamente`);
        this.loadDocumentSeries();
      },
      error: (err) => {
        console.error('Error cambiando estado de serie:', err);
        const errorMsg = err?.error?.message || err?.message || '';
        if (errorMsg.includes('activa') || errorMsg.includes('active')) {
          this.showToast('error', `Error: Ya hay una serie activa de ${this.getDocumentTypeLabel(series.documentType)}`);
        } else {
          this.showToast('error', 'Error cambiando estado de serie');
        }
      },
    });
  }

  getNextNumberForDocumentType(documentType: DocumentType): void {
    this.documentSeriesApi.getNextNumberFormatted(this.COMPANY_ID, documentType).subscribe({
      next: (response) => {
        this.showToast('info', `Proximo numero para ${documentType}: ${response.formatted}`);
      },
      error: (err) => {
        console.error('Error obteniendo siguiente numero:', err);
        this.showToast('error', 'Error obteniendo siguiente numero');
      },
    });
  }

  closeDocumentSeriesForm(): void {
    this.showDocumentSeriesForm = false;
    this.documentSeriesForm = {};
    this.selectedDocumentSeries = null;
    this.documentSeriesEditMode = false;
  }

  resetDocumentSeriesFilters(): void {
    this.documentSeriesSearchText = '';
    this.documentSeriesFilter = {};
    this.filterDocumentSeries();
  }

  // Helper methods for templates
  getDocumentTypeLabel(documentType: DocumentType | string): string {
    switch (documentType) {
      case 'BOLETA':
        return 'Boleta';
      case 'FACTURA':
        return 'Factura';
      case 'NOTA_CREDITO':
        return 'Nota de Credito';
      case 'NOTA_DEBITO':
        return 'Nota de Debito';
      case 'GUIA_REMISION':
        return 'Guia de Remision';
      default:
        return documentType;
    }
  }

  formatDocumentNumber(num: number | string): string {
    const numStr = typeof num === 'number' ? num.toString() : num;
    return numStr.padStart(8, '0');
  }


  // Metodos en la clase Ventas
  countActiveSeries(): number {
    return this.documentSeries.filter(s => s.isActive).length;
  }

  countSeriesByType(type: string): number {
    return this.documentSeries.filter(s => s.documentType === type).length;
  }

  // Metodo para formatear los seriales
  formatSerials(serials: Array<{ serialCode: string }>): string {
    return serials?.map(s => s.serialCode).join(', ') || '';
  }

  // Agrupar seriales por lote para mostrar en el detalle
  groupSerialsByLot(serials: Array<{ serialCode: string; lotCode?: string; expirationDate?: string }>): { lotCode: string; expirationDate?: string; serials: string[] }[] {
    if (!serials || serials.length === 0) return [];

    const grouped = new Map<string, { lotCode: string; expirationDate?: string; serials: string[] }>();

    for (const serial of serials) {
      const lotCode = serial.lotCode || 'Sin lote';
      if (!grouped.has(lotCode)) {
        grouped.set(lotCode, {
          lotCode: lotCode,
          expirationDate: serial.expirationDate,
          serials: []
        });
      }
      grouped.get(lotCode)!.serials.push(serial.serialCode);
    }

    return Array.from(grouped.values());
  }
}
