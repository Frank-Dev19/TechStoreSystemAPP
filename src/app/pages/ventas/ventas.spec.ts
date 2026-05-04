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
    createFromServiceAgreements: jasmine.createSpy('createFromServiceAgreements').and.returnValue(of({ id: 12 })),
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
    salesApiStub.createFromServiceAgreements.calls.reset();
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

  it('usa createFromServiceAgreements para ventas agrupadas originadas en órdenes pendientes', () => {
    const showToastSpy = spyOn(component, 'showToast');
    spyOn(component as any, 'loadSales');
    spyOn(component as any, 'loadOpenRegister');
    spyOn(component as any, 'loadEligibleServiceOrders');
    component.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'EFECTIVO',
      lines: [
        { itemType: 'SERVICE', productName: 'Servicio técnico - Orden SO-001', quantity: 1, unitPrice: 120, lineTotal: 120 },
        { itemType: 'SERVICE', productName: 'Servicio técnico - Orden SO-002', quantity: 1, unitPrice: 80, lineTotal: 80 },
      ],
      total: 200,
    };
    component.saleCreationMode = 'SERVICE_ORDER';
    component.selectedServiceOrderId = 9;
    component.selectedServiceOrderIds = [9, 10];
    component.selectedServiceOrders = [
      {
        id: 9,
        code: 'SO-001',
        clientId: 4,
        economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
        montoComprometidoVigente: 120,
      } as any,
      {
        id: 10,
        code: 'SO-002',
        clientId: 4,
        economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
        montoComprometidoVigente: 80,
      } as any,
    ];
    component.selectedServiceOrder = component.selectedServiceOrders[0] as any;
    component.foundCustomer = {
      id: 66,
      name: 'Carlos Avila',
      documentNumber: '74118118',
      kind: 'PERSON',
    } as any;

    component.onConfirmSale();

    expect(salesApiStub.createFromServiceAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ serviceOrderIds: [9, 10], taxpayerCustomerId: 66, companyId: 1, documentType: 'BOLETA' }),
    );
    expect(salesApiStub.create).not.toHaveBeenCalled();
    expect(showToastSpy).toHaveBeenCalledWith('success', 'Venta agrupada registrada exitosamente');
  });

  it('agrupa líneas de servicio al seleccionar varias órdenes del mismo cliente', () => {
    component.saleFormData = { lines: [], total: 0, subtotal: 0, igv: 0 };
    component.eligibleServiceOrders = [
      {
        id: 9,
        code: 'SO-001',
        clientId: 4,
        economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
        montoComprometidoVigente: 120,
      } as any,
      {
        id: 10,
        code: 'SO-002',
        clientId: 4,
        economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
        montoComprometidoVigente: 80,
      } as any,
    ];

    const event = {
      target: {
        selectedOptions: [
          { value: '9' },
          { value: '10' },
        ],
      },
    } as any;

    component.onServiceOrdersSelectionChange(event);

    expect(component.selectedServiceOrderIds).toEqual([9, 10]);
    expect(component.saleFormData.lines).toEqual([
      jasmine.objectContaining({ productName: 'Servicio técnico - Orden SO-001', lineTotal: 120 }),
      jasmine.objectContaining({ productName: 'Servicio técnico - Orden SO-002', lineTotal: 80 }),
    ]);
    expect(component.saleFormData.total).toBe(200);
  });

  it('bloquea factura si el contribuyente seleccionado no es empresa', () => {
    const showToastSpy = spyOn(component, 'showToast');
    component.saleFormData = {
      documentType: 'FACTURA',
      paymentType: 'EFECTIVO',
      lines: [{ itemType: 'SERVICE', productName: 'Servicio técnico - Orden SO-001', quantity: 1, unitPrice: 120, lineTotal: 120 }],
      total: 120,
    };
    component.saleCreationMode = 'SERVICE_ORDER';
    component.selectedServiceOrderIds = [9];
    component.selectedServiceOrders = [
      {
        id: 9,
        code: 'SO-001',
        clientId: 4,
        economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
        montoComprometidoVigente: 120,
      } as any,
    ];
    component.selectedServiceOrder = component.selectedServiceOrders[0] as any;
    component.foundCustomer = {
      id: 66,
      name: 'Carlos Avila',
      documentNumber: '74118118',
      kind: 'PERSON',
    } as any;

    component.onConfirmSale();

    expect(salesApiStub.createFromServiceAgreements).not.toHaveBeenCalled();
    expect(showToastSpy).toHaveBeenCalledWith('error', 'La factura requiere un contribuyente empresa');
  });

  it('distingue órdenes cubiertas por esta venta agrupada de otras pendientes del mismo cliente', () => {
    component.selectedServiceOrderIds = [9, 10];
    component.selectedServiceOrders = [
      {
        id: 9,
        code: 'SO-001',
        clientId: 4,
        montoComprometidoVigente: 120,
      } as any,
      {
        id: 10,
        code: 'SO-002',
        clientId: 4,
        montoComprometidoVigente: 80,
      } as any,
    ];
    component.eligibleServiceOrders = [
      component.selectedServiceOrders[0] as any,
      component.selectedServiceOrders[1] as any,
      {
        id: 11,
        code: 'SO-003',
        clientId: 4,
        montoComprometidoVigente: 60,
      } as any,
      {
        id: 21,
        code: 'SO-OTRA',
        clientId: 9,
        montoComprometidoVigente: 90,
      } as any,
    ];

    expect(component.getOrdersCoveredByCurrentGroupedSale().map((order) => order.code)).toEqual(['SO-001', 'SO-002']);
    expect(component.getOrdersStillPendingForGroupedClient().map((order) => order.code)).toEqual(['SO-003']);
    expect(component.getGroupedOrderCoverageSummary()).toContain('liberará 2 órdenes');
    expect(component.getGroupedOrderCoverageSummary()).toContain('dejará 1 pendiente');
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
