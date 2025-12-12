import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';


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

// ============================================
// MOCK DATA SERVICE
// ============================================

class SalesMockService {
  private mockProducts: Product[] = [
    { id: 1, sku: 'RAM-001', name: 'RAM DDR4 16GB', categoryId: 1, baseUnitId: 1, isSerialized: false, managesExpiration: false, minStock: 5, maxStock: 50, reorderPoint: 10, salePrice: 590.00, stock: 10 },
    { id: 2, sku: 'SSD-001', name: 'SSD NVMe 1TB', categoryId: 1, baseUnitId: 1, isSerialized: true, managesExpiration: false, minStock: 3, maxStock: 30, reorderPoint: 5, salePrice: 1062.00, stock: 20 },
    { id: 3, sku: 'USB-001', name: 'USB 3.0 32GB', categoryId: 1, baseUnitId: 1, isSerialized: false, managesExpiration: false, minStock: 10, maxStock: 100, reorderPoint: 20, salePrice: 254.00, stock: 15 },
    { id: 4, sku: 'MICRO-001', name: 'Micrófono Gamer RGB', categoryId: 2, baseUnitId: 1, isSerialized: true, managesExpiration: false, minStock: 2, maxStock: 20, reorderPoint: 4, salePrice: 847.00, stock: 30 },
  ]

  private mockCustomers: BusinessPartner[] = [
    { id: 1, companyId: 1, name: 'TechStore SAC', tradeName: 'TechStore', documentTypeId: 1, documentNumber: '20123456789', email: 'info@techstore.pe', phone: '+51987654321', address: 'Jr. Tecnología 123', city: 'Lima', country: 'PE', isClient: true, isSupplier: false },
    { id: 2, companyId: 1, name: 'Juan Pérez López', documentTypeId: 2, documentNumber: '12345678', email: 'juan@email.com', phone: '+51912345678', address: 'Av. Principal 456', city: 'Lima', country: 'PE', isClient: true, isSupplier: false },
    { id: 3, companyId: 1, name: 'Empresa Global IT', documentTypeId: 1, documentNumber: '20987654321', email: 'ventas@globalit.com', phone: '+51998765432', address: 'Av. Tecnológica 789', city: 'Lima', country: 'PE', isClient: true, isSupplier: false },
  ]

  private mockSales: Sale[] = [
    {
      id: 1,
      saleDate: '2025-01-15',
      documentType: 'FACTURA',
      documentSeries: 'F001',
      documentNumber: '00004052',
      customerId: 1,
      customerName: 'TechStore SAC',
      customerDocumentNumber: '20123456789',
      paymentType: 'TRANSFERENCIA',
      status: 'EMITIDO',
      subtotal: 8474.58,
      igv: 1525.42,
      total: 10000.00,
      lines: [
        { productId: 1, productSku: 'RAM-001', productName: 'RAM DDR4 16GB', quantity: 5, unitPrice: 590.00, lineTotal: 2950.00 },
        { productId: 2, productSku: 'SSD-001', productName: 'SSD NVMe 1TB', quantity: 3, unitPrice: 1062.00, lineTotal: 3186.00 },
      ],
    },
    {
      id: 2,
      saleDate: '2025-01-14',
      documentType: 'BOLETA',
      documentSeries: 'B001',
      documentNumber: '00000856',
      customerId: 2,
      customerName: 'Juan Pérez López',
      customerDocumentNumber: '12345678',
      paymentType: 'EFECTIVO',
      status: 'EMITIDO',
      subtotal: 2118.64,
      igv: 381.36,
      total: 2500.00,
      lines: [
        { productId: 3, productSku: 'USB-001', productName: 'USB 3.0 32GB', quantity: 10, unitPrice: 254.00, lineTotal: 2540.00 },
      ],
    },
  ]

  getProducts(): Promise<Product[]> {
    return new Promise((resolve) => setTimeout(() => resolve(this.mockProducts), 300))
  }

  getCustomers(): Promise<BusinessPartner[]> {
    return new Promise((resolve) => setTimeout(() => resolve(this.mockCustomers), 300))
  }

  getSales(filters?: any): Promise<{ items: Sale[]; total: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ items: this.mockSales, total: this.mockSales.length })
      }, 500)
    })
  }

  getSaleById(id: number): Promise<Sale> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.mockSales.find((s) => s.id === id) || this.mockSales[0])
      }, 300)
    })
  }

  createSale(createSaleDto: CreateSaleDto): Promise<Sale> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newSale: Sale = {
          id: Math.max(...this.mockSales.map((s) => s.id)) + 1,
          saleDate: new Date().toISOString().split('T')[0],
          documentType: createSaleDto.documentType,
          documentSeries: 'F001',
          documentNumber: String(Math.max(...this.mockSales.map((s) => parseInt(s.documentNumber))) + 1).padStart(8, '0'),
          customerId: createSaleDto.customerId,
          customerName: this.mockCustomers.find((c) => c.id === createSaleDto.customerId)?.name || '',
          customerDocumentNumber: this.mockCustomers.find((c) => c.id === createSaleDto.customerId)?.documentNumber || '',
          paymentType: createSaleDto.paymentType,
          status: 'EMITIDO',
          lines: createSaleDto.lines.map((line) => {
            const product = this.mockProducts.find((p) => p.id === line.productId)
            return {
              productId: line.productId,
              productSku: product?.sku || '',
              productName: product?.name || '',
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            }
          }),
          subtotal: 0,
          igv: 0,
          total: 0,
        }
        const total = newSale.lines.reduce((sum, line) => sum + line.lineTotal, 0)
        newSale.subtotal = total / 1.18
        newSale.igv = total - newSale.subtotal
        newSale.total = total
        this.mockSales.push(newSale)
        resolve(newSale)
      }, 500)
    })
  }

  cancelSale(id: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const sale = this.mockSales.find((s) => s.id === id)
        if (sale) sale.status = 'ANULADO'
        resolve()
      }, 300)
    })
  }
}

