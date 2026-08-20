import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { DEFAULT_PHONE_COUNTRY } from '../../utils/phone.util';
import { ReceptionPanel } from './reception-panel';

describe('ReceptionPanel', () => {
  let component: ReceptionPanel;
  let fixture: ComponentFixture<ReceptionPanel>;

  const serviceOrderServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [] })),
      findOne: jasmine.createSpy('findOne').and.returnValue(of(createServiceOrder())),
    create: jasmine.createSpy('create').and.returnValue(of({
      id: 1,
      code: 'OS-03-08-2026-0001',
      serviceType: ServiceType.DIAGNOSIS,
      items: [{ id: 1 }],
    })),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    markAsDelivered: jasmine.createSpy('markAsDelivered').and.returnValue(of({})),
    deliverItem: jasmine.createSpy('deliverItem').and.returnValue(of({})),
    changeTechnicalStatus: jasmine.createSpy('changeTechnicalStatus').and.returnValue(of({})),
    getTechnicianSuggestion: jasmine
      .createSpy('getTechnicianSuggestion')
      .and.returnValue(of({ suggestedTechnicianId: null, suggestedTechnicianName: null, activeCount: 0 })),
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
    createRevision: jasmine.createSpy('createRevision').and.returnValue(of({ id: 1000 })),
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
    downloadOrderSummaryPdf: jasmine.createSpy('downloadOrderSummaryPdf').and.returnValue(of(void 0)),
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

  const routerStub = {
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
  };

  const inboxServiceStub = {
    ensureThreadByOrder: jasmine.createSpy('ensureThreadByOrder').and.returnValue(of(null)),
    getThreadByOrder: jasmine.createSpy('getThreadByOrder').and.returnValue(of({ id: 91 } as any)),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ thread: null, messages: [] })),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({ ok: true })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of({})),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
  };

  const currentUserServiceStub = {
    value: { id: 99 },
  };

  beforeEach(async () => {
    localStorage.removeItem('techstore:reception:create-service-order-draft:v2:1:99');
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
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: Router, useValue: routerStub },
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

  it('prepara la decisión manual con la versión comercial exacta del equipo', () => {
    component.openClientDecisionModal({
      id: 31,
      serviceOrderAgreementId: 8,
      serviceOrderItemId: 12,
      commercialVersionId: 91,
      serviceOrderItem: { id: 12, code: 'OS-03-08-2026-001-02', brand: 'Acer', model: 'Nitro V' },
      commercialVersion: { id: 91, versionNumber: 4, status: 'ISSUED', totalAmount: 260 },
    } as any);

    expect(component.clientDecisionTarget).toEqual({
      commercialVersionId: 91,
      itemLabel: 'OS-03-08-2026-001-02 · Acer Nitro V',
      versionNumber: 4,
      totalAmount: 260,
    });
  });

  it('prepara la edición de descuentos con todas las líneas de la versión vigente', () => {
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
        status: 'DRAFT',
        totalAmount: 260,
        notes: 'Cotización vigente',
        lines: [{ id: 901, type: 'SERVICE', quantity: 1, unitPrice: 260 }],
      },
    } as any;
    component.selectedServiceOrderAgreementDetail = { id: 8, serviceOrderId: 70 } as any;

    component.openLineDiscountModal(link);

    expect(component.lineDiscountTarget).toEqual(jasmine.objectContaining({
      serviceOrderId: 70,
      serviceOrderItemId: 12,
      baseVersionId: 91,
      versionNumber: 4,
      notes: 'Cotización vigente',
      lines: link.commercialVersion.lines,
    }));
  });

  it('no permite editar descuentos de una versión aceptada', () => {
    expect(component.canEditCommercialDiscounts({ commercialVersion: { status: 'ACCEPTED' } } as any)).toBeFalse();
  });

  it('navega al inbox unificado en vez de abrir el modal legacy', fakeAsync(() => {
    const order = createServiceOrder({ id: 44 });

    component.openReceptionInbox(order);
    tick();

    expect(inboxServiceStub.getThreadByOrder).toHaveBeenCalledWith(44);
    expect(routerStub.navigate).toHaveBeenCalledWith(['/service-order-inbox'], {
      queryParams: { threadId: 91, serviceOrderId: 44 },
    });
  }));

  it('descarga el resumen PDF single usando el endpoint backend y sin recargar el contexto legacy', () => {
    const order = createServiceOrder({ id: 45 });

    component.downloadServiceOrderSummaryPdf(order);

    expect(serviceOrderDocumentsStub.downloadOrderSummaryPdf).toHaveBeenCalledWith(45);
    expect(serviceOrderServiceStub.findOne).not.toHaveBeenCalled();
    expect(agreementServiceStub.findAll).not.toHaveBeenCalled();
  });

  it('usa Perú por defecto en la captura telefónica del wizard', () => {
    expect(component.createServiceOrderForm.get('contactPhoneCountry')?.value).toEqual(DEFAULT_PHONE_COUNTRY);
  });

  it('muestra primero la asignación técnica y después el tipo de atención', () => {
    const steps = component.getCreateServiceOrderSteps();

    expect(steps[0].key).toBe('assignment');
    expect(steps[0].label).toBe('Técnico');
    expect(steps[1].key).toBe('workflow');
    expect(steps[1].label).toBe('Tipo de atención');
  });

  it('conserva el técnico elegido cuando cambia el tipo de atención', () => {
    component.createServiceOrderForm.patchValue({ assignedToTechnicianId: 10 });
    serviceOrderServiceStub.getTechnicianSuggestion.and.returnValue(of({
      suggestedTechnicianId: 20,
      suggestedTechnicianName: 'Técnico sugerido',
      activeCount: 0,
      technicians: [
        { technicianId: 10, technicianName: 'Técnico elegido', activeByType: [] },
        { technicianId: 20, technicianName: 'Técnico sugerido', activeByType: [] },
      ],
    }));

    component.onCreateWorkflowServiceTypeChange();

    expect(component.createServiceOrderForm.get('assignedToTechnicianId')?.value).toBe(10);
  });

  it('recupera el avance del wizard después de cerrarlo', () => {
    component.openCreateServiceOrderModal();
    component.createServiceOrderForm.patchValue({ contactName: 'Cliente recuperado' });
    component.createServiceOrderStep = 3;
    component.createServiceOrderCandidates = [{
      equipmentType: EquipmentType.LAPTOP,
      equipmentTypeOther: null,
      brand: 'Lenovo',
      model: 'ThinkPad',
      serialNumber: 'ABC-123',
      accessories: 'Cargador',
      initialIssue: 'No enciende',
      priority: ServiceOrderPriority.LOW,
      notes: null,
      quoteItems: [],
    }];

    component.closeCreateServiceOrderModal();
    component.openCreateServiceOrderModal();

    expect(component.showCreateServiceOrderModal).toBeTrue();
    expect(component.createServiceOrderStep).toBe(3);
    expect(component.createServiceOrderForm.get('contactName')?.value).toBe('Cliente recuperado');
    expect(component.createServiceOrderCandidates.length).toBe(1);
    expect(component.createServiceOrderCandidates[0].serialNumber).toBe('ABC-123');
  });

  it('elimina el borrador cuando recepción decide descartarlo', () => {
    component.openCreateServiceOrderModal();
    component.createServiceOrderForm.patchValue({ contactName: 'No conservar' });
    component.closeCreateServiceOrderModal();

    component.openCreateServiceOrderModal();
    component.discardCreateServiceOrderDraft();
    component.openCreateServiceOrderModal();

    expect(component.createServiceOrderForm.get('contactName')?.value).toBe('');
    expect(component.createServiceOrderCandidates).toEqual([]);
    expect(component.createServiceOrderStep).toBe(0);
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

  it('abre la entrega dirigida al primer equipo listo aunque la cabecera ya sea parcial', () => {
    const readyOrder = createServiceOrder({
      id: 11,
      operativeStatus: ServiceOrderOperativeStatus.ENTREGA_PARCIAL,
      serviceType: ServiceType.DIAGNOSIS,
      technicalStatus: ServiceOrderTechnicalStatus.RESUELTA,
      economicStatus: ServiceOrderEconomicStatus.PARCIAL,
      items: [
        {
          id: 111,
          code: 'SO-11-01',
          operativeStatus: ServiceOrderOperativeStatus.ENTREGADA,
        },
        {
          id: 112,
          code: 'SO-11-02',
          operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
        },
      ] as any,
    });

    expect(component.canDeliverItem(createServiceOrder())).toBeFalse();
    expect(component.canDeliverItem(readyOrder)).toBeTrue();

    component.deliverItem(readyOrder);

    expect(component.itemDeliveryTarget).toEqual({ order: readyOrder, selectedItemId: 112 });
  });

  it('abre la entrega para un equipo cancelado que todavía no fue devuelto', () => {
    const cancelledOrder = createServiceOrder({
      id: 12,
      operativeStatus: ServiceOrderOperativeStatus.CANCELADA,
      items: [{
        id: 121,
        code: 'SO-12-01',
        operativeStatus: ServiceOrderOperativeStatus.CANCELADA,
        deliveredAt: null,
      }] as any,
    });

    expect(component.canDeliverItem(cancelledOrder)).toBeTrue();

    component.deliverItem(cancelledOrder);

    expect(component.itemDeliveryTarget).toEqual({ order: cancelledOrder, selectedItemId: 121 });
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

  it('envía los datos de contacto al crear una orden agregada', fakeAsync(() => {
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

    component.addCurrentEquipmentToCreateOrder()
    component.submitCreateServiceOrder();
    tick();

    expect(serviceOrderServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        contactName: 'Cliente Test',
        contactPhone: '+51999999999',
        contactEmail: 'cliente@test.com',
        items: [jasmine.objectContaining({
          initialIssue: 'No enciende',
          priority: ServiceOrderPriority.MEDIUM,
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

    component.addCurrentEquipmentToCreateOrder()
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
    expect(serviceOrderServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientContactId: 55,
        contactName: 'Ana Contacto',
      }),
    );
  }));

  it('permite acumular múltiples equipos antes de crear la orden', () => {
    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.DIAGNOSIS,
      equipmentType: EquipmentType.LAPTOP,
      brand: 'Lenovo',
      initialIssue: 'No enciende',
    })

    component.addCurrentEquipmentToCreateOrder()

    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.DIAGNOSIS,
      equipmentType: EquipmentType.PRINTER,
      brand: 'Epson',
      initialIssue: 'Atasco de papel',
    })

    component.addCurrentEquipmentToCreateOrder()

    expect(component.createServiceOrderCandidates.length).toBe(2)
    expect(component.getCreateOrderSummaryItems().map((item) => item.equipmentTypeLabel)).toEqual([
      'Laptop',
      'Impresora',
    ])
  })

  it('crea una sola orden con prioridades y cotizaciones independientes por equipo', fakeAsync(() => {
    serviceOrderServiceStub.create.calls.reset()
    clientsServiceStub.create.and.returnValue(
      of({
        id: 31,
        name: 'Cliente Múltiple',
        kind: ClientKind.PERSON,
        contacts: [],
      } as any),
    )
    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.STANDARD_SERVICE,
      documentNumber: '12345678',
      documentTypeId: 1,
      contactName: 'Cliente Múltiple',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '999999999',
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
      priority: ServiceOrderPriority.LOW,
    })
    component.onCreateWorkflowServiceTypeChange()
    component.createServiceOrderForm.patchValue({ assignedToTechnicianId: 10 })
    component.addCurrentEquipmentToCreateOrder()

    component.createServiceOrderForm.patchValue({
      equipmentType: EquipmentType.PRINTER,
      initialIssue: 'Atasca papel',
      priority: ServiceOrderPriority.HIGH,
    })
    component.addCurrentEquipmentToCreateOrder()
    ;(component as any).prepareCandidateCommercialDrafts()
    component.getCreateOrderAgreementTechnicalServiceItem(0)!.unitPrice = 30
    component.getCreateOrderAgreementTechnicalServiceItem(1)!.unitPrice = 45
    component.createOrderAgreementItemsByItemIndex[1].push({
      id: 999,
      type: 'product',
      productId: 77,
      quantity: 2,
      unitPrice: 12.5,
      requiresPurchase: false,
      notes: '',
    })

    component.submitCreateServiceOrder()
    tick()

    expect(serviceOrderServiceStub.create).toHaveBeenCalledTimes(1)
    expect(serviceOrderServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        serviceType: ServiceType.STANDARD_SERVICE,
        assignedToTechnicianId: 10,
        items: [
          jasmine.objectContaining({
            equipmentType: EquipmentType.LAPTOP,
            priority: ServiceOrderPriority.LOW,
            initialCommercial: jasmine.objectContaining({
              lines: [jasmine.objectContaining({ type: 'SERVICE', unitPrice: 30 })],
            }),
          }),
          jasmine.objectContaining({
            equipmentType: EquipmentType.PRINTER,
            priority: ServiceOrderPriority.HIGH,
            initialCommercial: jasmine.objectContaining({
              lines: [
                jasmine.objectContaining({ type: 'SERVICE', unitPrice: 45 }),
                jasmine.objectContaining({ type: 'PRODUCT', productId: 77, quantity: 2 }),
              ],
            }),
          }),
        ],
      }),
    )
  }))

  it('guarda y recupera un borrador v2 con todos los equipos del wizard', () => {
    component.openCreateServiceOrderModal()
    component.createServiceOrderForm.patchValue({
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
      priority: ServiceOrderPriority.HIGH,
    })
    component.addCurrentEquipmentToCreateOrder()
    component.createServiceOrderStep = 3

    ;(component as any).saveCreateServiceOrderDraft()
    component.createServiceOrderCandidates = []
    component.createServiceOrderStep = 0

    expect((component as any).restoreCreateServiceOrderDraft()).toBeTrue()
    expect(component.createServiceOrderCandidates).toEqual([
      jasmine.objectContaining({
        equipmentType: EquipmentType.LAPTOP,
        priority: ServiceOrderPriority.HIGH,
        initialIssue: 'No enciende',
      }),
    ])
    expect(component.createServiceOrderStep).toBe(3)
  })

  it('descarta de forma segura un borrador con contrato legacy', () => {
    const draftKey = 'techstore:reception:create-service-order-draft:v2:1:99'
    localStorage.setItem(draftKey, JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      step: 3,
      formValue: {},
      candidates: [{ serviceType: ServiceType.DIAGNOSIS }],
      editingCandidateIndex: null,
      agreementItemsByItemIndex: {},
    }))

    expect((component as any).restoreCreateServiceOrderDraft()).toBeFalse()
    expect(localStorage.getItem(draftKey)).toBeNull()
  })

  it('permite guardar el primer equipo aunque accesorios quede vacío', () => {
    component.createServiceOrderStep = 3
    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.DIAGNOSIS,
      equipmentType: EquipmentType.LAPTOP,
      brand: 'Lenovo',
      initialIssue: 'No enciende',
      accessories: '',
    })

    component.beginAnotherCreateServiceOrderCandidate()

    expect(component.createServiceOrderCandidates.length).toBe(1)
    expect(component.createServiceOrderCandidates[0].accessories).toBeNull()
  })

  it('guarda y expone la nota por equipo en el resumen de la orden', () => {
    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.DIAGNOSIS,
      equipmentType: EquipmentType.LAPTOP,
      brand: 'Dell',
      initialIssue: 'Pantalla negra',
      notes: 'Equipo con golpe lateral',
    })

    component.addCurrentEquipmentToCreateOrder()

    expect(component.createServiceOrderCandidates[0].notes).toBe('Equipo con golpe lateral')
    expect(component.getCreateOrderSummaryItems()[0].notes).toBe('Equipo con golpe lateral')
  })

  it('reabre la nota por equipo al editar un candidato guardado', () => {
    component.createServiceOrderCandidates = [
      {
        equipmentType: EquipmentType.LAPTOP,
        equipmentTypeOther: null,
        brand: 'HP',
        model: null,
        serialNumber: null,
        accessories: null,
        initialIssue: 'No enciende',
        serviceType: ServiceType.DIAGNOSIS,
        notes: 'Revisar bisagras',
        quoteItems: [],
      } as any,
    ]

    component.editCreateServiceOrderCandidate(0)

    expect(component.createServiceOrderForm.get('notes')?.value).toBe('Revisar bisagras')
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

  it('bloquea avanzar desde Equipos si no hay equipos guardados aunque el draft esté limpio', () => {
    const showMessageSpy = spyOn<any>(component, 'showMessage')
    component.createServiceOrderStep = 3
    component.createServiceOrderCandidates = []

    component.nextCreateServiceOrderStep()

    expect(component.createServiceOrderStep).toBe(3)
    expect(showMessageSpy).toHaveBeenCalledWith(
      'warning',
      'fas fa-exclamation-circle',
      'Debes guardar al menos un equipo antes de continuar.',
    )
  })

  it('permite avanzar desde Equipos cuando hay al menos un equipo guardado y el draft está limpio', () => {
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

    component.nextCreateServiceOrderStep()

    expect(component.createServiceOrderStep).toBe(4)
  })

  it('bloquea avanzar desde Equipos si hay draft pendiente aunque ya exista un equipo guardado', () => {
    const showMessageSpy = spyOn<any>(component, 'showMessage')
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
    component.createServiceOrderForm.patchValue({
      brand: 'Dell',
    })

    component.nextCreateServiceOrderStep()

    expect(component.createServiceOrderStep).toBe(3)
    expect(showMessageSpy).toHaveBeenCalledWith(
      'warning',
      'fas fa-exclamation-circle',
      'Tienes un equipo en edición o sin guardar. Guárdalo o limpia el formulario antes de continuar.',
    )
  })

  it('bloquea avanzar desde Equipos si está editando un equipo existente', () => {
    const showMessageSpy = spyOn<any>(component, 'showMessage')
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
    component.editCreateServiceOrderCandidate(0)

    component.nextCreateServiceOrderStep()

    expect(component.createServiceOrderStep).toBe(3)
    expect(showMessageSpy).toHaveBeenCalledWith(
      'warning',
      'fas fa-exclamation-circle',
      'Tienes un equipo en edición o sin guardar. Guárdalo o limpia el formulario antes de continuar.',
    )
  })

  it('bloquea avanzar desde Equipos si el draft quedó en OTHER sin completar', () => {
    const showMessageSpy = spyOn<any>(component, 'showMessage')
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
    component.createServiceOrderForm.patchValue({
      equipmentType: EquipmentType.OTHER,
      equipmentTypeOther: '',
    })

    component.nextCreateServiceOrderStep()

    expect(component.createServiceOrderStep).toBe(3)
    expect(showMessageSpy).toHaveBeenCalledWith(
      'warning',
      'fas fa-exclamation-circle',
      'Tienes un equipo en edición o sin guardar. Guárdalo o limpia el formulario antes de continuar.',
    )
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

  it('muestra los contactos seleccionables cuando la empresa encontrada viene de búsqueda remota', fakeAsync(() => {
    component.clients = [];

    const remoteCompany = {
      id: 77,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Cliente Empresa',
      tradeName: 'CE',
      documentTypeId: 2,
      documentNumber: '12345678901',
      contacts: [
        { id: 91, clientId: 77, name: 'Secundario', isPrimary: false, phone: '+51900000001' },
        { id: 92, clientId: 77, name: 'Principal', isPrimary: true, phone: '+51900000002' },
      ],
    } as any;

    (component as any).applyPartnerData(remoteCompany);
    tick();

    expect(component.shouldShowCompanyContactSelector()).toBeTrue();
    expect(component.getClientContactOptions().map((contact) => Number(contact.id))).toEqual([91, 92]);
    expect(component.createServiceOrderForm.get('clientContactId')?.value).toBe('92');
  }));

  it('permite usar un contacto existente alternativo de la empresa en la orden', fakeAsync(() => {
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
          { id: 91, clientId: 77, name: 'Secundario', isPrimary: false, phone: '+51900000001', email: 'sec@empresa.com' },
          { id: 92, clientId: 77, name: 'Principal', isPrimary: true, phone: '+51900000002', email: 'pri@empresa.com' },
        ],
      } as any,
    ];

    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: 77,
      clientKind: ClientKind.COMPANY,
      documentTypeId: 2,
      documentNumber: '12345678901',
      companyName: 'Cliente Empresa',
      companyTradeName: 'CE',
      clientContactId: '91',
      contactName: 'Principal',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '900000002',
      contactEmail: 'pri@empresa.com',
      priority: ServiceOrderPriority.MEDIUM,
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
    });

    component.onClientContactSelectionChange();
    component.addCurrentEquipmentToCreateOrder();
    component.submitCreateServiceOrder();
    tick();

    expect(serviceOrderServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientId: 77,
        clientContactId: 91,
        contactName: 'Secundario',
        contactPhone: '+51900000001',
        contactEmail: 'sec@empresa.com',
      }),
    );
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

  it('persiste un contacto inline para una empresa existente sin contactos antes de crear la orden', fakeAsync(() => {
    clientsServiceStub.update.and.returnValue(
      of({
        id: 88,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        tradeName: 'Empresa',
        documentTypeId: 2,
        documentNumber: '12345678901',
        contacts: [
          { id: 201, clientId: 88, name: 'Nuevo Contacto', email: 'nuevo@empresa.com', phone: '+51987654321', isPrimary: true },
        ],
      } as any),
    );

    component.clients = [
      {
        id: 88,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        tradeName: 'Empresa',
        documentTypeId: 2,
        documentNumber: '12345678901',
        contacts: [],
      } as any,
    ];

    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: 88,
      clientKind: ClientKind.COMPANY,
      documentTypeId: 2,
      documentNumber: '12345678901',
      companyName: 'Empresa SAC',
      companyTradeName: 'Empresa',
      clientContactId: null,
      contactName: 'Nuevo Contacto',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '987654321',
      contactEmail: 'nuevo@empresa.com',
      priority: ServiceOrderPriority.MEDIUM,
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
    });

    component.addCurrentEquipmentToCreateOrder();
    component.submitCreateServiceOrder();
    tick();

    expect(clientsServiceStub.update).toHaveBeenCalledWith(
      88,
      jasmine.objectContaining({
        contacts: [
          jasmine.objectContaining({
            name: 'Nuevo Contacto',
            email: 'nuevo@empresa.com',
            phone: '+51987654321',
          }),
        ],
      }),
    );
    expect(serviceOrderServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientId: 88,
        clientContactId: 201,
        contactName: 'Nuevo Contacto',
        contactPhone: '+51987654321',
      }),
    );
  }));

  it('bloquea la orden de empresa si el contacto inline está incompleto', fakeAsync(() => {
    const showMessageSpy = spyOn<any>(component, 'showMessage');
    clientsServiceStub.update.calls.reset();
    serviceOrderServiceStub.create.calls.reset();

    component.clients = [
      {
        id: 95,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa Incompleta SAC',
        tradeName: 'Empresa Incompleta',
        documentTypeId: 2,
        documentNumber: '12312312312',
        contacts: [],
      } as any,
    ];

    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: 95,
      clientKind: ClientKind.COMPANY,
      documentTypeId: 2,
      documentNumber: '12312312312',
      companyName: 'Empresa Incompleta SAC',
      companyTradeName: 'Empresa Incompleta',
      clientContactId: null,
      contactName: '',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '',
      contactEmail: 'contacto@empresa.com',
      priority: ServiceOrderPriority.MEDIUM,
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
    });

    component.addCurrentEquipmentToCreateOrder();
    component.submitCreateServiceOrder();
    tick();

    expect(clientsServiceStub.update).not.toHaveBeenCalled();
    expect(serviceOrderServiceStub.create).not.toHaveBeenCalled();
    expect(component.createServiceOrderForm.get('contactName')?.invalid).toBeTrue();
    expect(component.createServiceOrderForm.get('contactPhone')?.invalid).toBeTrue();
    expect(showMessageSpy).not.toHaveBeenCalled();
  }));

  it('agrega un nuevo contacto inline sin perder los contactos existentes de la empresa', fakeAsync(() => {
    clientsServiceStub.update.and.returnValue(
      of({
        id: 90,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa Dos SAC',
        tradeName: 'Empresa Dos',
        documentTypeId: 2,
        documentNumber: '10987654321',
        contacts: [
          { id: 301, clientId: 90, name: 'Principal', email: 'principal@empresa.com', phone: '+51900111222', isPrimary: true },
          { id: 302, clientId: 90, name: 'Secundario', email: 'sec@empresa.com', phone: '+51900333444', isPrimary: false },
          { id: 303, clientId: 90, name: 'Contacto Nuevo', email: 'nuevo2@empresa.com', phone: '+51999888777', isPrimary: false },
        ],
      } as any),
    );

    component.clients = [
      {
        id: 90,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa Dos SAC',
        tradeName: 'Empresa Dos',
        documentTypeId: 2,
        documentNumber: '10987654321',
        contacts: [
          { id: 301, clientId: 90, name: 'Principal', email: 'principal@empresa.com', phone: '+51900111222', isPrimary: true },
          { id: 302, clientId: 90, name: 'Secundario', email: 'sec@empresa.com', phone: '+51900333444', isPrimary: false },
        ],
      } as any,
    ];

    component.createServiceOrderForm.patchValue({
      requestOrigin: RequestOrigin.CLIENT,
      workflowServiceType: ServiceType.DIAGNOSIS,
      clientId: 90,
      clientKind: ClientKind.COMPANY,
      documentTypeId: 2,
      documentNumber: '10987654321',
      companyName: 'Empresa Dos SAC',
      companyTradeName: 'Empresa Dos',
      clientContactId: null,
      contactName: 'Contacto Nuevo',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '999888777',
      contactEmail: 'nuevo2@empresa.com',
      priority: ServiceOrderPriority.MEDIUM,
      assignedToTechnicianId: 10,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'Pantalla negra',
    });

    component.addCurrentEquipmentToCreateOrder();
    component.submitCreateServiceOrder();
    tick();

    expect(clientsServiceStub.update).toHaveBeenCalledWith(
      90,
      jasmine.objectContaining({
        contacts: [
          jasmine.objectContaining({ id: 301, name: 'Principal' }),
          jasmine.objectContaining({ id: 302, name: 'Secundario' }),
          jasmine.objectContaining({ name: 'Contacto Nuevo', phone: '+51999888777' }),
        ],
      }),
    );
    expect(serviceOrderServiceStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientId: 90,
        clientContactId: 303,
        contactName: 'Contacto Nuevo',
      }),
    );
  }));

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

  it('inicializa el acuerdo inicial estándar del wizard con la línea fija de servicio técnico', () => {
    component.openCreateServiceOrderModal();
    component.createServiceOrderForm.patchValue({ workflowServiceType: ServiceType.STANDARD_SERVICE });

    component.onCreateWorkflowServiceTypeChange();

    expect(component.getCreateOrderAgreementItems(0)).toEqual([
      jasmine.objectContaining({
        type: 'service',
        serviceId: 1,
        unitPrice: 20,
      }),
    ]);
  });

  it('no permite eliminar la línea fija de servicio técnico del acuerdo inicial estándar', () => {
    component.openCreateServiceOrderModal();
    component.createServiceOrderForm.patchValue({ workflowServiceType: ServiceType.STANDARD_SERVICE });
    component.onCreateWorkflowServiceTypeChange();

    component.removeCreateOrderItemAgreement(0, 0);

    expect(component.getCreateOrderAgreementItems(0).length).toBe(1);
    expect(component.getCreateOrderAgreementItems(0)[0]).toEqual(
      jasmine.objectContaining({
        type: 'service',
        serviceId: 1,
      }),
    );
  });

  it('renderiza el acuerdo inicial estándar sin CTA ni selector de servicios genéricos', () => {
    component.openCreateServiceOrderModal();
    component.createServiceOrderForm.patchValue({
      workflowServiceType: ServiceType.STANDARD_SERVICE,
      equipmentType: EquipmentType.LAPTOP,
      initialIssue: 'No enciende',
    });
    component.onCreateWorkflowServiceTypeChange();
    component.addCurrentEquipmentToCreateOrder();
    (component as any).prepareCandidateCommercialDrafts();
    component.createServiceOrderStep = component.getCreateServiceOrderSteps().findIndex(
      (step) => step.key === 'initialQuote',
    );

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const initialAgreementSection = compiled.querySelector('.initial-agreement-section') as HTMLElement;
    const sectionText = initialAgreementSection?.textContent ?? '';

    expect(sectionText).toContain('La línea fija de servicio técnico ya está incluida.');
    expect(sectionText).toContain('Agregar producto');
    expect(sectionText).not.toContain('Agregar servicio');
    expect(sectionText).toContain('Servicio técnico');
    expect(initialAgreementSection.querySelectorAll('ng-select').length).toBe(0);
  });
  it('selecciona varios equipos desde el modal y prepara una sola cancelación', () => {
    const order = createServiceOrder({
      id: 70,
      code: 'OS-03-08-2026-001',
      items: [702, 703].map((id) => ({
        id,
        code: `OS-03-08-2026-001-${id}`,
        operativeStatus: ServiceOrderOperativeStatus.EN_PROCESO,
        cancellationRequests: [],
      } as any)),
    });

    component.equipmentDetailOrder = order;
    component.selectAllCancellableEquipment();
    component.openSelectedEquipmentCancellation();

    expect(component.itemCancellationTarget).toEqual(jasmine.objectContaining({
      mode: 'REQUEST',
      serviceOrderId: 70,
      selectedItemIds: [702, 703],
      selectionLocked: true,
    }));
  });

  it('retira las columnas de prioridad y equipo y muestra los equipos en un modal', () => {
    const order = createServiceOrder({
      id: 81,
      code: 'SO-15-08-2026-0001',
      items: [{
        id: 811,
        serviceOrderId: 81,
        position: 1,
        code: 'SO-15-08-2026-0001-01',
        equipmentType: EquipmentType.LAPTOP,
        equipmentTypeOther: null,
        brand: 'Lenovo',
        model: 'ThinkPad',
        serialNumber: 'SN-811',
        accessories: 'Cargador',
        initialIssue: 'No enciende',
        notes: null,
        priority: ServiceOrderPriority.HIGH,
        operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
        technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA,
        commercialStatus: ServiceOrderCommercialStatus.NO_REQUIERE,
      } as any],
    });
    serviceOrderServiceStub.findOne.and.returnValue(of(order));

    fixture.detectChanges();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('table th')).map(
      (cell: Element) => cell.textContent?.trim(),
    );
    expect(headers).not.toContain('Prioridad');
    expect(headers).not.toContain('Equipo');
    expect(headers).not.toContain('Avance');

    component.openEquipmentDetails(order);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.equipment-detail-modal') as HTMLElement;
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('SO-15-08-2026-0001-01');
    expect(modal.textContent).toContain('Prioridad alta');
    expect(modal.textContent).toContain('SN-811');
    serviceOrderServiceStub.findOne.calls.reset();
    serviceOrderServiceStub.findOne.and.returnValue(of(createServiceOrder()));
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











