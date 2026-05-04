import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ProductsService } from '../../services/inventory/products.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { UsersApiService } from '../../services/rbac/users-api.service';
import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import {
  EquipmentType,
  RequestOrigin,
  ServiceOrder,
  ServiceOrderCommercialStatus,
  ServiceOrderDerivedMetric,
  ServiceOrderEconomicStatus,
  ServiceOrderOperativeStatus,
  ServiceOrderPriority,
  ServiceOrderSla,
  ServiceOrderTechnicalStatus,
  ServiceOrderTimeMetrics,
  ServiceType,
} from '../../models/service-orders/service-order';
import { TechnicianPanel } from './technician-panel';

describe('TechnicianPanel', () => {
  let component: TechnicianPanel;
  let fixture: ComponentFixture<TechnicianPanel>;

  const serviceOrderServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    changeTechnicalStatus: jasmine.createSpy('changeTechnicalStatus').and.returnValue(of({})),
  };

  const diagnosisServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    create: jasmine.createSpy('create').and.returnValue(of({})),
  };

  const agreementServiceStub = {
    create: jasmine.createSpy('create').and.returnValue(of({})),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    getCurrentByOrder: jasmine.createSpy('getCurrentByOrder').and.returnValue(of(null)),
    createDiagnosisFeeAgreement: jasmine.createSpy('createDiagnosisFeeAgreement').and.returnValue(of({})),
  };

  const productsServiceStub = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
  };

  const pricingQueryStub = {
    getSalePriceForProduct: jasmine.createSpy('getSalePriceForProduct').and.returnValue(of({ unitPrice: 0 })),
  };

  const usersApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of([])),
  };

  const currentUserServiceStub = {
    value: { id: 77 },
  };

  const inboxServiceStub = {
    ensureThreadByOrder: jasmine.createSpy('ensureThreadByOrder').and.returnValue(of(null)),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ thread: null, messages: [] })),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({ ok: true })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of({})),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TechnicianPanel],
      imports: [CommonModule, FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ServiceOrderService, useValue: serviceOrderServiceStub },
        { provide: ServiceOrderDiagnosisService, useValue: diagnosisServiceStub },
        { provide: ServiceOrderAgreementService, useValue: agreementServiceStub },
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: PricingQueryApiService, useValue: pricingQueryStub },
        { provide: UsersApiService, useValue: usersApiStub },
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: ServiceOrderInboxService, useValue: inboxServiceStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TechnicianPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('segments orders into tabs by technical status', () => {
    const orders = [
      createServiceOrder({ id: 1, code: 'SO-1', technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA }),
      createServiceOrder({ id: 2, code: 'SO-2', technicalStatus: ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION }),
      createServiceOrder({ id: 3, code: 'SO-3', technicalStatus: ServiceOrderTechnicalStatus.EN_DIAGNOSTICO }),
      createServiceOrder({ id: 4, code: 'SO-4', technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA }),
      createServiceOrder({ id: 5, code: 'SO-5', technicalStatus: ServiceOrderTechnicalStatus.PENDIENTE_DEFINICION_COMERCIAL }),
      createServiceOrder({ id: 6, code: 'SO-6', technicalStatus: ServiceOrderTechnicalStatus.EN_EJECUCION }),
      createServiceOrder({ id: 7, code: 'SO-7', technicalStatus: ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO }),
      createServiceOrder({ id: 8, code: 'SO-8', technicalStatus: ServiceOrderTechnicalStatus.RESUELTA }),
    ];

    component['hydrateLists'](orders);

    expect(component.todoOrders.map((order) => order.code)).toEqual(['SO-1', 'SO-2']);
    expect(component.diagnosisOrders.map((order) => order.code)).toEqual(['SO-3']);
    expect(component.pendingApprovalOrders.map((order) => order.code)).toEqual(['SO-4', 'SO-5']);
    expect(component.repairOrders.map((order) => order.code)).toEqual(['SO-6', 'SO-7']);
    expect(component.repairedOrders.map((order) => order.code)).toEqual(['SO-8']);
  });

  it('renders only the active tab orders', () => {
    component['hydrateLists']([
      createServiceOrder({ id: 1, code: 'TODO-1', technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA }),
      createServiceOrder({ id: 2, code: 'TODO-2', technicalStatus: ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION }),
      createServiceOrder({ id: 3, code: 'REPAIR-1', technicalStatus: ServiceOrderTechnicalStatus.EN_EJECUCION }),
    ]);

    component.setActiveTab('todo');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.items-grid .item-card').length).toBe(2);

    component.setActiveTab('repair');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.items-grid .item-card').length).toBe(1);
    expect(component.visibleOrders.map((order) => order.code)).toEqual(['REPAIR-1']);
  });

  it('enables diagnosis and service actions only for matching technical statuses', () => {
    const assignedDiagnosis = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
      serviceType: ServiceType.DIAGNOSIS,
    });
    const assignedWarranty = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
      serviceType: ServiceType.WARRANTY_SERVICE,
    });
    const authorizedStandard = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      serviceType: ServiceType.STANDARD_SERVICE,
    });
    const authorizedDiagnosis = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.AUTORIZADA_PARA_EJECUCION,
      serviceType: ServiceType.DIAGNOSIS,
    });
    const executingDiagnosis = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.EN_EJECUCION,
      serviceType: ServiceType.DIAGNOSIS,
    });

    expect(component.canStartDiagnosis(assignedDiagnosis)).toBeTrue();
    expect(component.canStartDiagnosis(assignedWarranty)).toBeTrue();
    expect(component.canStartDiagnosis(authorizedStandard)).toBeFalse();

    expect(component.canStartStandardService(authorizedStandard)).toBeTrue();
    expect(component.canStartStandardService(assignedDiagnosis)).toBeFalse();

    expect(component.canStartRepairDirectly(authorizedDiagnosis)).toBeTrue();
    expect(component.canStartRepairDirectly(authorizedStandard)).toBeFalse();

    expect(component.canFinishRepair(executingDiagnosis)).toBeTrue();
    expect(component.canFinishRepair(authorizedDiagnosis)).toBeFalse();

    expect(component.canOpenRediagnosis(executingDiagnosis)).toBeTrue();
    expect(component.canOpenRediagnosis(authorizedDiagnosis)).toBeFalse();
  });

  it('allows starting diagnosis on a second eligible order even if another one is already in diagnosis', () => {
    const inDiagnosis = createServiceOrder({
      id: 1,
      technicalStatus: ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      serviceType: ServiceType.DIAGNOSIS,
    });
    const assignedDiagnosis = createServiceOrder({
      id: 2,
      technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
      serviceType: ServiceType.DIAGNOSIS,
    });
    const transitionWorkflowSpy = spyOn<any>(component, 'transitionWorkflow');
    const showMessageSpy = spyOn<any>(component, 'showMessage');

    component['hydrateLists']([inDiagnosis, assignedDiagnosis]);
    component.startDiagnosis(assignedDiagnosis);

    expect(transitionWorkflowSpy).toHaveBeenCalledWith(
      assignedDiagnosis,
      ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      'Diagnostico iniciado correctamente.',
    );
    expect(showMessageSpy).not.toHaveBeenCalledWith(
      'warning',
      'fas fa-exclamation-circle',
      'Completa la revision activa antes de iniciar otra.',
    );
  });
  it('enables warranty review actions only while warranty orders are in diagnosis', () => {
    const warrantyInDiagnosis = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      serviceType: ServiceType.WARRANTY_SERVICE,
    });
    const warrantyResolved = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.RESUELTA,
      serviceType: ServiceType.WARRANTY_SERVICE,
    });
    const diagnosisOrder = createServiceOrder({
      technicalStatus: ServiceOrderTechnicalStatus.EN_DIAGNOSTICO,
      serviceType: ServiceType.DIAGNOSIS,
    });

    expect(component.canAcceptWarrantyReview(warrantyInDiagnosis)).toBeTrue();
    expect(component.canRejectWarrantyReview(warrantyInDiagnosis)).toBeTrue();
    expect(component.canAcceptWarrantyReview(warrantyResolved)).toBeFalse();
    expect(component.canRejectWarrantyReview(diagnosisOrder)).toBeFalse();
  });

  it('construye el acuerdo técnico con monto mínimo fijo sin catálogo', () => {
    component.agreementItems = [
      {
        id: 1,
        type: 'service',
        serviceId: 1,
        unitPrice: 35,
        notes: 'Servicio base',
      } as any,
    ];

    expect((component as any).resolveTechnicalServiceAmount()).toBe(35);
    expect(component.getServiceName({ serviceNameSnapshot: 'Servicio técnico', serviceId: null } as any)).toBe('Servicio técnico');
  });

  it('abre el modal con la línea fija de servicio técnico cuando no existe acuerdo previo', () => {
    const order = createServiceOrder({ id: 19, technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA });

    component.openAgreementModal(order);

    expect(component.agreementItems).toEqual([
      jasmine.objectContaining({
        type: 'service',
        serviceId: 1,
        unitPrice: 20,
      }),
    ]);
  });

  it('no permite remover manualmente la línea fija de servicio técnico', () => {
    component.agreementItems = [
      { id: 1, type: 'service', serviceId: 1, unitPrice: 50, notes: '' } as any,
      { id: 2, type: 'product', productId: 9, quantity: 1, unitPrice: 30, requiresPurchase: false, notes: '' } as any,
    ];

    component.removeAgreementItem(0);

    expect(component.agreementItems[0]).toEqual(
      jasmine.objectContaining({ type: 'service', serviceId: 1, unitPrice: 50 }),
    );
    expect(component.agreementItems.length).toBe(2);
  });

  it('rechaza confirmar si el monto del servicio técnico es menor a S/20', () => {
    component.selectedServiceOrder = createServiceOrder({ id: 30 });
    component.agreementItems = [
      { id: 1, type: 'service', serviceId: 1, unitPrice: 19.5, notes: '' } as any,
    ];
    const showMessageSpy = spyOn<any>(component, 'showMessage');

    component.submitAgreement(true);

    expect(showMessageSpy).toHaveBeenCalledWith(
      'warning',
      'fas fa-exclamation-circle',
      'El servicio técnico debe ser de al menos S/20.',
    );
    expect(agreementServiceStub.create).not.toHaveBeenCalled();
    expect(agreementServiceStub.update).not.toHaveBeenCalled();
  });

  it('shows only the operational SLA summary in the sla tab', () => {
    component.selectedServiceOrder = createServiceOrder({
      sla: {
        stage: 'diagnosis',
        targetMinutes: 120,
        elapsedMinutes: 30,
        remainingMinutes: 90,
        breached: false,
      },
      timeMetrics: createTimeMetrics(),
    });
    component.activeDetailTab = 'sla';

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.service-order-sla-summary')).not.toBeNull();
    expect(compiled.querySelector('.service-order-derived-metrics-grid')).toBeNull();
    expect(compiled.textContent).not.toContain('Tiempo a diagnóstico');
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

