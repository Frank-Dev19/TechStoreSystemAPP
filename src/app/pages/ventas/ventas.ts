

// src/app/modules/ventas/ventas.component.ts
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { CashFlowApiService } from '../../services/sales/cash-flow-api.service';
import { BusinessPartnersApiService } from '../../services/business-partners-api.service';
import { Sale } from '../../models/sales/sale.model';
import { CreateSaleDto, FilterSalesParams, CancelSaleDto } from '../../models/sales/sale.dto';
import { SimulateSaleDto } from '../../models/sales/simulate.dto';
import { SimulateSaleResponse } from '../../models/sales/simulate.response';
import { DocumentType, SaleStatus, SaleType, PaymentMethod } from '../../models/sales/enums';
import { BusinessPartnerResponse } from '../../models/business-partners/business-partners-response';
import { CashRegister } from '../../models/cash/cash-register.model';
import { CashFlowTransaction } from '../../models/cash/cash-flow-transaction.model';
import { CloseCashRegisterDto, OpenCashRegisterDto } from '../../models/cash/cash-flow.dto';

interface Toast {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface SaleFormData {
  companyId: number;
  customerId: number;
  documentType: DocumentType;
  series: string;
  number: string;
  saleType: SaleType;
  issueDate: string;
  priceListCode?: string;
  applyAutoDiscounts: boolean;
  items: SaleItemFormData[];
  payments: PaymentFormData[];
  observations?: string;
}

interface SaleItemFormData {
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  baseUnitPrice: number;
  finalUnitPrice: number;
  lineTotal: number;
  lotId?: number;
  serialIds?: number[];
  comboId?: number;
}

interface PaymentFormData {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  bankName?: string;
  cardType?: string;
}

interface CurrentSaleItem {
  productId?: number;
  productName?: string;
  productSku?: string;
  quantity?: number;
  unitPrice?: number;
}

interface ProductSearchResult {
  id: number;
  sku: string;
  name: string;
  salePrice: number;
  stock: number;
}

@Component({
  selector: 'app-ventas',
  standalone: false,
  templateUrl: './ventas.html',
  styleUrl: './ventas.scss'
})
export class Ventas implements OnInit {
  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('quantityInput') quantityInput!: ElementRef<HTMLInputElement>;

  // CONFIGURACIÓN
  private readonly COMPANY_ID = 1;
  private readonly CASH_REGISTER_CODE = 'CAJA-01';

  // STATE
  sales: Sale[] = [];
  selectedSale: Sale | null = null;
  isLoading = false;
  toasts: Toast[] = [];
  cashRegister: CashRegister | null = null;

  // UI STATES
  activeTab: 'sales' | 'create' | 'cashflow' = 'sales';
  showCancelConfirmModal = false;
  saleToCancel: Sale | null = null;
  showNewCustomerModal = false;
  showOpenCashModal = false;
  showCloseCashModal = false;

  // FORM DATA
  saleFormData: SaleFormData | null = null;
  currentSaleItem: CurrentSaleItem = {};
  customerSearchText = '';
  foundCustomer: BusinessPartnerResponse | null = null;
  newCustomerForm: any = {};
  simulationResult: SimulateSaleResponse | null = null;

  // PRODUCTOS
  filteredProducts: ProductSearchResult[] = [];

  // CASH REGISTER
  openCashForm: OpenCashRegisterDto = { openingBalance: 0 };
  closeCashForm: CloseCashRegisterDto = { actualCash: 0 };

  // PAGINATION
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;

  // FILTERS
  salesFilters: FilterSalesParams = {
    companyId: this.COMPANY_ID,
    dateFrom: this.getDateNDaysAgo(30),
    dateTo: this.getToday(),
    page: 1,
    limit: 20
  };

  cashFlowFilters = {
    companyId: this.COMPANY_ID,
    dateFrom: this.getDateNDaysAgo(30),
    dateTo: this.getToday()
  };
  cashFlowEntries: CashFlowTransaction[] = [];

