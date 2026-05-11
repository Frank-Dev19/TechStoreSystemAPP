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
import { of, throwError } from 'rxjs';
import { SaleReceiptPdfService } from '../../services/sales/sale-receipt-pdf.service';

describe('Ventas', () => {
  let component: Ventas;
  let fixture: ComponentFixture<Ventas>;
  const salesApiStub = {
    create: jasmine.createSpy('create').and.returnValue(of({ id: 10 })),
    createFromServiceOrder: jasmine.createSpy('createFromServiceOrder').and.returnValue(of({ id: 11 })),
    createFromServiceAgreements: jasmine.createSpy('createFromServiceAgreements').and.returnValue(of({ id: 12 })),
    getEligibleServiceOrders: jasmine.createSpy('getEligibleServiceOrders').and.returnValue(of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 })),
  };
  const saleReceiptPdfServiceStub = {
    downloadBySaleId: jasmine.createSpy('downloadBySaleId').and.returnValue(of('F001-123.pdf')),
  };

  beforeEach(async () => {
    spyOn(Ventas.prototype, 'ngOnInit').and.stub();
    saleReceiptPdfServiceStub.downloadBySaleId.and.returnValue(of('F001-123.pdf'));
    salesApiStub.create.calls.reset();
    salesApiStub.createFromServiceOrder.calls.reset();
    salesApiStub.createFromServiceAgreements.calls.reset();
    salesApiStub.getEligibleServiceOrders.calls.reset();
    salesApiStub.getEligibleServiceOrders.and.returnValue(of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }));

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
    component.saleFormData = { lines: [], total: 0, subtotal: 0, igv: 0, taxRate: 0.18 };
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
    expect(component.saleFormData.subtotal).toBeCloseTo(169.49, 2);
    expect(component.saleFormData.igv).toBeCloseTo(30.51, 2);
    expect(component.saleFormData.taxRate).toBe(0.18);
  });

  it('busca coincidencias por código y usa la orden elegida como ancla del cliente', () => {
    component.saleFormData = { lines: [], total: 0, subtotal: 0, igv: 0, taxRate: 0.18 };
    component.eligibleServiceOrders = [
      {
        id: 9,
        code: 'SO2026050517470002',
        clientId: 4,
        clientSnapshotName: 'Sergio Avila',
        receivedAt: '2026-05-05T17:47:00.000Z',
        montoComprometidoVigente: 120,
      } as any,
      {
        id: 10,
        code: 'SO2026042700400001',
        clientId: 4,
        clientSnapshotName: 'Sergio Avila',
        receivedAt: '2026-04-27T00:40:00.000Z',
        montoComprometidoVigente: 80,
      } as any,
      {
        id: 21,
        code: 'SO2026040100100001',
        clientId: 8,
        clientSnapshotName: 'Otro cliente',
        receivedAt: '2026-04-01T00:10:00.000Z',
        montoComprometidoVigente: 60,
      } as any,
    ];

    component.serviceOrderSearchText = '4000';
    component.onEligibleServiceOrdersSearch();

    expect(component.serviceOrderSearchMatches.map((order) => order.code)).toEqual(['SO2026042700400001']);

    component.selectAnchoredServiceOrder(component.serviceOrderSearchMatches[0] as any);

    expect(component.selectedServiceOrderId).toBe(10);
    expect(component.selectedServiceOrderIds).toEqual([10]);
    expect(component.selectedServiceOrders.map((order) => order.code)).toEqual(['SO2026042700400001']);
    expect(component.getSelectableGroupedServiceOrders().map((order) => order.code)).toEqual(['SO2026050517470002']);
    expect(component.saleFormData.total).toBe(80);
    expect(component.saleFormData.subtotal).toBeCloseTo(67.8, 2);
    expect(component.saleFormData.igv).toBeCloseTo(12.2, 2);
  });

  it('el checkbox maestro marca y desmarca solo las órdenes adicionales del mismo cliente', () => {
    component.saleFormData = { lines: [], total: 0, subtotal: 0, igv: 0, taxRate: 0.18 };
    component.eligibleServiceOrders = [
      {
        id: 9,
        code: 'SO2026050517470002',
        clientId: 4,
        receivedAt: '2026-05-05T17:47:00.000Z',
        montoComprometidoVigente: 120,
      } as any,
      {
        id: 10,
        code: 'SO2026042700400001',
        clientId: 4,
        receivedAt: '2026-04-27T00:40:00.000Z',
        montoComprometidoVigente: 80,
      } as any,
      {
        id: 11,
        code: 'SO2026042000300001',
        clientId: 4,
        receivedAt: '2026-04-20T00:30:00.000Z',
        montoComprometidoVigente: 60,
      } as any,
      {
        id: 21,
        code: 'SO2026040100100001',
        clientId: 8,
        receivedAt: '2026-04-01T00:10:00.000Z',
        montoComprometidoVigente: 60,
      } as any,
    ];

    component.selectAnchoredServiceOrder(component.eligibleServiceOrders[1] as any);

    component.onToggleAllGroupedServiceOrders({ target: { checked: true } } as any);
    expect(component.selectedServiceOrderIds).toEqual([10, 9, 11]);
    expect(component.areAllSelectableGroupedOrdersSelected()).toBeTrue();

    component.onToggleAllGroupedServiceOrders({ target: { checked: false } } as any);
    expect(component.selectedServiceOrderIds).toEqual([10]);
    expect(component.areAllSelectableGroupedOrdersSelected()).toBeFalse();
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
    component.selectedServiceOrder = component.selectedServiceOrders[0] as any;
    component.selectedServiceOrderId = 9;
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

  it('carga órdenes elegibles desde el endpoint explícito del backend sin filtro local por monto', async () => {
    salesApiStub.getEligibleServiceOrders.and.returnValue(of({
      data: [
        {
          id: 9,
          code: 'SO-001',
          clientId: 4,
          economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
          montoComprometidoVigente: 15,
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as any));

    await (component as any).loadEligibleServiceOrders();

    expect(salesApiStub.getEligibleServiceOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(component.eligibleServiceOrders.map((order) => order.code)).toEqual(['SO-001']);
  });

  it('carga todas las páginas de órdenes elegibles y las ordena por código descendente', async () => {
    salesApiStub.getEligibleServiceOrders.and.callFake((params?: any) => {
      if (params?.page === 2) {
        return of({
          data: [
            { id: 9, code: 'SO-001', clientId: 4, montoComprometidoVigente: 20 },
          ],
          total: 3,
          page: 2,
          limit: 2,
          totalPages: 2,
        } as any);
      }

      return of({
        data: [
          { id: 10, code: 'SO-002', clientId: 4, montoComprometidoVigente: 30 },
          { id: 11, code: 'SO-003', clientId: 4, montoComprometidoVigente: 40 },
        ],
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      } as any);
    });

    await (component as any).loadEligibleServiceOrders();

    expect(salesApiStub.getEligibleServiceOrders.calls.argsFor(0)).toEqual([{ page: 1, limit: 100 }]);
    expect(salesApiStub.getEligibleServiceOrders.calls.argsFor(1)).toEqual([{ page: 2, limit: 2 }]);
    expect(component.eligibleServiceOrders.map((order) => order.code)).toEqual(['SO-003', 'SO-002', 'SO-001']);
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
