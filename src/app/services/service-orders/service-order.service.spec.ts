import { throwError } from 'rxjs';
import {
  EquipmentType,
  RequestOrigin,
  ServiceOrderCancellationChannel,
  ServiceOrderCancellationResolution,
  ServiceOrderPriority,
  ServiceOrderTechnicalStatus,
  ServiceType,
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

  it('entrega el equipo exacto mediante el endpoint por item', () => {
    baseServiceSpy.patch.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.deliverItem(9, 91);

    expect(baseServiceSpy.patch).toHaveBeenCalledWith('/service-orders/9/items/91/deliver', {});
  });

  it('entrega varios equipos mediante el endpoint atómico', () => {
    baseServiceSpy.patch.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.deliverItems(9, [91, 92]);

    expect(baseServiceSpy.patch).toHaveBeenCalledWith('/service-orders/9/item-deliveries', {
      itemIds: [91, 92],
    });
  });

  it('usa el endpoint por item para una transición técnica independiente', () => {
    baseServiceSpy.patch.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.changeItemTechnicalStatus(9, 91, ServiceOrderTechnicalStatus.RESUELTA, 'Equipo reparado');

    expect(baseServiceSpy.patch).toHaveBeenCalledWith(
      '/service-orders/9/items/91/technical/RESUELTA',
      { reason: 'Equipo reparado' },
    );
  });

  it('registra una cancelación sobre el equipo exacto', () => {
    baseServiceSpy.post.and.returnValue(throwError(() => new Error('stub')));
    const payload = { channel: ServiceOrderCancellationChannel.WHATSAPP, reason: 'Cliente desistió.' };

    service.requestItemCancellation(9, 91, payload);

    expect(baseServiceSpy.post).toHaveBeenCalledWith('/service-orders/9/items/91/cancellations', payload);
  });

  it('registra una cancelación múltiple atómica', () => {
    baseServiceSpy.post.and.returnValue(throwError(() => new Error('stub')));
    const payload = {
      itemIds: [91, 92],
      channel: ServiceOrderCancellationChannel.WHATSAPP,
      reason: 'Cliente desistió.',
      customerChargeAcknowledged: true,
    };

    service.requestItemsCancellation(9, payload);

    expect(baseServiceSpy.post).toHaveBeenCalledWith('/service-orders/9/item-cancellations', payload);
  });

  it('resuelve una cancelación tardía sobre su solicitud exacta', () => {
    baseServiceSpy.patch.and.returnValue(throwError(() => new Error('stub')));
    const payload = {
      resolution: ServiceOrderCancellationResolution.REJECTED,
      reason: 'Se continuará con el servicio.',
    };

    service.resolveItemCancellation(9, 91, 501, payload);

    expect(baseServiceSpy.patch).toHaveBeenCalledWith(
      '/service-orders/9/items/91/cancellations/501/resolve',
      payload,
    );
  });

  it('envía una sola orden agregada con items al endpoint principal', () => {
    baseServiceSpy.post.and.returnValue(
      throwError(() => new Error('stub response should not be consumed in this test')),
    );

    service.create({
      requestOrigin: RequestOrigin.CLIENT,
      clientId: 15,
      assignedToTechnicianId: 9,
      serviceType: ServiceType.DIAGNOSIS,
      items: [
        {
          equipmentType: EquipmentType.LAPTOP,
          initialIssue: 'No enciende',
          priority: ServiceOrderPriority.LOW,
        },
        {
          equipmentType: EquipmentType.PRINTER,
          initialIssue: 'Atasca papel',
          priority: ServiceOrderPriority.HIGH,
        },
      ],
    });

    expect(baseServiceSpy.post).toHaveBeenCalledWith(
      '/service-orders',
      jasmine.objectContaining({
        serviceType: ServiceType.DIAGNOSIS,
        items: [
          jasmine.objectContaining({ priority: ServiceOrderPriority.LOW }),
          jasmine.objectContaining({ priority: ServiceOrderPriority.HIGH }),
        ],
      }),
    );
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
