import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import {
  EquipmentType,
  RequestOrigin,
  ServiceOrder,
  ServiceOrderCommercialStatus,
  ServiceOrderDerivedMetric,
  ServiceOrderEconomicStatus,
  ServiceOrderOperativeStatus,
  ServiceOrderPriority,
  ServiceOrderTechnicalStatus,
  ServiceOrderTimeMetrics,
  ServiceType,
} from '../../models/service-orders/service-order';
import { ProductsService } from '../../services/inventory/products.service';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { SupervisorPanel } from './supervisor-panel';

describe('SupervisorPanel', () => {
  let component: SupervisorPanel;
  let fixture: ComponentFixture<SupervisorPanel>;

  const agreementServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
    createRevision: jasmine.createSpy('createRevision').and.returnValue(of({ id: 1000 })),
    getTechnicianRevenueRankings: jasmine.createSpy('getTechnicianRevenueRankings').and.returnValue(of({ technicians: [] })),
  };

  const serviceOrderServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
    findOne: jasmine.createSpy('findOne').and.returnValue(of({} as any)),
    getFinalNotificationFailures: jasmine.createSpy('getFinalNotificationFailures').and.returnValue(of([])),
    retryFinalNotification: jasmine.createSpy('retryFinalNotification').and.returnValue(of({} as any)),
  };

  const diagnosisServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 1 })),
  };

  const productsServiceStub = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
  };

  const inboxServiceStub = {
    getThreadByOrder: jasmine.createSpy('getThreadByOrder').and.returnValue(of({ id: 17 } as any)),
  };

  const routerStub = {
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SupervisorPanel],
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: ServiceOrderAgreementService, useValue: agreementServiceStub },
        { provide: ServiceOrderService, useValue: serviceOrderServiceStub },
        { provide: ServiceOrderDiagnosisService, useValue: diagnosisServiceStub },
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: ServiceOrderInboxService, useValue: inboxServiceStub },
        { provide: Router, useValue: routerStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SupervisorPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra siempre el concepto fijo de servicio técnico en los acuerdos', () => {
    expect(component.getServiceLabel(1)).toBe('Servicio técnico');
    expect(component.getServiceLabel(null)).toBe('Servicio técnico');
  });

  it('prepara la decisión manual con la versión comercial exacta del equipo', () => {
    component.openClientDecisionModal({
      id: 31,
      serviceOrderAgreementId: 8,
      serviceOrderItemId: 12,
      commercialVersionId: 91,
      serviceOrderItem: { id: 12, code: 'OS-03-08-2026-001-02', brand: 'Acer', model: 'Nitro V' },
      commercialVersion: { id: 91, versionNumber: 4, status: 'DRAFT', totalAmount: 260 },
    } as any);

    expect(component.clientDecisionTarget).toEqual({
      commercialVersionId: 91,
      itemLabel: 'OS-03-08-2026-001-02 · Acer Nitro V',
      versionNumber: 4,
      totalAmount: 260,
    });
  });

  it('prepara la edición supervisada de descuentos sobre la versión vigente', () => {
    const link = {
      id: 31,
      serviceOrderAgreementId: 8,
      serviceOrderItemId: 12,
      commercialVersionId: 91,
      serviceOrderItem: { id: 12, code: 'OS-03-08-2026-001-02', brand: 'Acer', model: 'Nitro V' },
      commercialVersion: {
        id: 91,
        serviceOrderItemId: 12,
        versionNumber: 4,
        status: 'ISSUED',
        totalAmount: 260,
        notes: null,
        lines: [{ id: 901, type: 'SERVICE', quantity: 1, unitPrice: 260 }],
      },
    } as any;
    component.selectedServiceOrderAgreement = { id: 8, serviceOrderId: 70 } as any;

    component.openLineDiscountModal(link);

    expect(component.lineDiscountTarget).toEqual(jasmine.objectContaining({
      serviceOrderId: 70,
      serviceOrderItemId: 12,
      baseVersionId: 91,
      versionNumber: 4,
      lines: link.commercialVersion.lines,
    }));
  });

  it('bloquea la edición de descuentos en snapshots aceptados', () => {
    expect(component.canEditCommercialDiscounts({ commercialVersion: { status: 'ACCEPTED' } } as any)).toBeFalse();
  });

  it('uses orders as the primary operational section instead of quotes', () => {
    serviceOrderServiceStub.findAll.and.returnValue(
      of({ data: [createServiceOrder({ id: 44, code: 'SO-44' })], total: 1, page: 1, limit: 100 }),
    );

    fixture = TestBed.createComponent(SupervisorPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Órdenes');
    expect(compiled.textContent).not.toContain('Acuerdos');
  });

  it('renders the redesigned order drawer and uses pendiente for missing SLA metrics', () => {
    serviceOrderServiceStub.findAll.and.returnValue(
      of({ data: [createServiceOrder({ id: 51, code: 'SO-51', assignedToTechnicianName: 'Técnico Demo' })], total: 1, page: 1, limit: 100 }),
    );
    serviceOrderServiceStub.findOne.and.returnValue(
      of(
        createServiceOrder({
          id: 51,
          code: 'SO-51',
          assignedToTechnicianName: 'Técnico Demo',
          brand: 'Acer',
          model: 'Nitro V',
          initialIssue: 'Sobrecalentamiento',
          timeMetrics: createTimeMetricsWithPending(),
          items: [{
            id: 501,
            code: 'SO-51-01',
            sla: {
              stage: 'diagnosis',
              targetMinutes: 180,
              elapsedMinutes: 120,
              remainingMinutes: 0,
              breached: true,
            },
          } as any],
        }),
      ),
    );
    agreementServiceStub.findAll.and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 }));
    diagnosisServiceStub.findAll.and.returnValue(
      of({
        data: [
          {
            id: 1,
            serviceOrderId: 51,
            summary: 'Limpieza urgente',
            details: 'Ventiladores tapados con polvo y pelusas, pasta térmica reseca',
          },
        ],
        total: 1,
        page: 1,
        limit: 1,
      }),
    );

    fixture = TestBed.createComponent(SupervisorPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.setActiveSection('orders');
    component.selectServiceOrder(createServiceOrder({ id: 51, code: 'SO-51', assignedToTechnicianName: 'Técnico Demo' }) as any);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Motivo de ingreso');
    expect(compiled.textContent).toContain('Equipo y comunicación');
    expect(compiled.textContent).toContain('SO-51-01 · SLA del equipo');
    expect(compiled.textContent).toContain('Tiempo a diagnóstico');
    expect(compiled.textContent).toContain('WhatsApp');
    expect(compiled.textContent).toContain('Pendiente');
    expect(compiled.textContent).not.toContain('No computable');
  });

  it('filters orders by search term and operative status inside the orders section', () => {
    component.serviceOrders = [
      createServiceOrder({ id: 1, code: 'SO-ACER', brand: 'Acer', operativeStatus: ServiceOrderOperativeStatus.EN_PROCESO }),
      createServiceOrder({ id: 2, code: 'SO-LENOVO', brand: 'Lenovo', operativeStatus: ServiceOrderOperativeStatus.ABIERTA }),
      createServiceOrder({ id: 3, code: 'SO-DELL', brand: 'Dell', operativeStatus: ServiceOrderOperativeStatus.EN_PROCESO }),
    ];

    component.orderSearchTerm = 'acer';
    component.orderOperativeStatusFilter = ServiceOrderOperativeStatus.EN_PROCESO;

    expect(component.filteredServiceOrders.map((order) => order.code)).toEqual(['SO-ACER']);
  });

  it('keeps pagination consistent when browsing the orders section', () => {
    component.itemsPerPage = 2;
    component.serviceOrders = [
      createServiceOrder({ id: 1, code: 'SO-1' }),
      createServiceOrder({ id: 2, code: 'SO-2' }),
      createServiceOrder({ id: 3, code: 'SO-3' }),
      createServiceOrder({ id: 4, code: 'SO-4' }),
      createServiceOrder({ id: 5, code: 'SO-5' }),
    ];

    component.setActiveSection('orders');
    component.currentPage = 2;

    expect(component.totalPages).toBe(3);
    expect(component.paginatedServiceOrders.map((order) => order.code)).toEqual(['SO-3', 'SO-4']);
  });

  it('redirige el acceso general de chats al inbox dedicado', async () => {
    component.openInboxWorkspace(null);
    await Promise.resolve();

    expect(routerStub.navigate).toHaveBeenCalledWith(['/service-order-inbox']);
  });

  it('redirige el shortcut al inbox dedicado en vez de usar la sección embebida', async () => {
    component.openInboxShortcut(createServiceOrder({ id: 51, code: 'SO-51' }));
    await Promise.resolve();

    expect(inboxServiceStub.getThreadByOrder).toHaveBeenCalledWith(51);
    expect(routerStub.navigate).toHaveBeenCalledWith(['/service-order-inbox'], {
      queryParams: { threadId: 17, serviceOrderId: 51 },
    });
    expect(component.activeSection).toBe('orders');
  });

  it('abre la resolución supervisada sobre la solicitud pendiente exacta', () => {
    const item = {
      id: 12,
      code: 'OS-03-08-2026-001-02',
      operativeStatus: ServiceOrderOperativeStatus.CANCELACION_SOLICITADA,
      cancellationRequests: [{ id: 91, status: 'PENDING' }],
    } as any;
    const order = createServiceOrder({ id: 70, code: 'OS-03-08-2026-001', items: [item] });

    component.openCancellationResolution(order, item);

    expect(component.itemCancellationTarget).toEqual(jasmine.objectContaining({
      mode: 'RESOLVE',
      serviceOrderId: 70,
      selectedItemId: 12,
      cancellationRequestId: 91,
    }));
  });

  it('traduce el estado agregado de entrega parcial al español', () => {
    expect(component.getInboxThreadOperativeStatusLabel(ServiceOrderOperativeStatus.ENTREGA_PARCIAL)).toBe(
      'Entrega parcial',
    );
  });
});

