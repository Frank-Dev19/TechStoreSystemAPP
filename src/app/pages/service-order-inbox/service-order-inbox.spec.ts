import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { ServiceOrderInboxService } from '../../services/service-orders/service-order-inbox.service';
import { ServiceOrderInboxPage } from './service-order-inbox';

describe('ServiceOrderInboxPage', () => {
  let component: ServiceOrderInboxPage;
  let fixture: ComponentFixture<ServiceOrderInboxPage>;
  const openWindowDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const closedWindowDate = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

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
    replaceMessageOrders: jasmine.createSpy('replaceMessageOrders').and.returnValue(of({ id: 55, serviceOrderIds: [11] } as any)),
    downloadAttachmentBlob: jasmine.createSpy('downloadAttachmentBlob').and.returnValue(of(new Blob())),
  };

  const currentUserServiceStub = {
    value: null as any,
  };

  beforeEach(async () => {
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
    inboxServiceStub.replaceMessageOrders.calls.reset();
    inboxServiceStub.replaceMessageOrders.and.returnValue(of({ id: 55, serviceOrderIds: [11] } as any));
    inboxServiceStub.downloadAttachmentBlob.calls.reset();
    inboxServiceStub.downloadAttachmentBlob.and.returnValue(of(new Blob()));

    await TestBed.configureTestingModule({
      declarations: [ServiceOrderInboxPage],
      imports: [CommonModule, FormsModule, NgSelectModule, RouterTestingModule],
      providers: [
        { provide: ServiceOrderInboxService, useValue: inboxServiceStub },
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

  it('sends the selected service order ids with the outbound message', () => {
    component.selectedThread = { ...thread, id: 7 } as any;
    component.selectedComposerOrderIds = [11];
    component.draftMessage = 'Hola';

    component.sendMessage();

    expect(inboxServiceStub.sendMessage).toHaveBeenCalledWith(7, 'Hola', [], [11]);
  });

  it('replaces the message order links and refreshes local chips', () => {
    const message = { id: 55, serviceOrderIds: [] } as any;
    component.messages = [message];

    component.replaceMessageOrders(message, [11]);

    expect(inboxServiceStub.replaceMessageOrders).toHaveBeenCalledWith(55, [11]);
    expect(component.messages[0].serviceOrderIds).toEqual([11]);
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