  // METRICS
  metrics = {
    totalSales: 0,
    confirmedSales: 0,
    cancelledSales: 0,
    totalAmount: 0,
    totalDiscounts: 0,
    averageSale: 0
  };

  cashFlowMetrics = {
    total: 0,
    cash: 0,
    card: 0,
    transfer: 0,
    yape: 0,
    plin: 0
  };

  // ENUMS
  DocumentType = DocumentType;
  SaleStatus = SaleStatus;
  SaleType = SaleType;
  PaymentMethod = PaymentMethod;

  constructor(
    private salesApi: SalesApiService,
    private cashFlowApi: CashFlowApiService,
    private businessPartnersApi: BusinessPartnersApiService
  ) { }

  ngOnInit(): void {
    this.loadCashRegister();
    this.loadSales();
  }

  loadCashRegister(): void {
    this.cashFlowApi.getRegister(this.COMPANY_ID, this.CASH_REGISTER_CODE).subscribe({
      next: (register) => {
        this.cashRegister = register;
        if (register?.status === 'OPEN') {
          this.showToast('success', `Caja ${register.name} está abierta`);
        }
      },
      error: (err) => {
        console.error('Error loading cash register:', err);
        this.showToast('warning', 'No se pudo cargar la caja registradora');
      }
    });
  }

  onOpenCashRegister(): void {
    this.showOpenCashModal = true;
    this.openCashForm = { openingBalance: 0 };
  }

  confirmOpenCash(): void {
    this.cashFlowApi.openRegister(this.COMPANY_ID, this.CASH_REGISTER_CODE, this.openCashForm).subscribe({
      next: (register) => {
        this.cashRegister = register;
        this.showToast('success', 'Caja abierta exitosamente');
        this.showOpenCashModal = false;
      },
      error: (err) => {
        console.error('Error opening cash:', err);
        this.showToast('error', err.error?.message || 'Error al abrir caja');
      }
    });
  }

  onCloseCashRegister(): void {
    if (!this.cashRegister || this.cashRegister.status !== 'OPEN') {
      this.showToast('warning', 'No hay caja abierta');
      return;
    }
    this.showCloseCashModal = true;
    this.closeCashForm = {
      actualCash: this.cashRegister.expectedBalance || 0
    };
  }

  confirmCloseCash(): void {
    this.cashFlowApi.closeRegister(this.COMPANY_ID, this.CASH_REGISTER_CODE, this.closeCashForm).subscribe({
      next: (response) => {
        this.cashRegister = response.register;
        this.showToast('success', 'Caja cerrada exitosamente');
        this.showCloseCashModal = false;

        const diff = response.summary.cashDifference;
        if (Math.abs(diff) > 0.01) {
          const msg = diff > 0 ? `Sobrante: S/ ${diff.toFixed(2)}` : `Faltante: S/ ${Math.abs(diff).toFixed(2)}`;
          this.showToast('warning', msg);
        }
      },
      error: (err) => {
        console.error('Error closing cash:', err);
        this.showToast('error', err.error?.message || 'Error al cerrar caja');
      }
    });
  }

  loadSales(): void {
    this.isLoading = true;
    this.salesApi.list(this.salesFilters).subscribe({
      next: (response) => {
        this.sales = response.data;
        this.totalItems = response.total;
        this.calculateMetrics();
        this.isLoading = false;
        this.showToast('info', `${response.data.length} ventas cargadas`);
      },
      error: (err) => {
        console.error('Error loading sales:', err);
        this.isLoading = false;
        this.showToast('error', 'Error al cargar ventas');
      }
    });
  }

  loadMetrics(): void {
    this.salesApi.metrics(
      this.COMPANY_ID,
      this.salesFilters.dateFrom,
      this.salesFilters.dateTo
    ).subscribe({
      next: (metrics) => {
        this.metrics = {
          totalSales: metrics.totalSales,
          confirmedSales: metrics.confirmedSales,
          cancelledSales: metrics.cancelledSales,
          totalAmount: metrics.totalAmount,
          totalDiscounts: metrics.totalDiscounts,
          averageSale: metrics.averageSale
        };
      },
      error: (err) => console.error('Error loading metrics:', err)
    });
  }

