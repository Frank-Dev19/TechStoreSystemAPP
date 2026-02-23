import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { DocumentSeriesApiService } from '../../services/sales/document-series-api.service';
import { ProductsApiService } from '../../services/products-api.service';
import { lastValueFrom } from 'rxjs';
import { CashFlowApiService } from '../../services/sales/cash-flow-api.service';
import { BusinessPartnersApiService } from '../../services/business-partners-api.service';
import { PricingStockApiService } from '../../services/pricing-stock-api.service';
import { ProductPriceStockInfo } from '../../models/pricing/product-price-stock-info.model';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { StockService } from '../../services/inventory/stock.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DocumentTypeResponse } from '../../models/document-types/document-types-response';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { BestPriceResponse } from '../../models/pricing/pricing.models';
import { DocumentSeries, CreateDocumentSeriesDto, UpdateDocumentSeriesDto } from '../../models/sales/document-series.model';
import { DocumentType } from '../../models/sales/enums';
// ============================================
// INTERFACES & TYPES (siguiendo exactamente el prompt)
// ============================================

export interface BusinessPartner {
  id: number
  companyId: number
  name: string
  tradeName?: string
  documentTypeId: number
  documentNumber: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  isClient: boolean
  isSupplier: boolean
}

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

export type DocumentTypeCode = 'NOTA_PEDIDO' | 'BOLETA' | 'FACTURA'
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
  { value: 'CREDITO', label: 'Crédito' },
  { value: 'DEBITO', label: 'Débito' }
]
export type SaleStatus = 'PENDIENTE' | 'EMITIDO' | 'ANULADO'

export interface SaleLine {
  productId: number
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  // Información de lote y seriales
  hasLot?: boolean
  hasSerial?: boolean
  lotId?: number | null
  lotCode?: string
  expirationDate?: string
  serials?: Array<{ serialId: number; serialCode: string }>
}

export interface Sale {
  id: number
  saleDate: string
  documentType: DocumentTypeCode
  documentSeries: string
  documentNumber: string
  customerId: number
  customerName: string
  customerDocumentNumber: string
  paymentType: PaymentType
  status: SaleStatus
  subtotal: number
  igv: number
  total: number
  lines: SaleLine[]
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
  customerName: string
  documentType: DocumentTypeCode | null
  status: SaleStatus | null
}

// Phase 4: Mock data service removed. All data flows through backend APIs only.


@Component({
  selector: 'app-ventas',
  standalone: false,
  templateUrl: './ventas.html',
  styleUrl: './ventas.scss'
})
export class Ventas implements OnInit {
  constructor(
    private salesApi: SalesApiService,
    private documentSeriesApi: DocumentSeriesApiService,
    private productsApi: ProductsApiService,
    private cashFlowApi: CashFlowApiService,
    private bpApi: BusinessPartnersApiService,
    private pricingStockApi: PricingStockApiService,
    private pricingProductsApi: PricingProductsApiService,
    private stockService: StockService,
    private documentTypesApi: DocumentTypesApiService,
    private pricingQueryApi: PricingQueryApiService
  ) { }

  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>
  @ViewChild('quantityInput') quantityInput!: ElementRef<HTMLInputElement>


  private readonly COMPANY_ID = 1;
  // STATE
  sales: Sale[] = []
  selectedSale: Sale | null = null
  isLoading = false

  // Cache para precios y stock de productos con información completa
  productPriceStockMap: {
    [productId: number]: {
      stock: number;
      options: any[]; // Lista de precios disponibles
      applied: any;    // Precio actualmente aplicado
      discounts: any[]; // Descuentos activos
      stockByLot?: Array<{  // 👈 AÑADE ESTO
        lotId: number;
        lotCode: string;
        quantity: number;
        expirationDate?: string;
      }>;
    }
  } = {}

  // Búsqueda de productos (separado de currentSaleItem)
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
  saleToCancel: Sale | null = null
  //showDetailDrawer = false
  showNewCustomerModal = false
  newCustomerForm: Partial<BusinessPartner> = {}

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
  saleFormData: Partial<Sale> | null = null
  creditNoteFormData: Partial<CreditNote> | null = null
  dispatchGuideFormData: Partial<ShippingGuide> | null = null
  currentSaleItem: Partial<SaleLine> = {}
  customerSearchText = ''
  foundCustomer: BusinessPartner | null = null
  selectedPaymentMethods: PaymentType[] = []

