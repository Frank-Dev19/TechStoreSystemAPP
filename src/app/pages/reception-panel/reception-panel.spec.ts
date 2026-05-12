import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ClientKind, ClientSaveRequest } from '../../models/clients-request';
import { DocumentTypeKind } from '../../models/document-types/document-types-request';
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
import { ServiceOrderBillingLink } from '../../models/service-orders/service-order-billing-link';
import { ClientsApiService } from '../../services/clients-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { ProductsService } from '../../services/inventory/products.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { UsersApiService } from '../../services/rbac/users-api.service';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { SaleReceiptPdfService } from '../../services/sales/sale-receipt-pdf.service';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ServiceOrderBillingLinkService } from '../../services/service-orders/service-order-billing-link.service';
import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderDocumentsService } from '../../services/service-orders/service-order-documents.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { DEFAULT_PHONE_COUNTRY } from '../../utils/phone.util';
import { ReceptionPanel } from './reception-panel';

describe('ReceptionPanel', () => {
  let component: ReceptionPanel;
  let fixture: ComponentFixture<ReceptionPanel>;

  const serviceOrderServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    create: jasmine.createSpy('create').and.returnValue(of({ id: 1, serviceType: ServiceType.DIAGNOSIS })),
    createBatch: jasmine.createSpy('createBatch').and.returnValue(of({ createdOrders: [{ id: 1, serviceType: ServiceType.DIAGNOSIS }] })),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    markAsDelivered: jasmine.createSpy('markAsDelivered').and.returnValue(of({})),
    changeTechnicalStatus: jasmine.createSpy('changeTechnicalStatus').and.returnValue(of({})),
  };

  const clientsServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    create: jasmine.createSpy('create').and.returnValue(of({} as ClientSaveRequest)),
    update: jasmine.createSpy('update').and.returnValue(of({ id: 2, contacts: [] })),
  };

  const productsServiceStub = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
  };

  const agreementServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
    createDiagnosisFeeAgreement: jasmine.createSpy('createDiagnosisFeeAgreement').and.returnValue(of({})),
    create: jasmine.createSpy('create').and.returnValue(of({})),
    supersedeVoidedAgreement: jasmine.createSpy('supersedeVoidedAgreement').and.returnValue(of({})),
    supersedeServiceOrderAgreement: jasmine.createSpy('supersedeServiceOrderAgreement').and.returnValue(of({})),
  };

  const diagnosisServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
  };

  const documentTypesServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
  };

  const usersApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of([])),
  };

  const pricingQueryStub = {
    getSalePriceForProduct: jasmine.createSpy('getSalePriceForProduct').and.returnValue(of({ unitPrice: 0 })),
  };

  const serviceOrderDocumentsStub = {
    downloadOrderSummaryPdf: jasmine.createSpy('downloadOrderSummaryPdf'),
    openEquipmentStickerPdf: jasmine.createSpy('openEquipmentStickerPdf'),
  };

  const billingLinksStub = {
    getLinksByOrders: jasmine.createSpy('getLinksByOrders').and.returnValue(of([])),
    linkSale: jasmine.createSpy('linkSale').and.returnValue(of({})),
  };

  const salesApiStub = {
    get: jasmine.createSpy('get').and.returnValue(of(null)),
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
  };

  const saleReceiptPdfServiceStub = {
    downloadBySaleId: jasmine.createSpy('downloadBySaleId').and.returnValue(of('B001-001.pdf')),
  };

  const inboxServiceStub = {
    ensureThreadByOrder: jasmine.createSpy('ensureThreadByOrder').and.returnValue(of(null)),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ thread: null, messages: [] })),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({ ok: true })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of({})),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
  };

  beforeEach(async () => {
    saleReceiptPdfServiceStub.downloadBySaleId.and.returnValue(of('B001-001.pdf'));

    await TestBed.configureTestingModule({
      declarations: [ReceptionPanel],
      imports: [CommonModule, FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ServiceOrderService, useValue: serviceOrderServiceStub },
        { provide: ClientsApiService, useValue: clientsServiceStub },
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: ServiceOrderAgreementService, useValue: agreementServiceStub },
        { provide: ServiceOrderDiagnosisService, useValue: diagnosisServiceStub },
        { provide: DocumentTypesApiService, useValue: documentTypesServiceStub },
        { provide: UsersApiService, useValue: usersApiStub },
        { provide: PricingQueryApiService, useValue: pricingQueryStub },
        { provide: ServiceOrderDocumentsService, useValue: serviceOrderDocumentsStub },
        { provide: ServiceOrderBillingLinkService, useValue: billingLinksStub },
        { provide: SalesApiService, useValue: salesApiStub },
        { provide: SaleReceiptPdfService, useValue: saleReceiptPdfServiceStub },
        { provide: ServiceOrderInboxService, useValue: inboxServiceStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa Perú por defecto en la captura telefónica del wizard', () => {
    expect(component.createServiceOrderForm.get('contactPhoneCountry')?.value).toEqual(DEFAULT_PHONE_COUNTRY);
  });

  it('filters orders by operative status', () => {
    component.serviceOrders = [
      createServiceOrder({ id: 1, code: 'SO-OPEN', operativeStatus: ServiceOrderOperativeStatus.ABIERTA }),
      createServiceOrder({ id: 2, code: 'SO-DELIVERY', operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA }),
      createServiceOrder({ id: 3, code: 'SO-DONE', operativeStatus: ServiceOrderOperativeStatus.ENTREGADA }),
    ];

    component.filterState = ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA;
    component.applyFilters();
    fixture.detectChanges();

    expect(component.filteredServiceOrders.map((order) => order.code)).toEqual(['SO-DELIVERY']);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('does not allow manual payment and shows the canonical warning', () => {
    const serviceOrder = createServiceOrder();
    const showMessageSpy = spyOn<any>(component, 'showMessage');

    expect(component.canMarkServiceOrderAsPaid(serviceOrder)).toBeFalse();

    component.markServiceOrderAsPaid(serviceOrder);

    expect(showMessageSpy).toHaveBeenCalledWith(
      'warning',
      'fas fa-info-circle',
      'El marcado manual de pago fue eliminado. Vincula un comprobante para reflejar el estado económico de la orden.',
    );
  });

  it('requires delivery status and billing evidence when the order is billable', () => {
    const warrantyReady = createServiceOrder({
      id: 10,
      operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      serviceType: ServiceType.WARRANTY_SERVICE,
    });
    const diagnosisReady = createServiceOrder({
      id: 11,
      operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      serviceType: ServiceType.DIAGNOSIS,
      technicalStatus: ServiceOrderTechnicalStatus.RESUELTA,
    });

    expect(component.canDeliverItem(createServiceOrder())).toBeFalse();
    expect(component.canDeliverItem(warrantyReady)).toBeTrue();
    expect(component.canDeliverItem(diagnosisReady)).toBeFalse();

    component.saleLinksByOrderId[11] = [createBillingLink(11)];
    expect(component.canDeliverItem(diagnosisReady)).toBeTrue();
  });

  it('enables warranty actions only for delivered non-warranty orders with client data', () => {
    const deliveredStandard = createServiceOrder({
      operativeStatus: ServiceOrderOperativeStatus.ENTREGADA,
      serviceType: ServiceType.STANDARD_SERVICE,
      clientId: 25,
    });
    const inProgress = createServiceOrder({
      operativeStatus: ServiceOrderOperativeStatus.EN_PROCESO,
      serviceType: ServiceType.STANDARD_SERVICE,
      clientId: 25,
    });
    const deliveredWarranty = createServiceOrder({
      operativeStatus: ServiceOrderOperativeStatus.ENTREGADA,
      serviceType: ServiceType.WARRANTY_SERVICE,
      clientId: 25,
    });

    expect(component.canOpenWarrantyAction(deliveredStandard)).toBeTrue();
    expect(component.canOpenWarrantyAction(inProgress)).toBeFalse();
    expect(component.canOpenWarrantyAction(deliveredWarranty)).toBeFalse();
    expect(component.canOpenWarrantyAction({ ...deliveredStandard, clientId: null })).toBeFalse();
  });

  it('creates boleta eligibility from economic, technical and operative state', () => {
    const totalOrder = createServiceOrder({
      serviceType: ServiceType.STANDARD_SERVICE,
      economicStatus: ServiceOrderEconomicStatus.TOTAL,
      technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
      operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
    });
    const executingDiagnosis = createServiceOrder({
      serviceType: ServiceType.DIAGNOSIS,
      economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
      technicalStatus: ServiceOrderTechnicalStatus.EN_EJECUCION,
      operativeStatus: ServiceOrderOperativeStatus.EN_PROCESO,
    });
    const deliveredDiagnosis = createServiceOrder({
      serviceType: ServiceType.DIAGNOSIS,
      economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
      technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
      operativeStatus: ServiceOrderOperativeStatus.ENTREGADA,
    });
    const pendingDiagnosis = createServiceOrder({
      serviceType: ServiceType.DIAGNOSIS,
      economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
      technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
      operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
    });
    const warrantyOrder = createServiceOrder({
      serviceType: ServiceType.WARRANTY_SERVICE,
      economicStatus: ServiceOrderEconomicStatus.TOTAL,
      operativeStatus: ServiceOrderOperativeStatus.ENTREGADA,
    });

    expect(component.canCreateBoletaFromOrder(totalOrder)).toBeTrue();
    expect(component.canCreateBoletaFromOrder(executingDiagnosis)).toBeTrue();
    expect(component.canCreateBoletaFromOrder(deliveredDiagnosis)).toBeTrue();
    expect(component.canCreateBoletaFromOrder(pendingDiagnosis)).toBeFalse();
    expect(component.canCreateBoletaFromOrder(warrantyOrder)).toBeFalse();
  });

  it('sends contact data when creating a batch service order', fakeAsync(() => {
    clientsServiceStub.create.and.returnValue(
      of({
        id: 1,
        name: 'Cliente Test',
        kind: ClientKind.PERSON,
        contacts: [],
      } as any),
    );

    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      documentNumber: '12345678',
      documentTypeId: 1,
      contactName: 'Cliente Test',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '999999999',
      contactEmail: 'cliente@test.com',
      priority: ServiceOrderPriority.MEDIUM,
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
    });

    (component as any).addCurrentEquipmentToCreateOrderBatch()
    component.submitCreateServiceOrder();
    tick();

    expect(serviceOrderServiceStub.createBatch).toHaveBeenCalledWith(
      jasmine.objectContaining({
        sharedContext: jasmine.objectContaining({
          contactName: 'Cliente Test',
          contactPhone: '+51999999999',
          contactEmail: 'cliente@test.com',
        }),
        orders: [jasmine.objectContaining({
          initialIssue: 'No enciende',
        })],
      }),
    );
  }));

  it('crea empresa con razÃ³n social y contacto separados cuando el flujo es COMPANY', fakeAsync(() => {
    clientsServiceStub.create.and.returnValue(
      of({
        id: 40,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        tradeName: 'Empresa',
        documentTypeId: 2,
        documentNumber: '12345678901',
        contacts: [{ id: 55, clientId: 40, name: 'Ana Contacto', isPrimary: true, phone: '+51900111222' }],
      } as any),
    );

    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      documentTypeId: 2,
      documentNumber: '12345678901',
      clientKind: ClientKind.COMPANY,
      companyName: 'Empresa SAC',
      companyTradeName: 'Empresa',
      contactName: 'Ana Contacto',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '900111222',
      contactEmail: 'ana@empresa.com',
      priority: ServiceOrderPriority.MEDIUM,
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
    });

    (component as any).addCurrentEquipmentToCreateOrderBatch()
    component.submitCreateServiceOrder();
    tick();

    expect(clientsServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        tradeName: 'Empresa',
        contacts: [
          jasmine.objectContaining({
            name: 'Ana Contacto',
            phone: '+51900111222',
            isPrimary: true,
          }),
        ],
      }),
    );
    expect(serviceOrderServiceStub.createBatch).toHaveBeenCalledWith(
      jasmine.objectContaining({
        sharedContext: jasmine.objectContaining({
          clientContactId: 55,
          contactName: 'Ana Contacto',
        }),
      }),
    );
  }));

  it('permite acumular mÃºltiples equipos candidatos antes del submit batch', () => {
    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.DIAGNOSIS,
      equipmentType: EquipmentType.LAPTOP,
      brand: 'Lenovo',
      initialIssue: 'No enciende',
    })

    component.addCurrentEquipmentToCreateOrderBatch()

    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.DIAGNOSIS,
      equipmentType: EquipmentType.PRINTER,
      brand: 'Epson',
      initialIssue: 'Atasco de papel',
    })

    component.addCurrentEquipmentToCreateOrderBatch()

    expect(component.createServiceOrderCandidates.length).toBe(2)
    expect(component.getCreateOrderSummaryItems().map((item) => item.equipmentTypeLabel)).toEqual([
      'Laptop',
      'Impresora',
    ])
  })

  it('ofrece agregar otro equipo desde la etapa de equipos y no durante ediciÃ³n', () => {
    component.createServiceOrderStep = 3
    component.createServiceOrderCandidates = [
      {
        equipmentType: EquipmentType.LAPTOP,
        equipmentTypeOther: null,
        brand: 'Lenovo',
        model: null,
        serialNumber: null,
        accessories: null,
        initialIssue: 'No enciende',
        serviceType: ServiceType.DIAGNOSIS,
        quoteItems: [],
      } as any,
    ]

    expect(component.canAddAnotherCreateServiceOrderCandidate()).toBeTrue()

    component.editingCreateServiceOrderCandidateIndex = 0
    expect(component.canAddAnotherCreateServiceOrderCandidate()).toBeFalse()
  })

  it('preselecciona el contacto primary al aplicar una empresa existente', fakeAsync(() => {
    component.clients = [
      {
        id: 77,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Cliente Empresa',
        tradeName: 'CE',
        documentTypeId: 2,
        documentNumber: '12345678901',
        contacts: [
          { id: 91, clientId: 77, name: 'Secundario', isPrimary: false, phone: '900000001' },
          { id: 92, clientId: 77, name: 'Principal', isPrimary: true, phone: '900000002' },
        ],
      } as any,
    ];

    (component as any).applyPartnerData(component.clients[0] as any);
    tick();

    expect(component.createServiceOrderForm.get('clientContactId')?.value).toBe('92');
    expect(component.createServiceOrderForm.get('contactName')?.value).toBe('Principal');
  }));

  it('mantiene los datos legales de empresa en solo lectura y permite crear un nuevo contacto inline', () => {
    component.clients = [
      {
        id: 88,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        tradeName: 'Empresa',
        documentTypeId: 2,
        documentNumber: '12345678901',
        contacts: [
          { id: 101, clientId: 88, name: 'Principal', isPrimary: true, phone: '900000002' },
        ],
      } as any,
    ];

    (component as any).applyPartnerData(component.clients[0] as any);

    expect(component.createServiceOrderForm.get('companyName')?.disabled).toBeTrue();
    expect(component.createServiceOrderForm.get('companyTradeName')?.disabled).toBeTrue();
    expect(component.createServiceOrderForm.get('contactName')?.disabled).toBeTrue();

    component.createServiceOrderForm.patchValue({ clientContactId: null });
    component.onClientContactSelectionChange();

    expect(component.createServiceOrderForm.get('companyName')?.disabled).toBeTrue();
    expect(component.createServiceOrderForm.get('companyTradeName')?.disabled).toBeTrue();
    expect(component.createServiceOrderForm.get('contactName')?.enabled).toBeTrue();
    expect(component.createServiceOrderForm.get('contactPhone')?.enabled).toBeTrue();
  });

  it('prefiere documentType.kind sobre la heurÃ­stica legacy en recepciÃ³n', () => {
    component.documentTypes = [
      { id: 3, name: 'DOC-11', digits: 11, description: 'doc', kind: DocumentTypeKind.PERSON } as any,
    ];

    component.createServiceOrderForm.patchValue({ documentTypeId: 3 });
    component.onDocumentTypeChange();

    expect(component.createServiceOrderForm.get('clientKind')?.value).toBe(ClientKind.PERSON);
  });

  it('mantiene fallback legacy en recepciÃ³n cuando falta kind', () => {
    component.documentTypes = [
      { id: 4, name: 'RUC LEGACY', digits: 11, description: 'doc', kind: null } as any,
    ];

    component.createServiceOrderForm.patchValue({ documentTypeId: 4 });
    component.onDocumentTypeChange();

    expect(component.createServiceOrderForm.get('clientKind')?.value).toBe(ClientKind.COMPANY);
  });

  // Task 3.4 & 3.5: Verify company fields show/hide based on clientKind
  it('campos de empresa se ocultan cuando clientKind es PERSON', fakeAsync(() => {
    // Setup: open modal and go to step 2 (client step)
    component.showCreateServiceOrderModal = true;
    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      documentTypeId: 1,
      documentNumber: '12345678',
      clientKind: ClientKind.PERSON,
    });
    component.createServiceOrderStep = 2;
    fixture.detectChanges();
    tick();

    // Company fields should NOT be visible when clientKind is PERSON
    const companyNameInput = fixture.nativeElement.querySelector('#companyName');
    const companyTradeNameInput = fixture.nativeElement.querySelector('#companyTradeName');
    expect(companyNameInput).toBeFalsy();
    expect(companyTradeNameInput).toBeFalsy();
  }));

  it('campos de empresa se muestran cuando clientKind es COMPANY', fakeAsync(() => {
    // Setup: open modal and go to step 2 (client step)
    component.showCreateServiceOrderModal = true;
    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      documentTypeId: 2,
      documentNumber: '12345678901',
      clientKind: ClientKind.COMPANY,
    });
    component.createServiceOrderStep = 2;
    fixture.detectChanges();
    tick();

    // Company fields SHOULD be visible when clientKind is COMPANY
    const companyNameInput = fixture.nativeElement.querySelector('#companyName');
    const companyTradeNameInput = fixture.nativeElement.querySelector('#companyTradeName');
    expect(companyNameInput).toBeTruthy();
    expect(companyTradeNameInput).toBeTruthy();
  }));

  it('genera la tabla del PDF del documento ligado con columna NÂ° en vez de Tipo', () => {
    const order = createServiceOrder({ id: 12 });
    component.saleLinksByOrderId[12] = [createBillingLink(12)];
    const showMessageSpy = spyOn<any>(component, 'showMessage');

    component.downloadLinkedSaleDocument(order);

    expect(saleReceiptPdfServiceStub.downloadBySaleId).toHaveBeenCalledWith(99, 'linked-summary');
    expect(showMessageSpy).toHaveBeenCalledWith(
      'success',
      'fas fa-check-circle',
      'Documento descargado: B001-001.pdf',
    );
  });

  it('keeps error feedback in the page when linked PDF generation fails', () => {
    const order = createServiceOrder({ id: 13 });
    component.saleLinksByOrderId[13] = [createBillingLink(13)];
    saleReceiptPdfServiceStub.downloadBySaleId.and.returnValue(
      throwError(() => new Error('renderer failed')),
    );
    const showMessageSpy = spyOn<any>(component, 'showMessage');

    component.downloadLinkedSaleDocument(order);

    expect(showMessageSpy).toHaveBeenCalledWith(
      'danger',
      'fas fa-times-circle',
      'No pudimos descargar el documento ligado.',
    );
  });

  it('arma payloads de acuerdos con technicalServiceAmount y sin services[]', () => {
    const payload = (component as any).buildServiceOrderAgreementPayload(
      99,
      ServiceType.STANDARD_SERVICE,
      [
        {
          id: 1,
          type: 'service',
          serviceId: 1,
          unitPrice: 45,
          notes: 'Servicio tÃ©cnico',
        },
      ],
      'Notas',
    );

    expect(payload.technicalServiceAmount).toBe(45);
    expect(payload.services).toBeUndefined();
  });

  it('abre el modal de acuerdo con la lÃ­nea fija de Servicio tÃ©cnico ya creada', () => {
    const order = createServiceOrder({ id: 21, serviceType: ServiceType.DIAGNOSIS });

    component.openCreateServiceOrderAgreementModal(order);

    expect(component.quoteItems.length).toBe(1);
    expect(component.quoteItems[0]).toEqual(
      jasmine.objectContaining({
        type: 'service',
        serviceId: 1,
        unitPrice: 20,
      }),
    );
  });

  it('permite editar el monto manual del servicio tÃ©cnico y lo refleja en el payload', () => {
    const order = createServiceOrder({ id: 22, serviceType: ServiceType.STANDARD_SERVICE });
    component.openCreateServiceOrderAgreementModal(order);

    const serviceItem = component.quoteItems[0] as any;
    component.updateTechnicalServiceAmount(serviceItem, 85);

    const payload = (component as any).buildServiceOrderAgreementPayload(
      22,
      ServiceType.STANDARD_SERVICE,
      component.quoteItems,
      'Notas',
    );

    expect(payload.technicalServiceAmount).toBe(85);
    expect(serviceItem.unitPrice).toBe(85);
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
    assignedToTechnicianId: 10,
    assignedToTechnicianName: 'Tech Base',
    clientSnapshotName: 'Cliente Base',
    clientSnapshotDocumentNumber: '12345678',
    clientSnapshotPhone: '+51999999999',
    clientSnapshotEmail: 'cliente@test.com',
    contactName: 'Cliente Base',
    contactPhone: '+51999999999',
    contactEmail: 'cliente@test.com',
    equipmentType: EquipmentType.LAPTOP,
    equipmentTypeOther: null,
    serviceType: ServiceType.STANDARD_SERVICE,
    brand: 'Dell',
    model: 'Inspiron',
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

function createBillingLink(serviceOrderId: number): ServiceOrderBillingLink {
  return {
    id: 1,
    saleId: 99,
    serviceOrderId,
    agreementId: null,
    linkedAmount: 100,
    linkedAt: '2026-04-02T10:00:00.000Z',
    sale: {
      id: 99,
      companyId: 1,
      customerId: 1,
      customer: {
        id: 1,
        name: 'Cliente Base',
        documentNumber: '12345678',
        documentTypeId: 1,
      },
      saleType: 'COUNTER' as any,
      documentType: 'BOLETA' as any,
      series: 'B001',
      number: '123456',
      issueDate: '2026-04-02T10:00:00.000Z',
      applyAutoDiscounts: false,
      baseSubtotal: 84.75,
      subtotal: 84.75,
      discountTotal: 0,
      taxAmount: 15.25,
      status: 'EMITIDA' as any,
      total: 100,
      taxRate: 18,
      items: [],
      payments: [],
      lineDiscounts: [],
      comboItems: [],
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    } as any,
  };
}

