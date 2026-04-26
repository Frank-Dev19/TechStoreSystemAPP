import { throwError } from 'rxjs';
import {
  ServiceOrderTechnicalStatus,
} from '../../models/service-orders/service-order';
import { BaseService } from '../base.service';
import { ServiceOrderService } from './service-order.service';

describe('ServiceOrderService', () => {
  let service: ServiceOrderService;
  let baseServiceSpy: jasmine.SpyObj<BaseService>;

  beforeEach(() => {
    baseServiceSpy = jasmine.createSpyObj<BaseService>('BaseService', ['get', 'post', 'patch', 'delete']);
    service = new ServiceOrderService(baseServiceSpy);
  });

  it('uses the technical status endpoint when changing the technical status', () => {
    baseServiceSpy.patch.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.changeTechnicalStatus(42, ServiceOrderTechnicalStatus.EN_EJECUCION, 'Listo para intervenir');

    expect(baseServiceSpy.patch).toHaveBeenCalledWith('/service-orders/42/technical/EN_EJECUCION', {
      reason: 'Listo para intervenir',
    });
  });

  it('sends an empty payload when changing the technical status without a reason', () => {
    baseServiceSpy.patch.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.changeTechnicalStatus(7, ServiceOrderTechnicalStatus.RESUELTA);

    expect(baseServiceSpy.patch).toHaveBeenCalledWith('/service-orders/7/technical/RESUELTA', {});
  });

  it('uses the dedicated delivery endpoint when marking an order as delivered', () => {
    baseServiceSpy.patch.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.markAsDelivered(9);

    expect(baseServiceSpy.patch).toHaveBeenCalledWith('/service-orders/9/deliver', {});
  });

  it('fails explicitly when markPaid is used', (done) => {
    service.markPaid(15).subscribe({
      next: () => done.fail('markPaid should not emit a successful value'),
      error: (error: Error) => {
        expect(error.message).toContain('markPaid(15) fue eliminado');
        expect(error.message).toContain('estado económico depende solo de comprobantes vinculados');
        expect(baseServiceSpy.patch).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
