import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ServiceOrderAgreement } from '../../models/service-orders/service-agreement';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ServiceOrderLineDiscountModalComponent } from './service-order-line-discount-modal';

describe('ServiceOrderLineDiscountModalComponent', () => {
  let fixture: ComponentFixture<ServiceOrderLineDiscountModalComponent>;
  let component: ServiceOrderLineDiscountModalComponent;
  const agreementService = jasmine.createSpyObj<ServiceOrderAgreementService>('ServiceOrderAgreementService', [
    'createRevision',
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceOrderLineDiscountModalComponent],
      imports: [CommonModule, ReactiveFormsModule],
      providers: [{ provide: ServiceOrderAgreementService, useValue: agreementService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceOrderLineDiscountModalComponent);
    component = fixture.componentInstance;
    component.target = {
      serviceOrderId: 70,
      serviceOrderItemId: 702,
      itemLabel: 'OS-03-08-2026-001-02 · Acer Nitro V',
      baseVersionId: 802,
      versionNumber: 4,
      notes: 'Cotización del equipo',
      lines: [
        {
          id: 901,
          commercialVersionId: 802,
          type: 'SERVICE',
          productId: null,
          serviceId: 1,
          catalogCodeSnapshot: 'TECHNICAL_SERVICE',
          catalogNameSnapshot: 'Servicio técnico',
          catalogDescriptionSnapshot: null,
          quantity: 1,
          unitPrice: 100,
          grossAmount: 100,
          discountAmount: 5,
          netAmount: 95,
          requiresPurchase: false,
          notes: null,
          discounts: [
            {
              id: 1,
              commercialLineId: 901,
              pricingConfigId: 5,
              ruleName: 'Límite de descuento global',
              type: 'PERCENTAGE',
              percentage: 5,
              amount: 5,
              maxAllowedPct: 7,
              wasLimitOverridden: false,
              overrideReason: null,
              appliedByUserId: 9,
              authorizedByUserId: null,
              createdAt: '2026-08-03T10:00:00.000Z',
            },
          ],
        },
        {
          id: 902,
          commercialVersionId: 802,
          type: 'PRODUCT',
          productId: 41,
          serviceId: null,
          catalogCodeSnapshot: 'SSD-1TB',
          catalogNameSnapshot: 'SSD 1 TB',
          catalogDescriptionSnapshot: null,
          quantity: 2,
          unitPrice: 80,
          grossAmount: 160,
          discountAmount: 0,
          netAmount: 160,
          requiresPurchase: true,
          notes: 'Requiere compra',
          discounts: [],
        },
      ],
    };
    component.ngOnChanges();
    agreementService.createRevision.calls.reset();
  });

  it('crea una nueva versión del equipo con los descuentos editados y conserva las demás líneas', () => {
    const result = { id: 1000 } as ServiceOrderAgreement;
    agreementService.createRevision.and.returnValue(of(result));
    const emitted = jasmine.createSpy('revisionCreated');
    component.revisionCreated.subscribe(emitted);

    component.setPercentage(0, 7);
    component.setPercentage(1, 10);
    component.setOverrideReason(1, 'Autorizado por supervisión.');
    component.submit();

    expect(agreementService.createRevision).toHaveBeenCalledOnceWith({
      serviceOrderId: 70,
      items: [
        {
          serviceOrderItemId: 702,
          baseVersionId: 802,
          notes: 'Cotización del equipo',
          lines: [
            { type: 'SERVICE', serviceId: 1, quantity: 1, unitPrice: 100, discountPct: 7 },
            {
              type: 'PRODUCT',
              productId: 41,
              quantity: 2,
              unitPrice: 80,
              discountPct: 10,
              discountOverrideReason: 'Autorizado por supervisión.',
              requiresPurchase: true,
              notes: 'Requiere compra',
            },
          ],
        },
      ],
    });
    expect(emitted).toHaveBeenCalledOnceWith(result);
  });

  it('mantiene abierto el modal y muestra el límite informado por el backend', () => {
    agreementService.createRevision.and.returnValue(
      throwError(() => ({ error: { message: 'El descuento de 12% supera el máximo permitido de 7%.' } })),
    );

    component.setPercentage(0, 12);
    component.submit();

    expect(component.errorMessage).toBe('El descuento de 12% supera el máximo permitido de 7%.');
  });
});
