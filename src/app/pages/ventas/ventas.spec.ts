import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Ventas } from './ventas';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { DocumentSeriesApiService } from '../../services/sales/document-series-api.service';
import { ProductsApiService } from '../../services/products-api.service';
import { CashFlowApiService } from '../../services/sales/cash-flow-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { PricingStockApiService } from '../../services/pricing-stock-api.service';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { StockService } from '../../services/inventory/stock.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderEconomicStatus } from '../../models/service-orders/service-order';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { of, throwError } from 'rxjs';
import { SaleReceiptPdfService } from '../../services/sales/sale-receipt-pdf.service';

describe('Ventas', () => {
  let component: Ventas;
  let fixture: ComponentFixture<Ventas>;
  const salesApiStub = {
    create: jasmine.createSpy('create').and.returnValue(of({ id: 10 })),
    createFromServiceOrder: jasmine.createSpy('createFromServiceOrder').and.returnValue(of({ id: 11 })),
  };
  const saleReceiptPdfServiceStub = {
    downloadBySaleId: jasmine.createSpy('downloadBySaleId').and.returnValue(of('F001-123.pdf')),
  };
  const serviceOrderServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
  };

  beforeEach(async () => {
    spyOn(Ventas.prototype, 'ngOnInit').and.stub();
    saleReceiptPdfServiceStub.downloadBySaleId.and.returnValue(of('F001-123.pdf'));
    salesApiStub.create.calls.reset();
    salesApiStub.createFromServiceOrder.calls.reset();
    serviceOrderServiceStub.findAll.calls.reset();
    serviceOrderServiceStub.findAll.and.returnValue(of({ data: [] }));

    await TestBed.configureTestingModule({
      declarations: [Ventas],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: SalesApiService, useValue: salesApiStub },
        { provide: DocumentSeriesApiService, useValue: {} },
        { provide: ProductsApiService, useValue: {} },
        { provide: CashFlowApiService, useValue: {} },
        { provide: ClientsApiService, useValue: {} },
        { provide: PricingStockApiService, useValue: {} },
        { provide: PricingProductsApiService, useValue: {} },
        { provide: StockService, useValue: {} },
        { provide: DocumentTypesApiService, useValue: {} },
        { provide: PricingQueryApiService, useValue: {} },
        { provide: CurrentUserService, useValue: { value: { id: 1, name: 'Test User' } } },
        { provide: ServiceOrderService, useValue: serviceOrderServiceStub },
        { provide: SaleReceiptPdfService, useValue: saleReceiptPdfServiceStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ventas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('delegates full receipt generation to the shared service and keeps toast feedback in the page', () => {
    const showToastSpy = spyOn(component, 'showToast');

    component.onDownloadSalePdf({ id: 77 } as never);

    expect(saleReceiptPdfServiceStub.downloadBySaleId).toHaveBeenCalledWith(77, 'full');
    expect(showToastSpy).toHaveBeenCalledWith('success', 'PDF descargado: F001-123.pdf');
  });

  it('shows page error feedback when the shared PDF service fails', () => {
    saleReceiptPdfServiceStub.downloadBySaleId.and.returnValue(
      throwError(() => new Error('renderer failed')),
    );
    const showToastSpy = spyOn(component, 'showToast');

    component.onDownloadSalePdf({ id: 88 } as never);

    expect(showToastSpy).toHaveBeenCalledWith('error', 'Error al generar PDF');
  });

  it('usa createFromServiceOrder para ventas originadas en órdenes pendientes', () => {
    const showToastSpy = spyOn(component, 'showToast');
    spyOn(component as any, 'loadSales');
    spyOn(component as any, 'loadOpenRegister');
    spyOn(component as any, 'loadEligibleServiceOrders');
    component.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'EFECTIVO',
      lines: [{ itemType: 'SERVICE', productName: 'Orden SO-001 · Servicio técnico', quantity: 1, unitPrice: 120, lineTotal: 120 }],
      total: 120,
    };
    component.saleCreationMode = 'SERVICE_ORDER';
    component.selectedServiceOrderId = 9;
    component.selectedServiceOrder = {
      id: 9,
      code: 'SO-001',
      clientId: 4,
      economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
      montoComprometidoVigente: 120,
    } as any;

    component.onConfirmSale();

    expect(salesApiStub.createFromServiceOrder).toHaveBeenCalledWith(
      jasmine.objectContaining({ serviceOrderId: 9, companyId: 1, documentType: 'BOLETA' }),
    );
    expect(salesApiStub.create).not.toHaveBeenCalled();
    expect(showToastSpy).toHaveBeenCalledWith('success', 'Venta desde orden registrada exitosamente');
  });

  it('mantiene la venta manual general como venta solo de productos', () => {
    const showToastSpy = spyOn(component, 'showToast');
    spyOn(component as any, 'loadSales');
    spyOn(component as any, 'loadOpenRegister');
    component.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'EFECTIVO',
      lines: [{ itemType: 'PRODUCT', productId: 3, productName: 'SSD', quantity: 2, unitPrice: 50, lineTotal: 100 }],
      total: 100,
    };
    component.saleCreationMode = 'MANUAL_PRODUCT';
    component.foundCustomer = { id: 55, name: 'Cliente', documentNumber: '123' } as any;

    component.onConfirmSale();

    expect(salesApiStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        customerId: 55,
        saleType: 'PRODUCT',
        items: [jasmine.objectContaining({ itemType: 'PRODUCT', productId: 3, serviceId: null })],
      }),
    );
    expect(showToastSpy).toHaveBeenCalledWith('success', 'Venta registrada exitosamente');
  });
});
