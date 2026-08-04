import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject } from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ServiceOrderDiagnosisService } from '../../services/service-orders/service-order-diagnosis.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { ServiceOrderInboxPage } from './service-order-inbox';

describe('ServiceOrderInboxPage', () => {
  let component: ServiceOrderInboxPage;
  let fixture: ComponentFixture<ServiceOrderInboxPage>;
  const openWindowDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const closedWindowDate = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
  let inboxChanges: Subject<void>;

  const thread = {
    id: 7,
    clientAlias: 'Cliente Demo',
    equipmentLabel: 'Laptop',
    assignedTechnicianAlias: 'Tech',
    serviceOrderId: 11,
    serviceOrderCode: 'SO-11',
    unreadCount: 0,
    clientPhone: '+51999999999',
    operativeStatus: null,
    technicalStatus: null,
    commercialStatus: null,
    economicStatus: null,
    lastMessageText: 'hola',
    lastMessageAt: openWindowDate,
    lastMessageDirection: 'INBOUND',
    lastMessageAuthorRole: 'CLIENT',
    lastCustomerMessageAt: openWindowDate,
    contextToken: 'ctx',
    serviceOrderIds: [11],
    activeServiceOrderIds: [11],
    serviceOrderCodes: ['SO-11'],
    orders: [],
  } as any;

  const inboxServiceStub = {
    listThreads: jasmine.createSpy('listThreads').and.returnValue(of({ data: [thread] as any[], total: 1, page: 1, limit: 50 })),
    getThreadByOrder: jasmine.createSpy('getThreadByOrder').and.returnValue(of(thread)),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ thread, messages: [] } as any)),
    getThreadOrders: jasmine.createSpy('getThreadOrders').and.returnValue(of([{ id: 11, code: 'SO-11', equipmentLabel: 'Laptop', operativeStatus: null, technicalStatus: null, commercialStatus: null, economicStatus: null, assignedTechnicianId: 3, assignedTechnicianAlias: 'Tech', isActive: true }])),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({ ok: true })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of({ id: 99, serviceOrderIds: [11] } as any)),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
    watchChanges: jasmine.createSpy('watchChanges'),
  };

  const currentUserServiceStub = {
    value: null as any,
  };
  const serviceOrderServiceStub = {
    findOne: jasmine.createSpy('findOne').and.returnValue(of({
      id: 11,
      code: 'SO-11',
      serviceType: 'STANDARD_SERVICE',
      equipmentType: 'LAPTOP',
      technicalStatus: 'ASIGNADA',
      initialIssue: 'No enciende',
    } as any)),
  };
  const diagnosisServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
  };
  const agreementServiceStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
  };

  beforeEach(async () => {
    inboxChanges = new Subject<void>();
    inboxServiceStub.watchChanges.calls.reset();
    inboxServiceStub.watchChanges.and.returnValue(inboxChanges.asObservable());
    currentUserServiceStub.value = null;
    inboxServiceStub.listThreads.calls.reset();
    inboxServiceStub.listThreads.and.returnValue(of({ data: [thread] as any[], total: 1, page: 1, limit: 50 }));
    inboxServiceStub.getThreadByOrder.calls.reset();
    inboxServiceStub.getThreadByOrder.and.returnValue(of(thread));
    inboxServiceStub.getMessages.calls.reset();
    inboxServiceStub.getMessages.and.returnValue(of({ thread, messages: [] } as any));
    inboxServiceStub.getThreadOrders.calls.reset();
    inboxServiceStub.getThreadOrders.and.returnValue(of([{ id: 11, code: 'SO-11', equipmentLabel: 'Laptop', operativeStatus: null, technicalStatus: null, commercialStatus: null, economicStatus: null, assignedTechnicianId: 3, assignedTechnicianAlias: 'Tech', isActive: true }]));
    inboxServiceStub.markRead.calls.reset();
    inboxServiceStub.markRead.and.returnValue(of({ ok: true }));
    inboxServiceStub.sendMessage.calls.reset();
    inboxServiceStub.sendMessage.and.returnValue(of({ id: 99, serviceOrderIds: [11] } as any));
    inboxServiceStub.downloadAttachmentBlob.calls.reset();
    inboxServiceStub.downloadAttachmentBlob.and.returnValue(of(new Blob()));

    await TestBed.configureTestingModule({
      declarations: [ServiceOrderInboxPage],
      imports: [CommonModule, FormsModule, RouterTestingModule],
      providers: [
        { provide: ServiceOrderInboxService, useValue: inboxServiceStub },
        { provide: ServiceOrderService, useValue: serviceOrderServiceStub },
        { provide: ServiceOrderDiagnosisService, useValue: diagnosisServiceStub },
        { provide: ServiceOrderAgreementService, useValue: agreementServiceStub },
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ serviceOrderId: '11' }) } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceOrderInboxPage);
    component = fixture.componentInstance;
  });

  it('loads the unified thread context from a service order query param', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(inboxServiceStub.getThreadByOrder).toHaveBeenCalledWith(11);
    expect(inboxServiceStub.getMessages).toHaveBeenCalledWith(7);
    expect(inboxServiceStub.getThreadOrders).toHaveBeenCalledWith(7);
  }));

  it('refreshes inbox data when a realtime invalidation arrives', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    inboxServiceStub.getMessages.calls.reset();

    inboxChanges.next();
    tick(251);

    expect(inboxServiceStub.getMessages).toHaveBeenCalledWith(7);
    expect(inboxServiceStub.listThreads).toHaveBeenCalled();
  }));

  it('quita inmediatamente el indicador de no leído al abrir el hilo', () => {
    const unreadThread = { ...thread, unreadCount: 4 } as any;
    component.threads = [unreadThread];

    component.selectThread(unreadThread, false);

    expect(component.selectedThread?.unreadCount).toBe(0);
    expect(component.threads[0].unreadCount).toBe(0);
    expect(inboxServiceStub.markRead).toHaveBeenCalledWith(7);
  });

  it('distingue el contador de mensajes sin leer de las órdenes vinculadas', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.threads = [{ ...thread, unreadCount: 4, serviceOrderIds: [11, 12] } as any];
    component.selectedThread = null;

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.unread-count')?.textContent?.trim()).toBe('4');
    expect(compiled.querySelector('.unread-count')?.getAttribute('aria-label')).toBe('4 mensajes sin leer');
    expect(compiled.querySelector('.order-count')?.textContent?.trim()).toContain('2');
    expect(compiled.querySelector('.order-count')?.getAttribute('aria-label')).toBe('2 órdenes vinculadas');
  }));

  it('no repone el contador del hilo abierto durante una recarga en tiempo real', fakeAsync(() => {
    const unreadThread = { ...thread, unreadCount: 3 } as any;
    component.selectedThread = { ...unreadThread, unreadCount: 0 };
    component.threads = [{ ...unreadThread, unreadCount: 0 }];
    inboxServiceStub.listThreads.and.returnValue(of({
      data: [unreadThread],
      total: 1,
      page: 1,
      limit: 100,
    }));
    inboxServiceStub.getMessages.and.returnValue(of({ thread: unreadThread, messages: [] } as any));

    fixture.detectChanges();
    tick();
    inboxChanges.next();
    tick(251);

    expect(component.threads[0].unreadCount).toBe(0);
    expect(component.selectedThread?.unreadCount).toBe(0);
  }));

  it('sends messages without asking the operator to associate orders', () => {
    component.selectedThread = { ...thread, id: 7 } as any;
    component.draftMessage = 'Hola';

    component.sendMessage();

    expect(inboxServiceStub.sendMessage).toHaveBeenCalledWith(7, 'Hola', []);
  });

  it('bloquea el envío manual cuando la ventana de 24h está cerrada', () => {
    component.selectedThread = { ...thread, id: 7, lastCustomerMessageAt: closedWindowDate } as any;
    component.draftMessage = 'Hola';

    component.sendMessage();

    expect(inboxServiceStub.sendMessage).not.toHaveBeenCalled();
    expect(component.messageError).toBe('La ventana de 24h está cerrada. No se puede enviar texto libre.');
  });

  it('muestra el aviso cuando la ventana de 24h está cerrada', fakeAsync(() => {
    const closedThread = { ...thread, lastCustomerMessageAt: closedWindowDate } as any;
    inboxServiceStub.getThreadByOrder.and.returnValue(of(closedThread));
    inboxServiceStub.listThreads.and.returnValue(of({ data: [closedThread] as any[], total: 1, page: 1, limit: 50 }));
    inboxServiceStub.getMessages.and.returnValue(of({ thread: closedThread, messages: [] } as any));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('La ventana de 24h está cerrada. No se puede enviar texto libre.');
    expect((compiled.querySelector('.composer textarea') as HTMLTextAreaElement | null)?.disabled).toBe(true);
  }));

  it('oculta el teléfono cuando el visor es técnico', fakeAsync(() => {
    currentUserServiceStub.value = {
      id: 77,
      roles: [{ id: 1, name: 'technician', permissions: [] }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('+51999999999');
    expect(compiled.textContent).not.toContain('Teléfono');
    expect((compiled.querySelector('.search-box input') as HTMLInputElement | null)?.placeholder).toBe(
      'Buscar cliente, código o equipo...',
    );
  }));

  it('oculta el teléfono cuando el visor es recepcionista', fakeAsync(() => {
    currentUserServiceStub.value = {
      id: 78,
      roles: [{ id: 2, name: 'recepcionista', permissions: [] }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('+51999999999');
    expect((compiled.querySelector('.search-box input') as HTMLInputElement | null)?.placeholder).toBe(
      'Buscar cliente, código o equipo...',
    );
  }));

  it('muestra el teléfono únicamente al supervisor o administrador', fakeAsync(() => {
    currentUserServiceStub.value = {
      id: 1,
      roles: [{ id: 1, name: 'admin', permissions: [] }],
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('+51999999999');
  }));

  it('abre los detalles de la orden en un modal con datos generales', fakeAsync(() => {
    component.openOrderDetail({ id: 11 } as any);
    tick();
    fixture.detectChanges();

    expect(serviceOrderServiceStub.findOne).toHaveBeenCalledWith(11);
    expect(diagnosisServiceStub.findAll).toHaveBeenCalledWith({ serviceOrderId: 11, page: 1, limit: 100 });
    expect(agreementServiceStub.findAll).toHaveBeenCalledWith({ serviceOrderId: 11, page: 1, limit: 100 });
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Detalles generales');
  }));

  it('explica que una orden estándar no requiere diagnóstico', () => {
    component.selectedOrderDetail = { serviceType: 'STANDARD_SERVICE' } as any;
    expect(component.orderHasDiagnosisFlow).toBeFalse();
  });

  it('traduce al español los estados y resultados técnicos del modal', () => {
    expect(component.formatStatus('CURRENT')).toBe('Vigente');
    expect(component.formatStatus('REPAIRABLE')).toBe('Reparable');
    expect(component.formatStatus('NO_PARTS_AVAILABLE')).toBe('Sin repuestos disponibles');
    expect(component.formatStatus('AUTORIZADA_PARA_EJECUCION')).toBe('Autorizada para ejecución');
  });

  it('oculta resultado y acción recomendada en el diagnóstico', () => {
    component.isOrderDetailOpen = true;
    component.selectedOrderDetail = { serviceType: 'DIAGNOSIS' } as any;
    component.orderDetailTab = 'diagnosis';
    component.selectedOrderDiagnoses = [{
      sequenceNumber: 1,
      status: 'CURRENT',
      summary: 'Fuente dañada',
      details: 'Se verificó pérdida de voltaje.',
      outcome: 'REPAIRABLE',
      recommendedAction: 'Cambiar fuente',
    } as any];
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Resultado');
    expect(text).not.toContain('Acción recomendada');
    expect(text).toContain('Fuente dañada');
  });

  it('muestra los servicios y productos incluidos en el acuerdo comercial', () => {
    component.isOrderDetailOpen = true;
    component.selectedOrderDetail = { serviceType: 'DIAGNOSIS' } as any;
    component.orderDetailTab = 'agreement';
    component.selectedOrderAgreements = [{
      sequenceNumber: 1,
      status: 'CONFIRMED',
      totalAmount: 250,
      currency: 'PEN',
      notes: 'Incluye instalación.',
      agreedAt: new Date('2026-07-24T10:00:00'),
      clientNotes: 'Cliente conforme.',
      serviceItems: [{
        serviceNameSnapshot: 'Mantenimiento preventivo',
        serviceDescriptionSnapshot: 'Limpieza interna',
        estimatedHours: 2,
        lineTotal: 100,
      }],
      productItems: [{
        productNameSnapshot: 'Fuente de poder',
        productDescriptionSnapshot: '500 W',
        quantity: 1,
        unitPrice: 150,
        lineTotal: 150,
      }],
    } as any];
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Mantenimiento preventivo');
    expect(text).toContain('Fuente de poder');
    expect(text).toContain('Notas comerciales');
    expect(text).toContain('Cliente conforme.');
  });

  it('no usa el teléfono como criterio de búsqueda para técnico', () => {
    currentUserServiceStub.value = {
      id: 77,
      roles: [{ id: 1, name: 'technician', permissions: [] }],
    };
    component.threads = [thread];
    component.searchTerm = '+51999999999';

    expect(component.filteredThreads.length).toBe(0);
  });
});