  loadCashFlowTransactions(): void {
    this.cashFlowApi.listTransactions(this.cashFlowFilters).subscribe({
      next: (response) => {
        this.cashFlowEntries = response.data;
        this.calculateCashFlowMetrics();
      },
      error: (err) => {
        console.error('Error loading cash flow:', err);
        this.showToast('error', 'Error al cargar flujo de caja');
      }
    });
  }

  applySalesFilters(): void {
    this.salesFilters.page = 1;
    this.loadSales();
    this.loadMetrics();
  }

  resetSalesFilters(): void {
    this.salesFilters = {
      companyId: this.COMPANY_ID,
      dateFrom: this.getDateNDaysAgo(30),
      dateTo: this.getToday(),
      page: 1,
      limit: 20
    };
    this.applySalesFilters();
    this.showToast('info', 'Filtros limpiados');
  }

  applyCashFlowFilters(): void {
    this.loadCashFlowTransactions();
  }

  resetCashFlowFilters(): void {
    this.cashFlowFilters = {
      companyId: this.COMPANY_ID,
      dateFrom: this.getDateNDaysAgo(30),
      dateTo: this.getToday()
    };
    this.applyCashFlowFilters();
  }

  onNewSale(): void {
    if (!this.cashRegister || this.cashRegister.status !== 'OPEN') {
      this.showToast('warning', 'Debe abrir la caja antes de crear ventas');
      this.showOpenCashModal = true;
      return;
    }

    this.saleFormData = {
      companyId: this.COMPANY_ID,
      customerId: 0,
      documentType: DocumentType.BOLETA,
      series: 'B001',
      number: this.getNextDocumentNumber(),
      saleType: SaleType.PRODUCT,
      issueDate: this.getToday(),
      applyAutoDiscounts: true,
      items: [],
      payments: []
    };

    this.foundCustomer = null;
    this.customerSearchText = '';
    this.currentSaleItem = {};
    this.simulationResult = null;
    this.activeTab = 'create';
  }

  onCancelSaleForm(): void {
    this.saleFormData = null;
    this.foundCustomer = null;
    this.simulationResult = null;
    this.activeTab = 'sales';
  }

