import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { of, Subject } from 'rxjs';

import {
  resolveLatestActiveAgreement,
  shouldOpenDerivedAgreementComposer,
  TechnicianPanel,
} from './technician-panel';
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
  ServiceOrderEconomicStatus,
  ServiceOrderOperativeStatus,
  ServiceOrderPriority,
  ServiceOrderTechnicalStatus,
  ServiceType,
} from '../../models/service-orders/service-order';
import {
  ServiceOrderAgreement,
  ServiceOrderAgreementStatus,
} from '../../models/service-orders/service-agreement';
import {
  ServiceOrderDiagnosisOutcome,
  ServiceOrderDiagnosisStatus,
} from '../../models/service-orders/service-order-diagnosis';

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
    create: jasmine.createSpy('create').and.returnValue(of({ id: 999 })),
    update: jasmine.createSpy('update').and.returnValue(of({ id: 999 })),
    confirm: jasmine.createSpy('confirm').and.returnValue(of({ id: 999 })),
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    getCurrentByOrder: jasmine.createSpy('getCurrentByOrder').and.returnValue(of(null)),
    createDiagnosisFeeAgreement: jasmine.createSpy('createDiagnosisFeeAgreement').and.returnValue(of({})),
  };

  const productsServiceStub = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
  };

  const pricingQueryStub = {
    calculatePrice: jasmine.createSpy('calculatePrice').and.returnValue(of({ salePrice: 0 })),
    getSalePriceForProduct: jasmine.createSpy('getSalePriceForProduct').and.returnValue(of({ unitPrice: 0 })),
  };

  const usersApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of([])),
  };

  const currentUserServiceStub = {
    value: { id: 77 },
  };

  const inboxServiceStub = {
    getThreadByOrder: jasmine.createSpy('getThreadByOrder').and.returnValue(of({ id: 901 } as any)),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ thread: null, messages: [] })),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({ ok: true })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of({})),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
  };

  const routerStub = {
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
  };

  beforeEach(async () => {
    agreementServiceStub.create.calls.reset();
    agreementServiceStub.update.calls.reset();
    agreementServiceStub.confirm.calls.reset();
    agreementServiceStub.findAll.calls.reset();
    diagnosisServiceStub.findAll.calls.reset();
    agreementServiceStub.findAll.and.returnValue(of({ data: [] }));
    diagnosisServiceStub.findAll.and.returnValue(of({ data: [] }));

    await TestBed.configureTestingModule({
      declarations: [TechnicianPanel],
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
      providers: [
        { provide: ServiceOrderService, useValue: serviceOrderServiceStub },
        { provide: ServiceOrderDiagnosisService, useValue: diagnosisServiceStub },
        { provide: ServiceOrderAgreementService, useValue: agreementServiceStub },
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: PricingQueryApiService, useValue: pricingQueryStub },
        { provide: UsersApiService, useValue: usersApiStub },
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: ServiceOrderInboxService, useValue: inboxServiceStub },
        { provide: Router, useValue: routerStub },
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

  it('navega al inbox unificado en vez de abrir el modal legacy', async () => {
    const order = createServiceOrder({ id: 88, code: 'SO-88' });

    component.openWhatsAppInbox(order);
    await Promise.resolve();

    expect(inboxServiceStub.getThreadByOrder).toHaveBeenCalledWith(88);
    expect(routerStub.navigate).toHaveBeenCalledWith(['/service-order-inbox'], {
      queryParams: { threadId: 901, serviceOrderId: 88 },
    });
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
    expect(fixture.nativeElement.querySelectorAll('.order-list-row').length).toBe(2);

    component.setActiveTab('repair');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.order-list-row').length).toBe(1);
    expect(component.visibleOrders.map((order) => order.code)).toEqual(['REPAIR-1']);
  });

  it('renders brand, model, serial number and accessories in the equipment split pane', () => {
    component.selectedServiceOrder = createServiceOrder({
      brand: 'Lenovo',
      model: 'ThinkPad T14',
      serialNumber: 'SN-TECH-14',
      accessories: 'Cargador de 65W, mouse inalámbrico',
    });
    component.activeDetailTab = 'equipment';

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const equipmentCardsText = compiled.querySelector('.equipment-info-grid')?.textContent ?? '';

    expect(equipmentCardsText).toContain('Marca');
    expect(equipmentCardsText).toContain('Lenovo');
    expect(equipmentCardsText).toContain('Modelo');
    expect(equipmentCardsText).toContain('ThinkPad T14');
    expect(equipmentCardsText).toContain('N.° de serie');
    expect(equipmentCardsText).toContain('SN-TECH-14');
    expect(equipmentCardsText).toContain('Accesorios');
    expect(equipmentCardsText).toContain('Cargador de 65W, mouse inalámbrico');
  });

  it('detects derived mode only when the order already reached execution and has an active agreement', () => {
    const agreements = [
      createAgreement({ id: 41, sequenceNumber: 1, status: ServiceOrderAgreementStatus.SUPERSEDED }),
      createAgreement({ id: 42, sequenceNumber: 3, status: ServiceOrderAgreementStatus.CONFIRMED }),
      createAgreement({ id: 43, sequenceNumber: 2, status: ServiceOrderAgreementStatus.SUPERSEDED }),
    ];

    expect(resolveLatestActiveAgreement(agreements)?.id).toBe(42);
    expect(
      shouldOpenDerivedAgreementComposer(
        createServiceOrder({ technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA, serviceStartedAt: '2026-04-04T10:00:00.000Z' }),
        [{ status: ServiceOrderDiagnosisStatus.SUPERSEDED }, { status: ServiceOrderDiagnosisStatus.CURRENT }],
        agreements,
      ),
    ).toBeTrue();
    expect(
      shouldOpenDerivedAgreementComposer(
        createServiceOrder({ technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA, serviceStartedAt: null }),
        [{ status: ServiceOrderDiagnosisStatus.SUPERSEDED }, { status: ServiceOrderDiagnosisStatus.CURRENT }],
        agreements,
      ),
    ).toBeFalse();
  });

  it('opens a rediagnosis composer with the latest active agreement as inherited base', () => {
    const order = createServiceOrder({
      id: 19,
      technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA,
      serviceStartedAt: '2026-04-04T10:00:00.000Z',
    });
    const inheritedBase = createAgreement({
      id: 52,
      sequenceNumber: 4,
      status: ServiceOrderAgreementStatus.CONFIRMED,
      notes: 'Notas del acuerdo anterior',
      productItems: [
        createAgreementProduct({ id: 81, productId: 700, productCodeSnapshot: 'RAM-16', productNameSnapshot: 'Memoria RAM', quantity: 2, unitPrice: 45 }),
      ],
      serviceItems: [createAgreementService({ id: 91, unitPrice: 65 })],
    });

    agreementServiceStub.findAll.and.returnValue(of({ data: [inheritedBase] }));
    diagnosisServiceStub.findAll.and.returnValue(
      of({
        data: [
          { id: 1, status: ServiceOrderDiagnosisStatus.CURRENT, outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE },
          { id: 2, status: ServiceOrderDiagnosisStatus.SUPERSEDED, outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE },
        ],
      }),
    );

    component.openAgreementModal(order);
    fixture.detectChanges();

    expect(component.isDerivedAgreementComposer()).toBeTrue();
    expect(component.agreementBaseVersion?.id).toBe(52);
    expect(component.getAgreementInheritedItems().length).toBe(1);
    expect(component.getTechnicalServiceItem()?.unitPrice).toBe(65);
    expect(component.agreementForm.get('notes')?.value).toBe('');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acuerdo anterior heredado');
    expect(compiled.textContent).toContain('Nuevos agregados');
    expect(compiled.textContent).toContain('Notas del acuerdo anterior');
  });

  it('waits for diagnosis history before resolving the derived composer context', () => {
    const order = createServiceOrder({
      id: 21,
      technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA,
      serviceStartedAt: '2026-04-04T10:00:00.000Z',
    });
    const inheritedBase = createAgreement({
      id: 62,
      sequenceNumber: 5,
      status: ServiceOrderAgreementStatus.CONFIRMED,
      productItems: [createAgreementProduct({ id: 82, productNameSnapshot: 'Pantalla' })],
      serviceItems: [createAgreementService({ id: 92, unitPrice: 75 })],
    });
    const agreements$ = new Subject<{ data: ServiceOrderAgreement[] }>();
    const diagnoses$ = new Subject<any>();

    agreementServiceStub.findAll.and.returnValue(agreements$);
    diagnosisServiceStub.findAll.and.returnValues(of({ data: [] }), diagnoses$);

    component.openAgreementModal(order);
    agreements$.next({ data: [inheritedBase] });
    agreements$.complete();

    expect(component.isDerivedAgreementComposer()).toBeFalse();

    diagnoses$.next({
      data: [
        { id: 1, status: ServiceOrderDiagnosisStatus.CURRENT, outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE },
        { id: 2, status: ServiceOrderDiagnosisStatus.SUPERSEDED, outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE },
      ],
    });
    diagnoses$.complete();

    expect(component.isDerivedAgreementComposer()).toBeTrue();
    expect(component.agreementBaseVersion?.id).toBe(62);
    expect(component.getAgreementInheritedItems().length).toBe(1);
  });

  it('keeps inherited product lines blocked and only leaves the inherited technical amount editable', () => {
    const order = createServiceOrder({
      id: 22,
      technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA,
      serviceStartedAt: '2026-04-04T10:00:00.000Z',
    });
    const inheritedBase = createAgreement({
      id: 61,
      sequenceNumber: 2,
      status: ServiceOrderAgreementStatus.CONFIRMED,
      productItems: [createAgreementProduct({ id: 811, productNameSnapshot: 'SSD NVMe', unitPrice: 120 })],
      serviceItems: [createAgreementService({ id: 911, unitPrice: 55 })],
    });

    agreementServiceStub.findAll.and.returnValue(of({ data: [inheritedBase] }));
    diagnosisServiceStub.findAll.and.returnValue(
      of({
        data: [
          { id: 1, status: ServiceOrderDiagnosisStatus.CURRENT, outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE },
          { id: 2, status: ServiceOrderDiagnosisStatus.SUPERSEDED, outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE },
        ],
      }),
    );

    component.openAgreementModal(order);
    component.addAgreementProduct();
    fixture.detectChanges();

    const inheritedItem = component.getAgreementInheritedItems()[0];
    expect(component.canEditAgreementItem(inheritedItem)).toBeFalse();
    expect(component.canRemoveAgreementItemById(inheritedItem.id)).toBeFalse();

    component.updateTechnicalServiceAmount(90);
    expect(component.getTechnicalServiceItem()?.unitPrice).toBe(90);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bloqueado');
    expect(compiled.textContent).toContain('Monto editable');
  });

  it('rejects confirmation if the technical service amount is lower than S/20', () => {
    component.selectedServiceOrder = createServiceOrder({ id: 30 });
    component['agreementEditableTechnicalService'] = {
      id: 1,
      type: 'service',
      serviceId: 1,
      serviceCodeSnapshot: 'TECHNICAL_SERVICE',
      serviceNameSnapshot: 'Servicio técnico',
      unitPrice: 19.5,
      notes: '',
      permissions: { provenance: 'NEW', canEdit: true, canDelete: false },
    };
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

  it('submits only the derived delta payload with baseAgreementId, technicalServiceAmount, notes and newProducts', () => {
    const order = createServiceOrder({ id: 32, technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA });

    component.selectedServiceOrder = order;
    component.agreementBaseVersion = createAgreement({ id: 72, sequenceNumber: 4, status: ServiceOrderAgreementStatus.CONFIRMED });
    component.isDerivedAgreementComposerActive = true;
    component['agreementEditableTechnicalService'] = {
      id: 1,
      type: 'service',
      serviceId: 1,
      serviceCodeSnapshot: 'TECHNICAL_SERVICE',
      serviceNameSnapshot: 'Servicio técnico',
      unitPrice: 85,
      notes: '',
      permissions: { provenance: 'INHERITED', canEdit: true, canDelete: false },
    };
    component.agreementNewItems = [
      {
        id: 2,
        type: 'product',
        productId: 9,
        productCodeSnapshot: null,
        productNameSnapshot: 'Disco SSD',
        quantity: 1,
        unitPrice: 54.9815,
        requiresPurchase: true,
        notes: 'Agregar por rediagnóstico',
        permissions: { provenance: 'NEW', canEdit: true, canDelete: true },
      },
    ];
    component.agreementForm.patchValue({ notes: 'Nuevo alcance de servicio' });
    component.diagnosticHistory = [
      {
        id: 444,
        serviceOrderId: 32,
        sequenceNumber: 2,
        status: ServiceOrderDiagnosisStatus.CURRENT,
        outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE,
        summary: 'Nuevo hallazgo',
        details: null,
        outcomeReason: null,
        recommendedAction: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    component.submitAgreement(false);

    expect(agreementServiceStub.create).toHaveBeenCalledWith({
      serviceOrderId: 32,
      diagnosisId: 444,
      baseAgreementId: 72,
      notes: 'Nuevo alcance de servicio',
      technicalServiceAmount: 85,
      newProducts: [
        {
          productId: 9,
          quantity: 1,
          unitPrice: 54.98,
          requiresPurchase: true,
          notes: 'Agregar por rediagnóstico',
        },
      ],
    });

    const payload = agreementServiceStub.create.calls.mostRecent().args[0];
    expect(payload.products).toBeUndefined();
  });

  it('forces baseAgreementId to be numeric when the inherited agreement id arrives as string', () => {
    const order = createServiceOrder({ id: 32, technicalStatus: ServiceOrderTechnicalStatus.DIAGNOSTICADA });

    component.selectedServiceOrder = order;
    component.agreementBaseVersion = createAgreement({ id: '72' as unknown as number, sequenceNumber: 4, status: ServiceOrderAgreementStatus.CONFIRMED });
    component.isDerivedAgreementComposerActive = true;
    component['agreementEditableTechnicalService'] = {
      id: 1,
      type: 'service',
      serviceId: 1,
      serviceCodeSnapshot: 'TECHNICAL_SERVICE',
      serviceNameSnapshot: 'Servicio técnico',
      unitPrice: 85,
      notes: '',
      permissions: { provenance: 'INHERITED', canEdit: true, canDelete: false },
    };
    component.agreementForm.patchValue({ notes: 'Nuevo alcance de servicio' });
    component.diagnosticHistory = [
      {
        id: 444,
        serviceOrderId: 32,
        sequenceNumber: 2,
        status: ServiceOrderDiagnosisStatus.CURRENT,
        outcome: ServiceOrderDiagnosisOutcome.REPAIRABLE,
        summary: 'Nuevo hallazgo',
        details: null,
        outcomeReason: null,
        recommendedAction: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    component.submitAgreement(false);

    const payload = agreementServiceStub.create.calls.mostRecent().args[0];
    expect(payload.baseAgreementId).toBe(72);
    expect(typeof payload.baseAgreementId).toBe('number');
  });


  it('confirms a derived agreement with explicit replacement messaging', () => {
    component.selectedServiceOrder = createServiceOrder({ id: 40 });
    component.isDerivedAgreementComposerActive = true;
    component['agreementEditableTechnicalService'] = {
      id: 1,
      type: 'service',
      serviceId: 1,
      serviceCodeSnapshot: 'TECHNICAL_SERVICE',
      serviceNameSnapshot: 'Servicio técnico',
      unitPrice: 85,
      notes: '',
      permissions: { provenance: 'INHERITED', canEdit: true, canDelete: false },
    };
    const showMessageSpy = spyOn<any>(component, 'showMessage');

    component.confirmAgreement(999);

    expect(agreementServiceStub.confirm).toHaveBeenCalledWith(999);
    expect(showMessageSpy).toHaveBeenCalledWith(
      'success',
      'fas fa-check-circle',
      'Nueva versión de acuerdo confirmada. La versión anterior quedó reemplazada.',
    );
  });

  it('does not duplicate inherited draft product lines already represented by the base version', () => {
    const baseAgreement = createAgreement({
      id: 71,
      status: ServiceOrderAgreementStatus.CONFIRMED,
      productItems: [createAgreementProduct({ id: 801, productNameSnapshot: 'RAM heredada' })],
      serviceItems: [createAgreementService({ id: 901, unitPrice: 60 })],
    });
    const derivedDraft = createAgreement({
      id: 72,
      derivedFromAgreementId: 71,
      status: ServiceOrderAgreementStatus.DRAFT,
      productItems: [
        createAgreementProduct({ id: 802, provenance: 'INHERITED', derivedFromItemId: 801, productNameSnapshot: 'RAM heredada' }),
        createAgreementProduct({ id: 803, provenance: 'NEW', canEdit: true, canDelete: true, productNameSnapshot: 'Flex nuevo' }),
      ],
      serviceItems: [createAgreementService({ id: 902, provenance: 'INHERITED', derivedFromItemId: 901, unitPrice: 85 })],
    });

    component.agreementBaseVersion = baseAgreement;
    component.isDerivedAgreementComposerActive = true;
    component['hydrateAgreementComposer'](derivedDraft);

    expect(component.getAgreementInheritedItems().map((item) => component.getAgreementItemDisplayName(item))).toEqual(['SKU-1 · RAM heredada']);
    expect(component.getAgreementProductItems().map((item) => item.productNameSnapshot)).toEqual(['Flex nuevo']);
    expect(component.getTechnicalServiceItem()?.unitPrice).toBe(85);
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

function createAgreement(overrides: Partial<ServiceOrderAgreement> = {}): ServiceOrderAgreement {
  return {
    id: 1,
    serviceOrderId: 1,
    serviceOrder: null,
    diagnosisId: 1,
    derivedFromAgreementId: null,
    sequenceNumber: 1,
    status: ServiceOrderAgreementStatus.DRAFT,
    source: null,
    currency: 'PEN',
    totalAmount: 0,
    notes: null,
    productItems: [],
    serviceItems: [],
    agreedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as ServiceOrderAgreement;
}

function createAgreementProduct(overrides: any = {}) {
  return {
    id: 1,
    serviceOrderAgreementId: 1,
    provenance: 'INHERITED',
    canEdit: false,
    canDelete: false,
    derivedFromItemId: 1,
    productId: 1,
    productCodeSnapshot: 'SKU-1',
    productNameSnapshot: 'Producto base',
    productDescriptionSnapshot: null,
    quantity: 1,
    unitPrice: 25,
    lineTotal: 25,
    requiresPurchase: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function createAgreementService(overrides: any = {}) {
  return {
    id: 1,
    serviceOrderAgreementId: 1,
    provenance: 'INHERITED',
    canEdit: true,
    canDelete: false,
    derivedFromItemId: 1,
    serviceId: 1,
    serviceCodeSnapshot: 'TECHNICAL_SERVICE',
    serviceNameSnapshot: 'Servicio técnico',
    serviceDescriptionSnapshot: null,
    estimatedHours: 1,
    unitPrice: 20,
    lineTotal: 20,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    service: null,
    ...overrides,
  };
}

