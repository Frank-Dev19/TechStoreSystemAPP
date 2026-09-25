import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';

import { DocumentType, PaymentMethod } from '../../models/sales/enums';
import { ServiceOrderEconomicStatus, ServiceOrderOperativeStatus, ServiceOrderTechnicalStatus, ServiceType } from '../../models/service-orders/service-order';
import { ClientsApiService } from '../../services/clients-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
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
  const agreementApi = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({
      data: [createAgreement(82)],
      total: 1,
      page: 1,
      limit: 20,
    })),
  };

  beforeEach(async () => {
    clientsApi.findOne.and.returnValue(of(taxpayer));
    clientsApi.findAll.and.returnValue(of({ data: [taxpayer], total: 1, page: 1, limit: 1 }));
    salesApi.createFromServiceAgreements.calls.reset();
    salesApi.createFromServiceAgreements.and.returnValue(of({ id: 99 }));
    agreementApi.findAll.calls.reset();
    agreementApi.findAll.and.returnValue(of({ data: [createAgreement(82)], total: 1, page: 1, limit: 20 }));

    await TestBed.configureTestingModule({
      declarations: [ServiceOrderSaleModalComponent],
      imports: [FormsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: DocumentTypesApiService, useValue: documentTypesApi },
        { provide: SalesApiService, useValue: salesApi },
        { provide: ServiceOrderAgreementService, useValue: agreementApi },
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

  it('ignora una segunda confirmación mientras la misma venta sigue en proceso', () => {
    const pendingResponse = new Subject<any>();
    salesApi.createFromServiceAgreements.and.returnValue(pendingResponse);

    component.confirmSale();
    component.confirmSale();

    expect(salesApi.createFromServiceAgreements).toHaveBeenCalledTimes(1);
    expect(salesApi.createFromServiceAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({
        idempotencyKey: jasmine.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      }),
    );
    pendingResponse.complete();
  });

  it('conserva el modal abierto y muestra el detalle cuando falta stock', () => {
    salesApi.createFromServiceAgreements.and.returnValue(throwError(() => ({
      error: { message: 'Stock insuficiente para G502. Disponible: 0, solicitado: 1' },
    })));

    component.confirmSale();

    expect(component.errorMessage).toContain('Stock insuficiente para G502');
    expect(component.isSubmitting).toBeFalse();
  });

  it('usa el total de la cotización confirmada cuando la proyección de la orden está en cero', () => {
    agreementApi.findAll.and.returnValue(of({
      data: [createAgreement(508.52)],
      total: 1,
      page: 1,
      limit: 20,
    }));
    fixture = TestBed.createComponent(ServiceOrderSaleModalComponent);
    component = fixture.componentInstance;
    component.order = { ...createOrder(), montoComprometidoVigente: 0 };
    component.ngOnInit();
    component.paymentMethod = PaymentMethod.CARD;

    component.confirmSale();

    expect(component.saleTotal).toBe(508.52);
    expect(salesApi.createFromServiceAgreements).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        payments: [jasmine.objectContaining({ amount: 508.52 })],
      }),
    );
  });

  it('redondea el pago en efectivo a diez céntimos y conserva el importe exacto con tarjeta', () => {
    agreementApi.findAll.and.returnValue(of({
      data: [createAgreement(508.52)], total: 1, page: 1, limit: 20,
    }));
    fixture = TestBed.createComponent(ServiceOrderSaleModalComponent);
    component = fixture.componentInstance;
    component.order = createOrder();
    component.ngOnInit();

    component.paymentMethod = PaymentMethod.CASH;
    expect(component.paymentTotal).toBe(508.5);

    component.paymentMethod = PaymentMethod.CARD;
    expect(component.paymentTotal).toBe(508.52);
  });

  it('presenta el detalle comercial bajo demanda sin incrustar materiales', () => {
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain('Ver detalle de la venta');
    expect(content).toContain('Servicio técnico');
    expect(content).not.toContain('Guías internas y materiales');
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

function createAgreement(totalAmount: number) {
  return {
    id: 31,
    serviceOrderId: 17,
    sequenceNumber: 1,
    status: 'CONFIRMED',
    totalAmount,
    items: [{
      id: 51,
      commercialVersionId: 61,
      commercialVersion: {
        id: 61,
        lines: [{
          id: 71,
          type: 'SERVICE',
          catalogNameSnapshot: 'Servicio técnico',
          quantity: 1,
          unitPrice: totalAmount,
          netAmount: totalAmount,
        }],
      },
    }],
  } as any;
}