// ============================================
// COMPONENT
// ============================================


@Component({
  selector: 'app-ventas',
  standalone: false,
  templateUrl: './ventas.html',
  styleUrl: './ventas.scss'
})
export class Ventas implements OnInit {

  constructor() { }

  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>
  @ViewChild('quantityInput') quantityInput!: ElementRef<HTMLInputElement>


  // STATE
  sales: Sale[] = []
  selectedSale: Sale | null = null
  isLoading = false
  toasts: Toast[] = []

  // UI STATES
  activeTab: 'sales' | 'cashflow' | 'create' = 'sales'
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

  // API
  private mockService = new SalesMockService()

  ngOnInit(): void {
    this.loadSales()
    this.mockService.getProducts().then(p => this.products = p)

  }

  // ============================================
  // LOADING & SEARCH
  // ============================================

  loadSales(): void {
    this.isLoading = true
    this.mockService.getSales(this.salesFilters).then((response) => {
      this.sales = response.items
      this.totalItems = response.total
      this.calculateMetrics()
      this.updateCashFlowFromSales()     // <--- NUEVO
      this.isLoading = false
      this.showToast('info', `${response.items.length} ventas cargadas`)
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
    this.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'EFECTIVO',
      lines: [],
      customerId: 0,
      customerName: '',
      customerDocumentNumber: '',
    }
    this.paymentOperationNumber = ''   // <- limpiar
    this.activeTab = 'create'
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

    const createDto: CreateSaleDto = {
      documentType: this.saleFormData.documentType as DocumentTypeCode,
      customerId: this.foundCustomer.id,
      paymentType: this.saleFormData.paymentType as PaymentType,
      lines: this.saleFormData.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    }

    this.mockService.createSale(createDto).then((newSale) => {
      this.showToast('success', 'Venta registrada exitosamente')
      this.onCancelSaleForm()
      this.loadSales()          // recargamos desde el "backend" mock
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

    // 2. Buscar en la “BD”
    this.mockService.getCustomers().then((customers) => {
      const customer = customers.find((c) => c.documentNumber === document)

      if (customer) {
        // Cliente encontrado
        this.foundCustomer = customer
        this.showToast('success', 'Cliente encontrado')
        console.log('Cliente encontrado')
      } else {
        // Cliente NO encontrado → mostrar modal y prellenar documento
        this.foundCustomer = null
        this.showToast('warning', 'Cliente no encontrado')
        console.log('Cliente no encontrado')

        this.newCustomerForm = {
          name: '',
          documentNumber: document,
          documentTypeId: document.length === 8 ? 2 : 1, // 1=RUC,2=DNI
          address: '',
          email: '',
          phone: '',
          isClient: true,
          isSupplier: false,
        }
        this.showNewCustomerModal = true
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

    const lineTotal = (this.currentSaleItem.quantity || 0) * (this.currentSaleItem.unitPrice || 0)
    const newLine: SaleLine = {
      productId: this.currentSaleItem.productId as number,
      productSku: this.currentSaleItem.productSku || '',
      productName: this.currentSaleItem.productName || '',
      quantity: this.currentSaleItem.quantity as number,
      unitPrice: this.currentSaleItem.unitPrice as number,
      lineTotal: lineTotal,
    }

    const product = this.products.find(p => p.id === this.currentSaleItem.productId)
    if (!product) {
      this.showToast('error', 'Producto inválido')
      return
    }
    if (product.stock < this.currentSaleItem.quantity!) {
      this.showToast('error', `Stock insuficiente. Disponible: ${product.stock}`)
      return
    }


    if (!this.saleFormData.lines) this.saleFormData.lines = []
    this.saleFormData.lines.push(newLine)
    this.currentSaleItem = {}
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
    this.mockService.cancelSale(this.saleToCancel.id).then(() => {
      this.saleToCancel!.status = 'ANULADO'
      this.calculateMetrics()
      this.showToast('success', 'Venta anulada')
      this.closeCancelModal()
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
    const newId = Math.max(...this.mockService['mockCustomers'].map(c => c.id)) + 1

    const newCustomer: BusinessPartner = {
      id: newId,
      companyId: 1,
      name: this.newCustomerForm.name!,
      documentTypeId: this.newCustomerForm.documentTypeId!,
      documentNumber: this.newCustomerForm.documentNumber!,
      address: this.newCustomerForm.address || '',
      email: this.newCustomerForm.email || '',
      phone: this.newCustomerForm.phone || '',
      city: 'Lima',
      country: 'PE',
      isClient: true,
      isSupplier: false,
    }

    this.mockService['mockCustomers'].push(newCustomer)
    this.foundCustomer = newCustomer
    this.customerSearchText = newCustomer.documentNumber  // <- NUEVO
    this.showToast('success', 'Cliente registrado')
    this.showNewCustomerModal = false

  }

  //PRODUCTOS
  filterProducts(): void {
    const query = (this.currentSaleItem.productName || '').trim().toLowerCase()

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
