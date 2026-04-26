import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ServiceOrderOperativeStatus } from '../../models/service-orders/service-order';
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
});
