import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ServiceOrder,
  ServiceOrderOperativeStatus,
} from '../../models/service-orders/service-order';
import { ServiceOrderItemProgressComponent } from './service-order-item-progress';

describe('ServiceOrderItemProgressComponent', () => {
  let fixture: ComponentFixture<ServiceOrderItemProgressComponent>;
  let component: ServiceOrderItemProgressComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [ServiceOrderItemProgressComponent] }).compileComponents();
    fixture = TestBed.createComponent(ServiceOrderItemProgressComponent);
    component = fixture.componentInstance;
  });

  it('muestra el progreso físico n de m incluyendo equipos cancelados pendientes de devolución', () => {
    component.order = {
      itemProgress: {
        total: 4,
        active: 3,
        resolved: 3,
        readyForPickup: 3,
        delivered: 1,
        cancelled: 1,
        cancellationPending: 0,
        isPartial: true,
      },
    } as ServiceOrder;

    fixture.detectChanges();

    expect(component.label).toBe('1 de 4');
    expect(component.detail).toBe('Salida parcial');
    expect(component.percentage).toBe(25);
    expect(fixture.nativeElement.textContent).toContain('Salida de equipos');
  });

  it('distingue una salida mixta entre equipos entregados y devueltos', () => {
    component.order = {
      itemProgress: {
        total: 2,
        active: 0,
        resolved: 2,
        readyForPickup: 0,
        delivered: 2,
        cancelled: 1,
        cancellationPending: 0,
        isPartial: false,
      },
      items: [
        { deliveredAt: '2026-08-20T10:00:00.000Z', operativeStatus: ServiceOrderOperativeStatus.ENTREGADA },
        { deliveredAt: '2026-08-20T10:00:00.000Z', operativeStatus: ServiceOrderOperativeStatus.CANCELADA },
      ],
    } as ServiceOrder;

    expect(component.label).toBe('2 de 2 entregados o devueltos');
    expect(component.detail).toBe('1 entregado · 1 devuelto');
  });
});
