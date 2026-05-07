import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
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
import {
  ServiceOrderAgreementService,
} from '../../services/service-orders/service-agreement.service';
import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { SupervisorPanel } from './supervisor-panel';

describe('SupervisorPanel', () => {
  let component: SupervisorPanel;
  let fixture: ComponentFixture<SupervisorPanel>;

  const inboxThread = {
    id: 9,
    serviceOrderId: 22,
    serviceOrderCode: 'OS-009',
    equipmentLabel: 'Laptop',
    clientAlias: 'Cliente Demo',
    assignedTechnicianAlias: 'Técnico Demo',
    operativeStatus: ServiceOrderOperativeStatus.CANCELADA,
    technicalStatus: null,
    commercialStatus: null,
    economicStatus: null,
    clientPhone: null,
    lastMessageText: null,
    lastMessageAt: null,
    lastMessageDirection: null,
    lastMessageAuthorRole: null,
    unreadCount: 0,
    contextToken: 'ctx-1',
    orderStatus: ServiceOrderOperativeStatus.EN_PROCESO,
  } as any;

  const agreementServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
    getTechnicianRevenueRankings: jasmine.createSpy('getTechnicianRevenueRankings').and.returnValue(of({ technicians: [] })),
  };

  const serviceOrderServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
    findOne: jasmine.createSpy('findOne').and.returnValue(of({} as any)),
  };

  const diagnosisServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 1 })),
  };

  const productsServiceStub = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
  };

  const inboxServiceStub = {
    listThreads: jasmine.createSpy('listThreads').and.returnValue(of({ data: [inboxThread], total: 1, page: 1, limit: 6 })),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ thread: inboxThread, messages: [] })),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({ ok: true })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of({} as any)),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SupervisorPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders inbox labels from operativeStatus instead of any legacy orderStatus value', () => {
    component.setActiveSection('inbox');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const statusLabel = compiled.querySelector('.thread-item .risk')?.textContent?.trim();

    expect(statusLabel).toBe('Cancelado');
    expect(compiled.textContent).not.toContain('En progreso');
  });

  it('maps operative statuses with the inbox canonicity labels', () => {
    expect(component.getInboxThreadOperativeStatusLabel(ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA)).toBe(
      'Listo para entrega',
    );
    expect(component.getInboxThreadOperativeStatusLabel(null)).toBe('Abierto');
  });

  it('muestra siempre el concepto fijo de servicio técnico en los acuerdos', () => {
    expect(component.getServiceLabel(1)).toBe('Servicio técnico');
    expect(component.getServiceLabel(null)).toBe('Servicio técnico');
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
          sla: {
            stage: 'diagnosis',
            targetMinutes: 180,
            elapsedMinutes: 120,
            remainingMinutes: 0,
            breached: true,
          },
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

    (component as any).setActiveSection('orders');
    component.selectServiceOrder(createServiceOrder({ id: 51, code: 'SO-51', assignedToTechnicianName: 'Técnico Demo' }) as any);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Motivo de ingreso');
    expect(compiled.textContent).toContain('Equipo y comunicación');
    expect(compiled.textContent).toContain('Etapa SLA actual');
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

  it('uses inbox as a secondary shortcut from the order drawer', () => {
    component.inboxThreads = [
      inboxThread,
      {
        ...inboxThread,
        id: 17,
        serviceOrderId: 51,
        serviceOrderCode: 'SO-51',
      } as any,
    ];

    component.openInboxShortcut(createServiceOrder({ id: 51, code: 'SO-51' }));

    expect(component.activeSection).toBe('inbox');
    expect(component.selectedInboxThreadByOrder?.id).toBe(17);
    expect(inboxServiceStub.listThreads).toHaveBeenCalled();
  });
});

function createServiceOrder(overrides: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id: 1,
    code: 'SO-BASE',
    operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
    technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
    commercialStatus: ServiceOrderCommercialStatus.NO_REQUIERE,
    economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
    priority: ServiceOrderPriority.MEDIUM,
    requestOrigin: RequestOrigin.CLIENT,
    clientId: 1,
    createdBy: 1,
    closedBy: null,
    cancelledBy: null,
    assignedToTechnicianId: 77,
    assignedToTechnicianName: 'Tech 77',
    contactName: 'Cliente Base',
    contactPhone: '999999999',
    contactEmail: 'cliente@test.com',
    equipmentType: EquipmentType.LAPTOP,
    equipmentTypeOther: null,
    serviceType: ServiceType.DIAGNOSIS,
    brand: 'Lenovo',
    model: 'ThinkPad',
    serialNumber: 'SER-1',
    accessories: null,
    initialIssue: 'No enciende el equipo.',
    estimatedRepairHours: null,
    assignedAt: null,
    receivedAt: '2026-04-01T10:00:00.000Z',
    reviewStartedAt: null,
    serviceStartedAt: null,
    serviceCompletedAt: null,
    readyForPickupAt: null,
    estimatedDeliveryDate: null,
    resolvedAt: null,
    deliveredAt: null,
    closedAt: null,
    cancelledAt: null,
    notes: null,
    discount: 0,
    cancellationReason: null,
    rating: null,
    ratingComment: null,
    ratedAt: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    deletedAt: null,
    montoComprometidoVigente: 0,
    montoReconciliado: 0,
    ...overrides,
  };
}

function createTimeMetrics(): ServiceOrderTimeMetrics {
  const metric: ServiceOrderDerivedMetric = {
    valueMinutes: 15,
    isComputable: true,
    missingTimestamps: [],
  };

  return {
    timeToDiagnosis: { ...metric },
    timeToServiceStart: { ...metric },
    timeToService: { ...metric },
    timeToResolution: { ...metric },
    timeToDelivery: { ...metric },
  };
}

function createTimeMetricsWithPending(): ServiceOrderTimeMetrics {
  return {
    timeToDiagnosis: {
      valueMinutes: 9,
      isComputable: true,
      missingTimestamps: [],
    },
    timeToServiceStart: {
      valueMinutes: null,
      isComputable: false,
      missingTimestamps: ['serviceStartedAt'],
    },
    timeToService: {
      valueMinutes: null,
      isComputable: false,
      missingTimestamps: ['serviceStartedAt', 'serviceCompletedAt'],
    },
    timeToResolution: {
      valueMinutes: null,
      isComputable: false,
      missingTimestamps: ['resolvedAt'],
    },
    timeToDelivery: {
      valueMinutes: null,
      isComputable: false,
      missingTimestamps: ['deliveredAt'],
    },
  };
}