  // Control de líneas expandidas para mostrar lote/seriales
  expandedLines: Set<number> = new Set()

  // PAYMENT ADDITIONAL FIELDS
  paymentReference = ''           // Para Yape, Plin, Transferencia, Tarjeta
  paymentBankName = ''           // Para Transferencia y Tarjeta
  paymentCardType = ''           // Para Tarjeta (CRÉDITO o DÉBITO)

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

  //PAGOS
  paymentOperationNumber = ''

  // FILTERS
  salesFilters: SalesFilters = {
    dateFrom: this.getDateNDaysAgo(30),
    dateTo: this.getToday(),
    customerName: '',
    documentType: null,
    status: null,
  }

  // CASH FLOW
  cashFlowEntries: Sale[] = []
  cashFlowFilters = { dateFrom: this.getDateNDaysAgo(30), dateTo: this.getToday(), paymentType: null as PaymentType | null }
  cashFlowMetrics = { total: 0, cash: 0, card: 0, transfer: 0, credit: 0 }



  // METRICS
  metrics = { totalSales: 0, totalEmitted: 0, totalCancelled: 0, totalAmount: 0 }

  // ENUMS FOR TEMPLATES
  documentTypes: DocumentTypeCode[] = ['NOTA_PEDIDO', 'BOLETA', 'FACTURA']
  saleStatuses: SaleStatus[] = ['PENDIENTE', 'EMITIDO', 'ANULADO']
  paymentTypes: PaymentType[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']

  // UI helpers for caja (fase 1: mock, más adelante conectaremos a backend)
  cashBoxCode: string = ''
  openingBalanceTemp: number = 0
  currentCashRegister: any = null
  showNoOpenCashModal: boolean = false
  // Phase 5: estado real de cajas desde backend
  currentOpenRegister: any = null
  registersList: any[] = []

  ngOnInit(): void {
    this.loadSales()
    this.productsApiGet()
    this.loadProductsPriceAndStock()
    this.loadDocumentTypes()
    // Load current open register and all registers for admin view
    this.loadOpenRegister()
    this.loadRegisters()
    this.loadDocumentSeries()
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

    // Validar el número de documento actual si ya hay uno
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

      const stockMap: { [productId: number]: number } = {};
      stockData.forEach(stock => {
        stockMap[stock.product_id] = stock.qty_on_hand;
      });

      // Para cada producto, obtener su pricing completo (qty=1)
      for (const product of products) {
        try {
          const bestPriceInfo = await lastValueFrom(
            this.pricingQueryApi.getBestPrice(product.id, 20)
          );

          if (bestPriceInfo) {
            this.productPriceStockMap[product.id] = {
              stock: stockMap[product.id] || 0,
              options: bestPriceInfo.options, // POR_MENOR, POR_MAYOR con sus precios
              applied: bestPriceInfo.applied, // Precio seleccionado por defecto
              discounts: bestPriceInfo.applied.autoAppliedDiscounts || []
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
      console.error('Error cargando información de productos:', error);
      this.showToast('error', 'Error cargando información de productos');
    }
  }

  private loadOpenRegister(): void {
    this.cashFlowApi.getOpenRegister(1).subscribe((r: any) => {
      this.currentOpenRegister = r
    })
  }

  private loadRegisters(): void {
    this.cashFlowApi.listRegisters(1).subscribe((list: any) => {
      this.registersList = list as any
    })
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
        const msg = err?.error?.message || err?.message || 'Ya existe una caja abierta. Ciérrala primero.'
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
    this.salesApi.list(this.salesFilters as any).subscribe({
      next: (resp: any) => {
        this.sales = resp.data
        this.totalItems = resp.total
        this.calculateMetrics()
        this.updateCashFlowFromSales()
        this.isLoading = false
        this.showToast('info', `${resp.data.length} ventas cargadas`)
      },
      error: () => {
        this.isLoading = false
        this.showToast('error', 'Error cargando ventas')
      }
    })
  }


  applySalesFilters(): void {
    this.currentPage = 1
    this.loadSales()
  }

  resetSalesFilters(): void {
    this.salesFilters = {
      dateFrom: this.getDateNDaysAgo(30),
      dateTo: this.getToday(),
      customerName: '',
      documentType: null,
      status: null,
    }
    this.applySalesFilters()
    this.showToast('info', 'Filtros limpiados')
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
        this.saleFormData = {
          documentType: 'BOLETA',
          paymentType: 'EFECTIVO',
          lines: [],
          customerId: 0,
          customerName: '',
          customerDocumentNumber: '',
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

  selectProductOrPrice(p: any): void {
    if (!p) return;

    // Obtener precio según cantidad actual (usar best-price endpoint)
    const quantity = this.currentSaleItem.quantity || 1;

    this.pricingQueryApi.getBestPrice(p.id, quantity)
      .subscribe((bestPrice: BestPriceResponse) => {
        if (!bestPrice) return;

        this.currentSaleItem = {
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          quantity: quantity,
          stock: this.productPriceStockMap[p.id]?.stock || 0,
          unitPrice: bestPrice.applied.finalUnitPrice,
          appliedPriceListCode: bestPrice.applied.priceListCode,
          appliedDiscounts: bestPrice.applied.autoAppliedDiscounts
        } as any;

        // Limpiar dropdown y enfocar cantidad
        this.filteredProducts = [];
        this.productSearchText = '';

        if (this.productSearchInput) {
          this.productSearchInput.nativeElement.value = '';
        }

        setTimeout(() => {
          this.quantityInput?.nativeElement?.focus();
        }, 100);
      }, (err) => {
        this.showToast('error', 'Error obteniendo precio del producto');
      });
  }

  onCancelSaleForm(): void {
    this.saleFormData = null
    this.paymentOperationNumber = ''   // <- limpiar
    this.paymentReference = ''
    this.paymentBankName = ''
    this.paymentCardType = ''
    this.activeTab = 'sales'
  }


  onConfirmSale(): void {
    if (!this.saleFormData || !this.saleFormData.lines || this.saleFormData.lines.length === 0) {
      this.showToast('error', 'Agregue al menos un producto')
      return
    }
    if (!this.foundCustomer) {
      this.showToast('error', 'Seleccione un cliente')
      return
    }

    const paymentType = this.saleFormData.paymentType as PaymentType
    const backendMethod = paymentMethodMap[paymentType] || 'CASH'

    // Construir el pago según el tipo
    const paymentData: any = {
      method: backendMethod,
      amount: this.saleFormData.total || 0,
      reference: null,
      bankName: null,
      cardType: null
    }

    // Agregar campos específicos según el método de pago
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
        productId: line.productId,
        quantity: line.quantity,
        lotId: null,
        serialIds: [],
        comboId: null
      })),
      applyAutoDiscounts: true
    }

    this.salesApi.create(createDto).subscribe({
      next: (newSale) => {
        this.showToast('success', 'Venta registrada exitosamente')
        this.onCancelSaleForm()
        this.loadSales()
      },
      error: () => this.showToast('error', 'Error registrando venta')
    })
  }

  // ============================================
  // CUSTOMER SEARCH
  // ============================================

  onSearchCustomer(): void {
    const document = this.customerSearchText.trim()

    // 1. Validación: campo vacío
    if (!document) {
      this.foundCustomer = null
      this.showToast('warning', 'Ingrese un DNI o RUC')
      return
    }

    // 2. Buscar cliente por DNI/RUC usando el nuevo endpoint
    const companyId = 1
    this.bpApi.findByDocument(document, companyId)
      .subscribe({
        next: (customer: any) => {
          if (customer) {
            this.foundCustomer = customer
            this.showToast('success', 'Cliente encontrado')
          }
        },
        error: (error) => {
          console.log('Error buscando cliente:', error);
          if (error.status === 404) {
            // Cliente no encontrado - mostrar formulario de nuevo cliente
            this.foundCustomer = null
            this.showToast('warning', 'Cliente no encontrado')
            this.newCustomerForm = {
              name: '',
              documentNumber: document,
              documentTypeId: null, // Usuario debe seleccionar del dropdown
              address: '',
              email: '',
              phone: '',
              isClient: true,
              isSupplier: false,
            } as any
            this.showNewCustomerModal = true
          } else {
            this.showToast('error', 'Error buscando cliente')
          }
        }
      })
  }


  // ============================================
  // SALE ITEMS
  // ============================================

  onAddSaleItem(): void {
    if (!this.saleFormData) return
    if (!this.currentSaleItem?.productId || !this.currentSaleItem?.quantity) {
      this.showToast('error', 'Llene los datos del producto')
      return
    }

    // Convertir unitPrice a número (viene como string del backend)
    const unitPrice = Number(this.currentSaleItem.unitPrice) || 0;
    const lineTotal = (this.currentSaleItem.quantity || 0) * unitPrice;

    // Obtener información del producto
    const product = this.products.find(p => p.id === this.currentSaleItem.productId)
    if (!product) {
      this.showToast('error', 'Producto inválido')
      return
    }

    // Verificar si el producto tiene lote o seriales
    const productInfo = this.productPriceStockMap[this.currentSaleItem.productId!];
    const hasLot = productInfo?.stockByLot && productInfo.stockByLot.length > 0;
    const hasSerial = product.isSerialized || false;

    const newLine: SaleLine = {
      productId: this.currentSaleItem.productId as number,
      productSku: this.currentSaleItem.productSku || '',
      productName: this.currentSaleItem.productName || '',
      quantity: this.currentSaleItem.quantity as number,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
      hasLot: hasLot,
      hasSerial: hasSerial,
      lotId: null,
      lotCode: undefined,
      expirationDate: undefined,
      serials: []
    }

    // Usar stock del cache para validación actualizada
    const currentStock = this.productPriceStockMap[this.currentSaleItem.productId!]?.stock || 0;
    if (currentStock < this.currentSaleItem.quantity!) {
      this.showToast('error', `Stock insuficiente. Disponible: ${currentStock}`)
      return
    }


    if (!this.saleFormData.lines) this.saleFormData.lines = []
    console.log('Agregando línea:', newLine);
    console.log('Líneas antes:', this.saleFormData.lines.length);
    this.saleFormData.lines.push(newLine)
    console.log('Líneas después:', this.saleFormData.lines.length);

    // Limpiar completamente currentSaleItem
    this.currentSaleItem = {};

    // Limpiar búsqueda
    this.productSearchText = '';
    this.filteredProducts = [];

    this.calculateSaleTotals()
    this.showToast('success', 'Producto agregado')
  }

  onRemoveSaleItem(index: number): void {
    if (!this.saleFormData?.lines) return
    this.saleFormData.lines.splice(index, 1)
    this.calculateSaleTotals()
    this.showToast('success', 'Producto eliminado')
  }

  // Alternar visibilidad de detalles de lote/seriales en línea de venta
  toggleLineDetails(index: number): void {
    if (this.expandedLines.has(index)) {
      this.expandedLines.delete(index);
    } else {
      this.expandedLines.add(index);
    }
  }

  // Verificar si una línea está expandida
  isLineExpanded(index: number): boolean {
    return this.expandedLines.has(index);
  }

  private calculateSaleTotals(): void {
    if (!this.saleFormData?.lines) return
    const total = this.saleFormData.lines.reduce((sum, line) => sum + line.lineTotal, 0)
    this.saleFormData.subtotal = total / 1.18
    this.saleFormData.igv = total - (this.saleFormData.subtotal || 0)
    this.saleFormData.total = total
  }

  // ============================================
  // CREDIT NOTES
  // ============================================

  onOpenCreditNoteModal(sale: Sale): void {
    if (sale.status !== 'EMITIDO') {
      this.showToast('warning', 'Solo se pueden crear notas de crédito para ventas emitidas')
      return
    }
    this.creditNoteFormData = {
      saleId: sale.id,
      saleSeries: sale.documentSeries,
      saleNumber: sale.documentNumber,
      series: 'NC01',
      currency: 'PEN',
      totalTaxableAmount: sale.subtotal,
      totalIgv: sale.igv,
      grandTotal: sale.total,
    }
    this.showCreditNoteModal = true
  }

  onConfirmCreditNote(): void {
    this.showToast('success', 'Nota de crédito emitida')
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
      senderAddress: 'Dirección de tu empresa',
      arrivalAddress: '',
      items: sale.lines.map((line) => ({
        id: 0,
        shippingGuideId: 0,
        productId: line.productId,
        itemCode: line.productSku,
        description: line.productName,
        unitOfMeasure: 'UND',
        quantity: line.quantity,
        weightKg: 0,
        packages: 1,
      })),
    }
    this.showDispatchGuideModal = true
  }

  onConfirmDispatchGuide(): void {
    this.showToast('success', 'Guía de remisión emitida')
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
    this.salesApi.cancel(this.saleToCancel.id, { reason: 'ANULADA', observations: '' } as any).subscribe({
      next: () => {
        this.saleToCancel!.status = 'ANULADO'
        this.calculateMetrics()
        this.showToast('success', 'Venta anulada')
        this.closeCancelModal()
      },
      error: () => this.showToast('error', 'Error anulando venta')
    })
  }

  closeCancelModal(): void {
    this.showCancelConfirmModal = false
    this.saleToCancel = null
  }

  // ============================================
  // VIEW
  // ============================================

  onViewSale(sale: Sale): void {
    // Si la lista ya trae las líneas completas (como en tu mock actual):
    this.selectedSale = sale;

    // Si en producción el backend solo devuelve un resumen y necesitas pedir el detalle,
    // puedes usar esto más adelante (y comentar la línea de arriba):
    //
    // this.selectedSale = null;
    // this.mockService.getSaleById(sale.id).then((detail) => {
    //   this.selectedSale = detail;
    // });
  }

  onDownloadSalePdf(sale: Sale): void {
    this.showToast('success', `Descargando ${sale.documentSeries}-${sale.documentNumber}.pdf`)
  }

  closeDetailDrawer(): void {
    this.selectedSale = null
  }


  // ============================================
  // HELPERS
  // ============================================

  getDateNDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0]
  }

  getStatusLabel(status: SaleStatus): string {
    const labels = { PENDIENTE: 'Pendiente', EMITIDO: 'Emitido', ANULADO: 'Anulado' }
    return labels[status] || status
  }

  getPaymentLabel(payment: PaymentType): string {
    const labels = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', CREDITO: 'Crédito' }
    return labels[payment] || payment
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
    let csv = 'Fecha,Tipo,Número,Cliente,Total,Estado\n'
    this.sales.forEach((sale) => {
      csv += `"${sale.saleDate}","${sale.documentType}","${sale.documentSeries}-${sale.documentNumber}","${sale.customerName}",${sale.total},"${this.getStatusLabel(sale.status)}"\n`
    })
    this.downloadFile(csv, `ventas-${this.getToday()}.csv`, 'text/csv')
    this.showToast('success', 'CSV exportado')
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
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
      totalCancelled: this.sales.filter((s) => s.status === 'ANULADO').length,
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
    // Validaciones básicas
    if (!this.newCustomerForm.name?.trim()) {
      this.showToast('error', 'El nombre es requerido');
      return;
    }

    if (!this.newCustomerForm.documentTypeId) {
      this.showToast('error', 'Seleccione un tipo de documento');
      return;
    }

    if (!this.validateDocumentNumber()) {
      this.showToast('error', `El número de documento debe tener ${this.documentDigitsHint} dígitos`);
      return;
    }

    const payload: any = {
      companyId: 1,
      name: this.newCustomerForm.name,
      documentNumber: this.newCustomerForm.documentNumber,
      documentTypeId: this.newCustomerForm.documentTypeId,
      isClient: true,
      isSupplier: false,
      address: this.newCustomerForm.address || '',
      email: this.newCustomerForm.email || '',
      phone: this.newCustomerForm.phone || '',
      city: this.newCustomerForm.city || '',
      country: this.newCustomerForm.country || '',
    }

    this.bpApi.create(payload).subscribe({
      next: (created) => {
        this.foundCustomer = created as any
        this.customerSearchText = (created as any).documentNumber
        this.showToast('success', 'Cliente registrado')
        this.showNewCustomerModal = false
      },
      error: () => this.showToast('error', 'Error registrando cliente')
    })
  }

  //PRODUCTOS
  filterProducts(): void {
    const query = (this.productSearchText || '').trim().toLowerCase()

    if (!query) {
      // Si se borra el texto, cerramos el dropdown
      this.filteredProducts = []
      return
    }

    this.filteredProducts = this.products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    )
  }


  selectProduct(product: Product): void {
    this.currentSaleItem.productId = product.id
    this.currentSaleItem.productSku = product.sku
    this.currentSaleItem.productName = product.name
    this.currentSaleItem.unitPrice = product.salePrice

    // Por defecto cantidad 1 si no hay nada
    this.currentSaleItem.quantity = this.currentSaleItem.quantity || 1

    // Cerramos el dropdown
    this.filteredProducts = []

    // Pasar el foco al input de cantidad
    setTimeout(() => {
      if (this.quantityInput) {
        this.quantityInput.nativeElement.focus()
        this.quantityInput.nativeElement.select()
      }
    }, 0)
  }

  onQuantityEnter(): void {
    this.onAddSaleItem()

    // Después de agregar, volvemos el foco al buscador
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
      isClient: true,
      isSupplier: false,
    }

    this.showNewCustomerModal = true
  }

  // CAJA: abrir/cerrar usando backend (fase 2)
  openCashRegister(): void {
    this.loadRegisters()
    const code = (this.cashBoxCode || 'CajaPrincipal').trim()
    const payload: any = { openingBalance: this.openingBalanceTemp ?? 0, observations: '' }
    this.cashFlowApi.openRegister(1, code, payload).subscribe({
      next: (reg) => {
        this.currentCashRegister = reg
        this.showToast('success', 'Caja abierta')
      },
      error: () => this.showToast('error', 'Error abriendo caja')
    })
  }

  closeCashRegister(): void {
    const code = (this.cashBoxCode || 'CajaPrincipal').trim();
    const payload: any = { actualCash: this.currentCashRegister?.currentBalance ?? 0, observations: '' };
    this.cashFlowApi.closeRegister(1, code, payload).subscribe({
      next: (res) => {
        this.currentCashRegister = null;
        this.showToast('success', 'Caja cerrada');
      },
      error: () => this.showToast('error', 'Error cerrando caja')
    });
  }

  //ACTUALIZAR FLUJO DE CAJA
  private updateCashFlowFromSales(): void {
    if (!this.sales || this.sales.length === 0) {
      this.cashFlowEntries = []
      this.cashFlowMetrics = { total: 0, cash: 0, card: 0, transfer: 0, credit: 0 }
      return
    }

    const from = this.cashFlowFilters.dateFrom
    const to = this.cashFlowFilters.dateTo
    const paymentType = this.cashFlowFilters.paymentType

    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null

    const entries = this.sales.filter(s => {
      // Solo ventas emitidas
      if (s.status !== 'EMITIDO') return false

      const d = new Date(s.saleDate)

      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      if (paymentType && s.paymentType !== paymentType) return false

      return true
    })

    this.cashFlowEntries = entries

    const metrics = { total: 0, cash: 0, card: 0, transfer: 0, credit: 0 }

    for (const e of entries) {
      metrics.total += e.total
      if (e.paymentType === 'EFECTIVO') metrics.cash += e.total
      if (e.paymentType === 'TARJETA') metrics.card += e.total
      if (e.paymentType === 'TRANSFERENCIA') metrics.transfer += e.total
      if (e.paymentType === 'CREDITO') metrics.credit += e.total
    }

    this.cashFlowMetrics = metrics
  }

  //FILTROS PARA EL FLUJO DE CAJA
  applyCashFlowFilters(): void {
    this.updateCashFlowFromSales()
  }

  resetCashFlowFilters(): void {
    this.cashFlowFilters = {
      dateFrom: this.getDateNDaysAgo(30),
      dateTo: this.getToday(),
      paymentType: null
    }
    this.updateCashFlowFromSales()
  }

  // Métodos para obtener información del pricing
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
    // Esto debería venir del backend, por ahora es una suposición
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

  // Helper para calcular total por método de pago
  getTotalForPaymentMethod(method: string): number {
    // Por ahora, dividir equitativamente entre todos los métodos
    // Esto podría mejorarse según los requerimientos
    const totalMethods = this.selectedPaymentMethods.length;
    const grandTotal = this.saleFormData?.total || 0;

    if (totalMethods === 0) return 0;

    // Asignar el total completo al primer método o dividir equitativamente
    if (totalMethods === 1) {
      return grandTotal;
    }

    // Dividir equitativamente
    const perMethod = grandTotal / totalMethods;
    const isLastMethod = this.selectedPaymentMethods[this.selectedPaymentMethods.length - 1] === method;

    return isLastMethod ? grandTotal - (perMethod * (totalMethods - 1)) : perMethod;
  }

  // Helper para generar número de documento usando series activas
  private generateDocumentSeries(): string {
    // Simular serie activa (en producción vendría del backend)
    const documentType = this.saleFormData?.documentType;
    const activeSeries = this.documentSeries.find(s =>
      s.documentType === documentType && s.isActive
    );
    return activeSeries?.code || (documentType === 'BOLETA' ? 'B001' : 'F001');
  }

  // Helper para generar número de documento usando series activas
  private generateDocumentNumber(): string {
    // Simular siguiente número (en producción vendría del backend)
    const documentType = this.saleFormData?.documentType;
    const activeSeries = this.documentSeries.find(s =>
      s.documentType === documentType && s.isActive
    );

    if (activeSeries) {
      return activeSeries.currentNumber.toString().padStart(8, '0');
    }

    // Fallback a número aleatorio
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
      createdBy: 'system', // En producción, usar usuario actual
    };
    this.showDocumentSeriesForm = true;
  }

  saveDocumentSeries(): void {
    if (!this.documentSeriesForm.code || !this.documentSeriesForm.name) {
      this.showToast('warning', 'Complete todos los campos obligatorios');
      return;
    }

    if (this.documentSeriesEditMode && this.selectedDocumentSeries) {
      // Modo edición
      const updateDto: UpdateDocumentSeriesDto = {
        name: this.documentSeriesForm.name,
        isActive: this.documentSeriesForm.isActive,
        updatedBy: 'system', // En producción, usar usuario actual
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
      // Modo creación
      const createDto: CreateDocumentSeriesDto = {
        companyId: this.COMPANY_ID,
        documentType: this.documentSeriesForm.documentType!,
        code: this.documentSeriesForm.code,
        name: this.documentSeriesForm.name,
        isActive: this.documentSeriesForm.isActive!,
        startingNumber: this.documentSeriesForm.startingNumber,
        createdBy: 'system', // En producción, usar usuario actual
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
    if (!confirm('¿Está seguro de que desea eliminar esta serie? Esta acción no se puede deshacer.')) {
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
      updatedBy: 'system', // En producción, usar usuario actual
    };

    this.documentSeriesApi.update(series.id, updateDto).subscribe({
      next: () => {
        this.showToast('success', `Serie ${series.isActive ? 'desactivada' : 'activada'} correctamente`);
        this.loadDocumentSeries();
      },
      error: (err) => {
        console.error('Error cambiando estado de serie:', err);
        this.showToast('error', 'Error cambiando estado de serie');
      },
    });
  }

  getNextNumberForDocumentType(documentType: DocumentType): void {
    this.documentSeriesApi.getNextNumberFormatted(this.COMPANY_ID, documentType).subscribe({
      next: (response) => {
        this.showToast('info', `Próximo número para ${documentType}: ${response.formatted}`);
      },
      error: (err) => {
        console.error('Error obteniendo siguiente número:', err);
        this.showToast('error', 'Error obteniendo siguiente número');
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
  getDocumentTypeLabel(documentType: DocumentType): string {
    switch (documentType) {
      case 'BOLETA':
        return 'Boleta';
      case 'FACTURA':
        return 'Factura';
      case 'NOTA_PEDIDO':
        return 'Nota de Pedido';
      default:
        return documentType;
    }
  }


  // Métodos en la clase Ventas
  countActiveSeries(): number {
    return this.documentSeries.filter(s => s.isActive).length;
  }

  countSeriesByType(type: string): number {
    return this.documentSeries.filter(s => s.documentType === type).length;
  }

  // Método para formatear los seriales
  formatSerials(serials: Array<{ serialCode: string }>): string {
    return serials?.map(s => s.serialCode).join(', ') || '';
  }
}