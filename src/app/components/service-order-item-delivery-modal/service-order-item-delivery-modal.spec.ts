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
  const serviceOrderService = jasmine.createSpyObj<ServiceOrderService>('ServiceOrderService', ['deliverItem']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceOrderItemDeliveryModalComponent, ServiceOrderItemProgressComponent],
      providers: [{ provide: ServiceOrderService, useValue: serviceOrderService }],
    }).compileComponents();
    fixture = TestBed.createComponent(ServiceOrderItemDeliveryModalComponent);
    component = fixture.componentInstance;
    serviceOrderService.deliverItem.calls.reset();
  });

  it('envía únicamente el equipo seleccionado y emite la cabecera actualizada', () => {
    const order = createOrder();
    const updated = { ...order, operativeStatus: ServiceOrderOperativeStatus.ENTREGA_PARCIAL };
    serviceOrderService.deliverItem.and.returnValue(of(updated));
    component.target = { order };
    component.ngOnChanges();
    component.selectItem(order.items![1]);
    spyOn(component.deliverySaved, 'emit');

    component.submit();

    expect(serviceOrderService.deliverItem).toHaveBeenCalledWith(10, 102);
    expect(component.deliverySaved.emit).toHaveBeenCalledWith(updated);
  });

  it('bloquea el envío cuando la cobertura económica aún es parcial', () => {
    const order = createOrder();
    order.economicStatus = ServiceOrderEconomicStatus.PARCIAL;
    component.target = { order };
    component.ngOnChanges();

    component.submit();

    expect(component.blockedReason).toContain('cobertura económica total');
    expect(serviceOrderService.deliverItem).not.toHaveBeenCalled();
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
