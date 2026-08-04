import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceOrder } from '../../models/service-orders/service-order';
import { ServiceOrderItemProgressComponent } from './service-order-item-progress';

describe('ServiceOrderItemProgressComponent', () => {
  let fixture: ComponentFixture<ServiceOrderItemProgressComponent>;
  let component: ServiceOrderItemProgressComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [ServiceOrderItemProgressComponent] }).compileComponents();
    fixture = TestBed.createComponent(ServiceOrderItemProgressComponent);
    component = fixture.componentInstance;
  });

  it('muestra el progreso parcial n de m sin contar equipos cancelados', () => {
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

    expect(component.label).toBe('Entrega parcial: 1 de 3');
    expect(component.percentage).toBe(33);
    expect(fixture.nativeElement.textContent).toContain('1 cancelado');
  });
});
