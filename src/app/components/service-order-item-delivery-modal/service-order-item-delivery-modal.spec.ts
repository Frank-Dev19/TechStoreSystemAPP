import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ServiceOrder,
  ServiceOrderCommercialStatus,
  ServiceOrderEconomicStatus,
  ServiceOrderOperativeStatus,
} from '../../models/service-orders/service-order';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';
import { ServiceOrderItemProgressComponent } from '../service-order-item-progress/service-order-item-progress';
import { ServiceOrderItemDeliveryModalComponent } from './service-order-item-delivery-modal';

describe('ServiceOrderItemDeliveryModalComponent', () => {
  let fixture: ComponentFixture<ServiceOrderItemDeliveryModalComponent>;
  let component: ServiceOrderItemDeliveryModalComponent;
  const serviceOrderService = jasmine.createSpyObj<ServiceOrderService>('ServiceOrderService', ['deliverItems']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceOrderItemDeliveryModalComponent, ServiceOrderItemProgressComponent],
      providers: [{ provide: ServiceOrderService, useValue: serviceOrderService }],
    }).compileComponents();
    fixture = TestBed.createComponent(ServiceOrderItemDeliveryModalComponent);
    component = fixture.componentInstance;
    serviceOrderService.deliverItems.calls.reset();
  });

  it('envía todos los equipos seleccionados en una sola petición y emite la cabecera actualizada', () => {
    const order = createOrder();
    const updated = { ...order, operativeStatus: ServiceOrderOperativeStatus.ENTREGA_PARCIAL };
    serviceOrderService.deliverItems.and.returnValue(of(updated));
    component.target = { order };
    component.ngOnChanges();
    component.toggleAllEligible();
    spyOn(component.deliverySaved, 'emit');

    component.submit();

    expect(serviceOrderService.deliverItems).toHaveBeenCalledWith(10, [101, 102]);
    expect(component.deliverySaved.emit).toHaveBeenCalledWith(updated);
  });

  it('bloquea el envío cuando la cobertura económica aún es parcial', () => {
    const order = createOrder();
    order.economicStatus = ServiceOrderEconomicStatus.PARCIAL;
    component.target = { order };
    component.ngOnChanges();

    expect(component.getItemBlockedReason(order.items![0])).toContain('cobertura económica total');
    expect(component.eligibleItems).toEqual([]);
    expect(serviceOrderService.deliverItems).not.toHaveBeenCalled();
  });

  it('maneja el checkbox general vacío, completo e indeterminado', () => {
    const order = createOrder();
    component.target = { order };
    component.ngOnChanges();

    expect(component.selectedCount).toBe(0);
    expect(component.allEligibleSelected).toBeFalse();
    expect(component.someEligibleSelected).toBeFalse();

    component.toggleItem(order.items![0]);
    expect(component.someEligibleSelected).toBeTrue();

    component.toggleAllEligible();
    expect(component.selectedItemIds).toEqual([101, 102]);
    expect(component.allEligibleSelected).toBeTrue();

    component.toggleAllEligible();
    expect(component.selectedItemIds).toEqual([]);
  });

  it('restaura el check y el sombreado cuando el API entrega IDs bigint como texto', () => {
    const order = createOrder();
    order.items![0].id = '101' as any;
    component.target = { order };
    component.ngOnChanges();

    component.toggleItem(order.items![0]);
    fixture.detectChanges();

    const selectedCard = fixture.nativeElement.querySelector('.delivery-item--selected');
    expect(selectedCard).not.toBeNull();
    expect((selectedCard.querySelector('.delivery-item__checkbox') as HTMLInputElement).checked).toBeTrue();
  });

  it('incluye cancelaciones no entregadas y no bloquea las que no tienen cargo', () => {
    const order = createOrder();
    order.commercialStatus = ServiceOrderCommercialStatus.NO_REQUIERE;
    order.economicStatus = ServiceOrderEconomicStatus.NO_APLICA;
    order.items = [{
      id: 103,
      position: 1,
      code: 'SO-03-08-2026-0001-03',
      operativeStatus: ServiceOrderOperativeStatus.CANCELADA,
      deliveredAt: null,
      cancellationRequests: [{ status: 'APPROVED', chargeAmount: null } as any],
    } as any];
    component.target = { order };
    component.ngOnChanges();

    expect(component.eligibleItems.map((item) => item.id)).toEqual([103]);
    expect(component.getItemBlockedReason(order.items[0])).toBeNull();
  });

  it('bloquea una cancelación con cargo pendiente y la habilita al pagarse', () => {
    const order = createOrder();
    order.economicStatus = ServiceOrderEconomicStatus.PENDIENTE;
    order.items = [{
      id: 104,
      position: 1,
      code: 'SO-03-08-2026-0001-04',
      operativeStatus: ServiceOrderOperativeStatus.CANCELADA,
      deliveredAt: null,
      cancellationRequests: [{ status: 'APPROVED', chargeAmount: 20 } as any],
    } as any];
    component.target = { order };
    component.ngOnChanges();

    expect(component.getItemBlockedReason(order.items[0])).toContain('cargo por diagnóstico');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.delivery-item--blocked')).not.toBeNull();
    expect(component.eligibleItems).toEqual([]);

    order.economicStatus = ServiceOrderEconomicStatus.TOTAL;
    expect(component.getItemBlockedReason(order.items[0])).toBeNull();
  });
});

function createOrder(): ServiceOrder {
  return {
    id: 10,
    code: 'SO-03-08-2026-0001',
    commercialStatus: ServiceOrderCommercialStatus.AUTORIZADA,
    economicStatus: ServiceOrderEconomicStatus.TOTAL,
    items: [
      { id: 101, position: 1, code: 'SO-03-08-2026-0001-01', operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA },
      { id: 102, position: 2, code: 'SO-03-08-2026-0001-02', operativeStatus: ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA },
    ],
    itemProgress: {
      total: 2,
      active: 2,
      resolved: 2,
      readyForPickup: 2,
      delivered: 0,
      cancelled: 0,
      cancellationPending: 0,
      isPartial: false,
    },
  } as ServiceOrder;
}
