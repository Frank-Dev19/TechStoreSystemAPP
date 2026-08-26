import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { DocumentType, PaymentMethod } from '../../models/sales/enums';
import { ServiceOrderEconomicStatus, ServiceOrderOperativeStatus, ServiceOrderTechnicalStatus, ServiceType } from '../../models/service-orders/service-order';
import { ClientsApiService } from '../../services/clients-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { ServiceOrderSaleModalComponent } from './service-order-sale-modal';

describe('ServiceOrderSaleModalComponent', () => {
  let fixture: ComponentFixture<ServiceOrderSaleModalComponent>;
  let component: ServiceOrderSaleModalComponent;

  const taxpayer = {
    id: 41,
    companyId: 1,
    name: 'Sergio Avila',
    documentTypeId: 2,
    documentNumber: '74118118',
  };
  const clientsApi = {
    findOne: jasmine.createSpy('findOne').and.returnValue(of(taxpayer)),
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [taxpayer], total: 1, page: 1, limit: 1 })),
    create: jasmine.createSpy('create').and.returnValue(of(taxpayer)),
  };
  const documentTypesApi = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({
      data: [
        { id: 1, name: 'RUC', digits: 11, sunatCode: '6', kind: 'COMPANY' },
        { id: 2, name: 'DNI', digits: 8, sunatCode: '1', kind: 'PERSON' },
      ],
    })),
  };
  const salesApi = {
    createFromServiceAgreements: jasmine.createSpy('createFromServiceAgreements').and.returnValue(of({ id: 99 })),
  };

  beforeEach(async () => {
    clientsApi.findOne.and.returnValue(of(taxpayer));
    clientsApi.findAll.and.returnValue(of({ data: [taxpayer], total: 1, page: 1, limit: 1 }));
    salesApi.createFromServiceAgreements.calls.reset();
    salesApi.createFromServiceAgreements.and.returnValue(of({ id: 99 }));

    await TestBed.configureTestingModule({
      declarations: [ServiceOrderSaleModalComponent],
      imports: [FormsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: DocumentTypesApiService, useValue: documentTypesApi },
        { provide: SalesApiService, useValue: salesApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceOrderSaleModalComponent);
    component = fixture.componentInstance;
    component.order = createOrder();
    component.ngOnInit();
  });

  it('preselecciona al cliente operativo y factura exclusivamente la orden recibida', () => {
    const createdSpy = spyOn(component.saleCreated, 'emit');
    component.documentType = DocumentType.BOLETA;
    component.paymentMethod = PaymentMethod.CASH;

    component.confirmSale();

    expect(salesApi.createFromServiceAgreements).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      serviceOrderIds: [17],
      taxpayerCustomerId: 41,
      documentType: DocumentType.BOLETA,
      payments: [jasmine.objectContaining({ method: PaymentMethod.CASH, amount: 82 })],
    }));
    expect(createdSpy).toHaveBeenCalled();
  });

  it('bloquea una factura cuando el contribuyente no tiene RUC', () => {
    component.documentType = DocumentType.FACTURA;

    component.confirmSale();

    expect(salesApi.createFromServiceAgreements).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Una factura requiere un contribuyente con RUC.');
  });

  it('conserva el modal abierto y muestra el detalle cuando falta stock', () => {
    salesApi.createFromServiceAgreements.and.returnValue(throwError(() => ({
      error: { message: 'Stock insuficiente para G502. Disponible: 0, solicitado: 1' },
    })));

    component.confirmSale();

    expect(component.errorMessage).toContain('Stock insuficiente para G502');
    expect(component.isSubmitting).toBeFalse();
  });

  function createOrder() {
    return {
      id: 17,
      code: 'SO-25-08-2026-0001',
      clientId: 41,
      clientSnapshotName: 'Sergio Avila',
      serviceType: ServiceType.DIAGNOSIS,
      operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
      technicalStatus: ServiceOrderTechnicalStatus.RESUELTA,
      economicStatus: ServiceOrderEconomicStatus.PENDIENTE,
      montoComprometidoVigente: 82,
      items: [{ id: 171 }, { id: 172 }],
    } as any;
  }
});