  onSimulateSale(): void {
    if (!this.saleFormData || !this.foundCustomer || this.saleFormData.items.length === 0) {
      this.showToast('warning', 'Complete los datos para simular');
      return;
    }

    const simulateDto: SimulateSaleDto = {
      customerId: this.foundCustomer.id,
      saleType: this.saleFormData.saleType,
      priceListCode: this.saleFormData.priceListCode,
      applyAutoDiscounts: this.saleFormData.applyAutoDiscounts,
      items: this.saleFormData.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        comboId: item.comboId
      }))
    };

    this.salesApi.simulate(simulateDto).subscribe({
      next: (result) => {
        this.simulationResult = result;

        this.saleFormData!.items = this.saleFormData!.items.map((item, index) => {
          const simulated = result.items[index];
          return {
            ...item,
            baseUnitPrice: simulated.baseUnitPrice,
            finalUnitPrice: simulated.finalUnitPrice,
            lineTotal: simulated.finalSubtotal
          };
        });

        this.updatePaymentsFromSimulation(result.summary.total);

        if (!result.validation.isValid) {
          result.validation.messages.forEach(msg => {
            this.showToast(msg.type.toLowerCase() as any, msg.message);
          });
        } else {
          this.showToast('success', 'Simulación completada');
        }
      },
      error: (err) => {
        console.error('Error simulating sale:', err);
        this.showToast('error', err.error?.message || 'Error al simular venta');
      }
    });
  }

  onConfirmSale(): void {
    if (!this.saleFormData || !this.foundCustomer) {
      this.showToast('error', 'Complete los datos requeridos');
      return;
    }

    if (this.saleFormData.items.length === 0) {
      this.showToast('error', 'Agregue al menos un producto');
      return;
    }

    if (this.saleFormData.payments.length === 0) {
      this.showToast('error', 'Agregue al menos un pago');
      return;
    }

    const totalPayments = this.saleFormData.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalSale = this.simulationResult?.summary.total || 0;

    if (Math.abs(totalPayments - totalSale) > 0.01) {
      this.showToast('error', `El total de pagos (${totalPayments.toFixed(2)}) no coincide con el total (${totalSale.toFixed(2)})`);
      return;
    }

    const createDto: CreateSaleDto = {
      companyId: this.saleFormData.companyId,
      customerId: this.foundCustomer.id,
      saleType: this.saleFormData.saleType,
      documentType: this.saleFormData.documentType,
      series: this.saleFormData.series,
      number: this.saleFormData.number,
      issueDate: this.saleFormData.issueDate,
      priceListCode: this.saleFormData.priceListCode,
      applyAutoDiscounts: this.saleFormData.applyAutoDiscounts,
      observations: this.saleFormData.observations,
      items: this.saleFormData.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        baseUnitPrice: item.baseUnitPrice,
        finalUnitPrice: item.finalUnitPrice,
        lotId: item.lotId,
        serialIds: item.serialIds,
        comboId: item.comboId
      })),
      payments: this.saleFormData.payments.map(p => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        bankName: p.bankName,
        cardType: p.cardType
      }))
    };

    this.salesApi.create(createDto).subscribe({
      next: (sale) => {
        this.showToast('success', `Venta ${sale.series}-${sale.number} registrada exitosamente`);
        this.onCancelSaleForm();
        this.loadSales();
        this.loadCashRegister();
      },
      error: (err) => {
        console.error('Error creating sale:', err);
        this.showToast('error', err.error?.message || 'Error al registrar venta');
      }
    });
  }

  onSearchCustomer(): void {
    const document = this.customerSearchText.trim();

    if (!document) {
      this.foundCustomer = null;
      this.showToast('warning', 'Ingrese un DNI o RUC');
      return;
    }

    this.businessPartnersApi.findAll({
      companyId: this.COMPANY_ID,
      documentNumber: document,
      isClient: true
    }).subscribe({
      next: (response) => {
        if (response.data.length > 0) {
          this.foundCustomer = response.data[0];
          this.showToast('success', 'Cliente encontrado');
        } else {
          this.foundCustomer = null;
          this.showToast('warning', 'Cliente no encontrado');
          this.openNewCustomerModal(document);
        }
      },
      error: (err) => {
        console.error('Error searching customer:', err);
        this.showToast('error', 'Error al buscar cliente');
      }
    });
  }

  openNewCustomerModal(documentNumber: string = ''): void {
    this.newCustomerForm = {
      companyId: this.COMPANY_ID,
      name: '',
      documentNumber: documentNumber || this.customerSearchText.trim(),
      documentTypeId: documentNumber.length === 8 ? 2 : 1,
      email: '',
      phone: '',
      address: '',
      isClient: true,
      isSupplier: false
    };
    this.showNewCustomerModal = true;
  }

  onConfirmCreateCustomer(): void {
    if (!this.newCustomerForm.name || !this.newCustomerForm.documentNumber) {
      this.showToast('error', 'Complete los campos requeridos');
      return;
    }

    this.businessPartnersApi.create(this.newCustomerForm).subscribe({
      next: (customer) => {
        this.foundCustomer = customer;
        this.customerSearchText = customer.documentNumber;
        this.showToast('success', 'Cliente registrado exitosamente');
        this.showNewCustomerModal = false;
      },
      error: (err) => {
        console.error('Error creating customer:', err);
        this.showToast('error', err.error?.message || 'Error al registrar cliente');
      }
    });
  }

  filterProducts(): void {
    const query = (this.currentSaleItem.productName || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      this.filteredProducts = [];
      return;
    }

    this.filteredProducts = this.getMockProducts().filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    );
  }

  selectProduct(product: ProductSearchResult): void {
    this.currentSaleItem = {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      unitPrice: product.salePrice,
      quantity: 1
    };

    this.filteredProducts = [];

    setTimeout(() => {
      if (this.quantityInput) {
        this.quantityInput.nativeElement.focus();
        this.quantityInput.nativeElement.select();
      }
    }, 0);
  }

  onAddSaleItem(): void {
    if (!this.saleFormData || !this.currentSaleItem.productId || !this.currentSaleItem.quantity) {
      this.showToast('error', 'Complete los datos del producto');
      return;
    }

    const newItem: SaleItemFormData = {
      productId: this.currentSaleItem.productId,
      productName: this.currentSaleItem.productName || '',
      productSku: this.currentSaleItem.productSku || '',
      quantity: this.currentSaleItem.quantity,
      baseUnitPrice: this.currentSaleItem.unitPrice || 0,
      finalUnitPrice: this.currentSaleItem.unitPrice || 0,
      lineTotal: (this.currentSaleItem.quantity || 0) * (this.currentSaleItem.unitPrice || 0)
    };

    this.saleFormData.items.push(newItem);
    this.currentSaleItem = {};
    this.showToast('success', 'Producto agregado');

    if (this.foundCustomer) {
      this.onSimulateSale();
    }

    setTimeout(() => {
      if (this.productSearchInput) {
        this.productSearchInput.nativeElement.focus();
      }
    }, 0);
  }

  onRemoveSaleItem(index: number): void {
    if (!this.saleFormData) return;
    this.saleFormData.items.splice(index, 1);

    if (this.foundCustomer && this.saleFormData.items.length > 0) {
      this.onSimulateSale();
    } else {
      this.simulationResult = null;
    }

    this.showToast('success', 'Producto eliminado');
  }

  onQuantityEnter(): void {
    this.onAddSaleItem();
  }

  updatePaymentsFromSimulation(total: number): void {
    if (!this.saleFormData) return;

    if (this.saleFormData.payments.length === 0) {
      this.saleFormData.payments = [{
        method: PaymentMethod.CASH,
        amount: total
      }];
    } else {
      this.saleFormData.payments[0].amount = total;
    }
  }

  addPayment(): void {
    if (!this.saleFormData) return;

    this.saleFormData.payments.push({
      method: PaymentMethod.CASH,
      amount: 0
    });
  }

  removePayment(index: number): void {
    if (!this.saleFormData) return;
    this.saleFormData.payments.splice(index, 1);
  }

  onViewSale(sale: Sale): void {
    this.salesApi.get(sale.id).subscribe({
      next: (saleDetail) => {
        this.selectedSale = saleDetail;
      },
      error: (err) => {
        console.error('Error loading sale detail:', err);
        this.showToast('error', 'Error al cargar detalle de venta');
      }
    });
  }

  closeDetailDrawer(): void {
    this.selectedSale = null;
  }

  onCancelSale(sale: Sale): void {
    this.saleToCancel = sale;
    this.showCancelConfirmModal = true;
  }

  confirmCancelSale(): void {
    if (!this.saleToCancel) return;

    const cancelDto: CancelSaleDto = {
      reason: 'Anulado por usuario',
      observations: 'Venta anulada desde el módulo de ventas'
    };

    this.salesApi.cancel(this.saleToCancel.id, cancelDto).subscribe({
      next: (sale) => {
        this.showToast('success', 'Venta anulada exitosamente');
        this.closeCancelModal();
        this.loadSales();
      },
      error: (err) => {
        console.error('Error canceling sale:', err);
        this.showToast('error', err.error?.message || 'Error al anular venta');
      }
    });
  }

  closeCancelModal(): void {
    this.showCancelConfirmModal = false;
    this.saleToCancel = null;
  }

  onDownloadSalePdf(sale: Sale): void {
    this.showToast('success', `Descargando ${sale.series}-${sale.number}.pdf`);
  }

  private calculateMetrics(): void {
    this.metrics = {
      totalSales: this.sales.length,
      confirmedSales: this.sales.filter(s => s.status === SaleStatus.CONFIRMED).length,
      cancelledSales: this.sales.filter(s => s.status === SaleStatus.CANCELLED).length,
      totalAmount: this.sales.reduce((sum, s) => sum + Number(s.total), 0),
      totalDiscounts: this.sales.reduce((sum, s) => sum + Number(s.discountTotal), 0),
      averageSale: 0
    };

    if (this.metrics.confirmedSales > 0) {
      this.metrics.averageSale = this.metrics.totalAmount / this.metrics.confirmedSales;
    }
  }

  private calculateCashFlowMetrics(): void {
    this.cashFlowMetrics = { total: 0, cash: 0, card: 0, transfer: 0, yape: 0, plin: 0 };

    const confirmedSales = this.sales.filter(s => s.status === SaleStatus.CONFIRMED);

    for (const sale of confirmedSales) {
      const total = Number(sale.total);
      this.cashFlowMetrics.total += total;

      for (const payment of sale.payments) {
        const amount = Number(payment.amount);
        switch (payment.method) {
          case PaymentMethod.CASH: this.cashFlowMetrics.cash += amount; break;
          case PaymentMethod.CARD: this.cashFlowMetrics.card += amount; break;
          case PaymentMethod.TRANSFER: this.cashFlowMetrics.transfer += amount; break;
          case PaymentMethod.YAPE: this.cashFlowMetrics.yape += amount; break;
          case PaymentMethod.PLIN: this.cashFlowMetrics.plin += amount; break;
        }
      }
    }
  }

  getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  getNextDocumentNumber(): string {
    return '00000001';
  }

  getStatusLabel(status: SaleStatus): string {
    const labels: Record<SaleStatus, string> = {
      [SaleStatus.DRAFT]: 'Borrador',
      [SaleStatus.CONFIRMED]: 'Confirmada',
      [SaleStatus.CANCELLED]: 'Anulada',
      [SaleStatus.REFUNDED]: 'Devuelta'
    };
    return labels[status] || status;
  }

  getPaymentLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Efectivo',
      [PaymentMethod.CARD]: 'Tarjeta',
      [PaymentMethod.TRANSFER]: 'Transferencia',
      [PaymentMethod.YAPE]: 'Yape',
      [PaymentMethod.PLIN]: 'Plin',
      [PaymentMethod.CREDIT]: 'Crédito'
    };
    return labels[method] || method;
  }

  getDocumentTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      [DocumentType.NOTA_PEDIDO]: 'Nota de Pedido',
      [DocumentType.BOLETA]: 'Boleta',
      [DocumentType.FACTURA]: 'Factura'
    };
    return labels[type] || type;
  }

  exportCsv(): void {
    if (this.sales.length === 0) {
      this.showToast('warning', 'No hay ventas para exportar');
      return;
    }

    let csv = 'Fecha,Tipo,Serie,Número,Cliente,Total,Estado\n';
    this.sales.forEach(sale => {
      csv += `"${sale.issueDate}","${this.getDocumentTypeLabel(sale.documentType)}","${sale.series}","${sale.number}","${sale.customer.name}",${sale.total},"${this.getStatusLabel(sale.status)}"\n`;
    });

    this.downloadFile(csv, `ventas-${this.getToday()}.csv`, 'text/csv');
    this.showToast('success', 'CSV exportado');
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    const toast: Toast = { type, message };
    this.toasts.push(toast);
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 3000);
  }

  getToastIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-info-circle';
  }

  private getMockProducts(): ProductSearchResult[] {
    return [
      { id: 1, sku: 'RAM-001', name: 'RAM DDR4 16GB', salePrice: 590.00, stock: 10 },
      { id: 2, sku: 'SSD-001', name: 'SSD NVMe 1TB', salePrice: 1062.00, stock: 20 },
      { id: 3, sku: 'USB-001', name: 'USB 3.0 32GB', salePrice: 254.00, stock: 15 },
      { id: 4, sku: 'MICRO-001', name: 'Micrófono Gamer RGB', salePrice: 847.00, stock: 30 }
    ];
  }
}









