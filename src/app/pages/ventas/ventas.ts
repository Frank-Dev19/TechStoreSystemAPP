import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { SalesApiService } from '../../services/sales/sales-api.service';
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
export type PaymentType = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'
export type SaleStatus = 'PENDIENTE' | 'EMITIDO' | 'ANULADO'

export interface SaleLine {
  productId: number
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
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

export interface CreateSaleDto {
  documentType: DocumentTypeCode
  customerId: number
  paymentType: PaymentType
  lines: {
    productId: number
    quantity: number
    unitPrice: number
  }[]
}

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
    private cashFlowApi: CashFlowApiService,
    private bpApi: BusinessPartnersApiService,
    private productsApi: ProductsApiService,
    private pricingStockApi: PricingStockApiService,
    private pricingProductsApi: PricingProductsApiService,
    private stockService: StockService,
    private documentTypesApi: DocumentTypesApiService
  ) { }

  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>
  @ViewChild('quantityInput') quantityInput!: ElementRef<HTMLInputElement>


  // STATE
  sales: Sale[] = []
  selectedSale: Sale | null = null
  isLoading = false

  // Cache para precios y stock de productos
  productPriceStockMap: { [productId: number]: { price: number; stock: number } } = {}

  // Búsqueda de productos (separado de currentSaleItem)
  productSearchText = ''

  // Tipos de documento para nuevo cliente
  documentTypesB: DocumentTypeResponse[] = []
  documentDigitsHint: number | null = null
  toasts: Toast[] = []

  // UI STATES
  activeTab: 'sales' | 'cashflow' | 'create' | 'cashbox' = 'sales'
  showCreditNoteModal = false
  showDispatchGuideModal = false
  showCancelConfirmModal = false
  showLotSerialModal = false
  saleToCancel: Sale | null = null
  //showDetailDrawer = false
  showNewCustomerModal = false
  newCustomerForm: Partial<BusinessPartner> = {}


  // FORM DATA
  saleFormData: Partial<Sale> | null = null
  creditNoteFormData: Partial<CreditNote> | null = null
  dispatchGuideFormData: Partial<ShippingGuide> | null = null
  currentSaleItem: Partial<SaleLine> = {}
  customerSearchText = ''
  foundCustomer: BusinessPartner | null = null
  selectedPaymentMethods: PaymentType[] = []

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

      // Crear mapa de stock por productId
      const stockMap: { [productId: number]: number } = {};
      stockData.forEach(stock => {
        stockMap[stock.product_id] = stock.qty_on_hand;
      });

      // Para cada producto, obtener su precio y llenar el cache
      const priceListId = 1;
      for (const product of products) {
        try {
          const priceInfo = await lastValueFrom(
            this.pricingStockApi.getProductPriceStock(product.id, priceListId)
          );

          if (priceInfo) {
            this.productPriceStockMap[product.id] = {
              price: priceInfo.finalPrice,
              stock: stockMap[product.id] || 0
            };
          }
        } catch (err) {
          console.warn(`No se pudo obtener precio para producto ${product.id}:`, err);
          // Usar valores por defecto
          this.productPriceStockMap[product.id] = {
            price: 0,
            stock: stockMap[product.id] || 0
          };
        }
      }

      console.log('Cache de precios y stock cargado:', this.productPriceStockMap);
    } catch (error) {
      console.error('Error cargando precios y stock:', error);
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
        this.paymentOperationNumber = ''   // <- limpiar
        this.activeTab = 'create'
      },
      error: () => {
        this.showNoOpenCashModal = true
      }
    })
  }

  // selectProductOrPrice(p: any): void {
  //   if (!p) return;
  //   const priceListId = 1;
  //   const customerId = this.foundCustomer?.id;
  //   this.pricingStockApi.getProductPriceStock(p.id, priceListId, customerId).subscribe((info: ProductPriceStockInfo) => {
  //     if (!info) return;
  //     this.currentSaleItem = {
  //       productId: p.id,
  //       productName: p.name,
  //       stock: info.stock,
  //       unitPrice: info.finalPrice,
  //       priceListId: info.priceListId,
  //       basePrice: info.basePrice
  //     } as any;
  //   }, (err) => {
  //     this.showToast('error', 'Error obteniendo precio/stock');
  //   });
  // }

  selectProductOrPrice(p: any): void {
    if (!p) return;
    const priceListId = 1;
    const customerId = this.foundCustomer?.id;
    this.pricingStockApi.getProductPriceStock(p.id, priceListId, customerId).subscribe((info: ProductPriceStockInfo) => {
      if (!info) return;
      this.currentSaleItem = {
        productId: p.id,
        productName: p.name,
        productSku: p.sku,
        stock: info.stock,
        unitPrice: info.finalPrice,
        priceListId: info.priceListId,
        basePrice: info.basePrice,
        quantity: this.currentSaleItem.quantity || 1
      } as any;

      // Limpiar filteredProducts para cerrar dropdown
      this.filteredProducts = [];

      // Limpiar el input de búsqueda
      this.productSearchText = '';
      if (this.productSearchInput) {
        this.productSearchInput.nativeElement.value = '';
      }

      // Enfocar input de cantidad
      setTimeout(() => {
        this.quantityInput?.nativeElement?.focus();
      }, 100);
    }, (err) => {
      this.showToast('error', 'Error obteniendo precio/stock');
    });
  }

  onCancelSaleForm(): void {
    this.saleFormData = null
    this.paymentOperationNumber = ''   // <- limpiar
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

    const createDto: any = {
      documentType: this.saleFormData.documentType as any,
      customerId: this.foundCustomer.id,
      paymentType: this.saleFormData.paymentType as any,
      lines: this.saleFormData.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))
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
    const newLine: SaleLine = {
      productId: this.currentSaleItem.productId as number,
      productSku: this.currentSaleItem.productSku || '',
      productName: this.currentSaleItem.productName || '',
      quantity: this.currentSaleItem.quantity as number,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
    }

    const product = this.products.find(p => p.id === this.currentSaleItem.productId)
    if (!product) {
      this.showToast('error', 'Producto inválido')
      return
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
    const code = (this.cashBoxCode || 'CajaPrincipal').trim()
    const payload: any = { actualCash: this.currentCashRegister?.currentBalance ?? 0, observations: '' }
    this.cashFlowApi.closeRegister(1, code, payload).subscribe({
      next: (res) => {
        this.currentCashRegister = null
        this.showToast('success', 'Caja cerrada')
      },
      error: () => this.showToast('error', 'Error cerrando caja')
    })
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


}