function createServiceOrder(overrides: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id: 1,
    code: 'SO-BASE',
    operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
    technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
    commercialStatus: ServiceOrderCommercialStatus.PENDIENTE_PROPUESTA,
    economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
    priority: ServiceOrderPriority.MEDIUM,
    requestOrigin: RequestOrigin.INTERNAL,
    serviceType: ServiceType.DIAGNOSIS,
    equipmentType: EquipmentType.LAPTOP,
    equipmentTypeOther: null,
    clientId: 10,
    brand: 'Lenovo',
    model: 'ThinkPad',
    serialNumber: 'SN-1',
    password: null,
    accessories: null,
    initialIssue: 'No enciende',
    assignedToTechnicianId: 4,
    assignedToTechnicianName: 'Técnico Demo',
    createdAt: '2026-05-18T10:00:00.000Z',
    updatedAt: '2026-05-18T10:00:00.000Z',
    client: null,
    billings: [],
    timeMetrics: createTimeMetricsWithPending(),
    sla: null,
    ...overrides,
  } as ServiceOrder;
}

function createMetric(overrides: Partial<ServiceOrderDerivedMetric> = {}): ServiceOrderDerivedMetric {
  return {
    valueMinutes: 30,
    isComputable: true,
    missingTimestamps: [],
    ...overrides,
  } as ServiceOrderDerivedMetric;
}

function createTimeMetricsWithPending(): ServiceOrderTimeMetrics {
  return {
    timeToDiagnosis: createMetric({ isComputable: false, missingTimestamps: ['diagnosisStartedAt'] }),
    timeToServiceStart: createMetric({ valueMinutes: 45 }),
    timeToService: createMetric({ valueMinutes: 90 }),
    timeToResolution: createMetric({ valueMinutes: 120 }),
    timeToDelivery: createMetric({ isComputable: false, missingTimestamps: ['deliveredAt'] }),
  } as ServiceOrderTimeMetrics;
}
