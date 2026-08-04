import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import {
  ServiceOrderCancellationChannel,
  ServiceOrderCancellationResolution,
  ServiceOrderOperativeStatus,
  ServiceOrderTechnicalStatus,
} from '../../models/service-orders/service-order';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { ServiceOrderItemCancellationModalComponent } from './service-order-item-cancellation-modal';

describe('ServiceOrderItemCancellationModalComponent', () => {
  let fixture: ComponentFixture<ServiceOrderItemCancellationModalComponent>;
  let component: ServiceOrderItemCancellationModalComponent;
  const serviceOrderService = jasmine.createSpyObj<ServiceOrderService>('ServiceOrderService', [
    'requestItemCancellation',
    'resolveItemCancellation',
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceOrderItemCancellationModalComponent],
      imports: [CommonModule, ReactiveFormsModule],
      providers: [{ provide: ServiceOrderService, useValue: serviceOrderService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceOrderItemCancellationModalComponent);
    component = fixture.componentInstance;
    serviceOrderService.requestItemCancellation.calls.reset();
    serviceOrderService.resolveItemCancellation.calls.reset();
  });

  it('registra una solicitud para el equipo exacto y su canal', () => {
    component.target = {
      mode: 'REQUEST',
      serviceOrderId: 70,
      orderCode: 'OS-03-08-2026-001',
      selectedItemId: 702,
      items: [createItem()],
    };
    component.ngOnChanges();
    serviceOrderService.requestItemCancellation.and.returnValue(of({ request: { id: 91 }, order: {} } as any));
    component.form.patchValue({ channel: ServiceOrderCancellationChannel.WHATSAPP, reason: 'El cliente desistió.' });

    component.submit();

    expect(serviceOrderService.requestItemCancellation).toHaveBeenCalledOnceWith(70, 702, {
      channel: ServiceOrderCancellationChannel.WHATSAPP,
      reason: 'El cliente desistió.',
    });
  });

  it('resuelve una solicitud tardía sin permitir afectar otro equipo', () => {
    const item = createItem();
    item.operativeStatus = ServiceOrderOperativeStatus.CANCELACION_SOLICITADA;
    item.cancellationRequests = [{ id: 91, status: 'PENDING' } as any];
    component.target = {
      mode: 'RESOLVE',
      serviceOrderId: 70,
      orderCode: 'OS-03-08-2026-001',
      selectedItemId: 702,
      cancellationRequestId: 91,
      items: [item],
    };
    component.ngOnChanges();
    serviceOrderService.resolveItemCancellation.and.returnValue(of({ request: { id: 91 }, order: {} } as any));
    component.form.patchValue({
      resolution: ServiceOrderCancellationResolution.REJECTED,
      reason: 'Se continuará con el servicio.',
    });

    component.submit();

    expect(serviceOrderService.resolveItemCancellation).toHaveBeenCalledOnceWith(70, 702, 91, {
      resolution: ServiceOrderCancellationResolution.REJECTED,
      reason: 'Se continuará con el servicio.',
    });
  });

  it('envía el monto cuando supervisión propone cancelar con cobro', () => {
    const item = createItem();
    item.operativeStatus = ServiceOrderOperativeStatus.CANCELACION_SOLICITADA;
    component.target = {
      mode: 'RESOLVE',
      serviceOrderId: 70,
      orderCode: 'OS-03-08-2026-001',
      selectedItemId: 702,
      cancellationRequestId: 91,
      items: [item],
    };
    component.ngOnChanges();
    serviceOrderService.resolveItemCancellation.and.returnValue(of({ request: { id: 91 }, order: {} } as any));
    component.form.patchValue({
      resolution: ServiceOrderCancellationResolution.APPROVED_WITH_CHARGE,
      chargeAmount: 45.5,
      reason: 'Cargo por trabajo realizado.',
    });

    component.submit();

    expect(serviceOrderService.resolveItemCancellation).toHaveBeenCalledOnceWith(70, 702, 91, {
      resolution: ServiceOrderCancellationResolution.APPROVED_WITH_CHARGE,
      chargeAmount: 45.5,
      reason: 'Cargo por trabajo realizado.',
    });
  });
});

function createItem() {
  return {
    id: 702,
    serviceOrderId: 70,
    code: 'OS-03-08-2026-001-02',
    brand: 'Acer',
    model: 'Nitro V',
    operativeStatus: ServiceOrderOperativeStatus.EN_PROCESO,
    technicalStatus: ServiceOrderTechnicalStatus.EN_EJECUCION,
    serviceStartedAt: '2026-08-03T10:00:00.000Z',
    cancellationRequests: [],
  } as any;
}
