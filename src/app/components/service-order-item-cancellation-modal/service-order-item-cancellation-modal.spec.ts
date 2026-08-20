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
    'requestItemsCancellation',
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
    serviceOrderService.requestItemsCancellation.calls.reset();
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
    serviceOrderService.requestItemsCancellation.and.returnValue(of({ requests: [{ id: 91 }], order: {} } as any));
    component.form.patchValue({
      channel: ServiceOrderCancellationChannel.WHATSAPP,
      reason: 'El cliente desistió.',
      customerChargeAcknowledged: true,
    });

    component.submit();

    expect(serviceOrderService.requestItemsCancellation).toHaveBeenCalledOnceWith(70, {
      itemIds: [702],
      channel: ServiceOrderCancellationChannel.WHATSAPP,
      reason: 'El cliente desistió.',
      customerChargeAcknowledged: true,
    });
  });

  it('muestra el overlay por encima de los modales de los paneles', () => {
    component.target = {
      mode: 'REQUEST',
      serviceOrderId: 70,
      orderCode: 'OS-03-08-2026-001',
      items: [createItem()],
    };
    component.ngOnChanges();
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.cancellation-overlay') as HTMLElement;
    expect(Number(getComputedStyle(overlay).zIndex)).toBeGreaterThan(9500);
  });

  it('muestra solo el resumen cuando la selección viene del modal de equipos', () => {
    component.target = {
      mode: 'REQUEST',
      serviceOrderId: 70,
      orderCode: 'OS-03-08-2026-001',
      items: [createItem()],
      selectedItemIds: [702],
      selectionLocked: true,
    };
    component.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cancellation-confirmation-summary')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.cancellation-picker')).toBeFalsy();
    expect(component.selectedItems.map((item) => item.id)).toEqual([702]);
  });

  it('selecciona varios equipos y calcula S/ 20 por cada diagnóstico iniciado', () => {
    const assigned = { ...createItem(), id: 701, technicalStatus: ServiceOrderTechnicalStatus.ASIGNADA };
    const diagnosed = { ...createItem(), id: 702, technicalStatus: ServiceOrderTechnicalStatus.EN_DIAGNOSTICO };
    component.target = {
      mode: 'REQUEST',
      serviceOrderId: 70,
      orderCode: 'OS-03-08-2026-001',
      items: [assigned, diagnosed],
    };
    component.ngOnChanges();

    component.selectAll();

    expect(component.selectedItems).toHaveSize(2);
    expect(component.chargedItems).toEqual([diagnosed]);
    expect(component.chargeTotal).toBe(20);
    expect(component.canSubmit).toBeFalse();
    component.form.patchValue({
      reason: 'El cliente solicita cancelar.',
      customerChargeAcknowledged: true,
    });
    expect(component.canSubmit).toBeTrue();
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
