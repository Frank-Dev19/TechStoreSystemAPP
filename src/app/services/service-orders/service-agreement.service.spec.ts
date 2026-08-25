import { of, throwError } from 'rxjs';
import { BaseService } from '../base.service';
import { ServiceOrderAgreementService } from './service-agreement.service';

describe('ServiceOrderAgreementService', () => {
  let service: ServiceOrderAgreementService;
  let baseServiceSpy: jasmine.SpyObj<BaseService>;

  beforeEach(() => {
    baseServiceSpy = jasmine.createSpyObj<BaseService>('BaseService', ['get', 'getBlob', 'post', 'patch', 'delete']);
    service = new ServiceOrderAgreementService(baseServiceSpy);
  });

  it('envía una revisión consolidada al endpoint dedicado', () => {
    baseServiceSpy.post.and.returnValue(
      throwError(() => new Error('La respuesta no se consume en esta prueba')),
    );
    const payload = {
      serviceOrderId: 70,
      items: [
        {
          serviceOrderItemId: 702,
          baseVersionId: 802,
          lines: [{ type: 'SERVICE' as const, serviceId: 1, quantity: 1, unitPrice: 120 }],
        },
      ],
    };

    service.createRevision(payload);

    expect(baseServiceSpy.post).toHaveBeenCalledWith('/service-order-agreements/revisions', payload);
  });

  it('registra una decisión manual contra la versión comercial exacta', () => {
    baseServiceSpy.post.and.returnValue(
      throwError(() => new Error('La respuesta no se consume en esta prueba')),
    );
    const payload = {
      commercialVersionId: 802,
      decision: 'ACCEPTED' as const,
      channel: 'WHATSAPP' as const,
      observation: 'Confirmado por el cliente en el inbox',
    };

    service.recordClientDecision(payload);

    expect(baseServiceSpy.post).toHaveBeenCalledWith('/service-order-agreements/client-decisions', payload);
  });

  it('solicita la vista previa PDF de una versión comercial', () => {
    baseServiceSpy.getBlob.and.returnValue(of(new Blob()));

    service.previewCommercialVersionPdf(802);

    expect(baseServiceSpy.getBlob).toHaveBeenCalledWith(
      '/service-order-agreements/commercial-versions/802/pdf-preview',
    );
  });

  it('emite y envía una versión comercial mediante el endpoint dedicado', () => {
    baseServiceSpy.post.and.returnValue(of({ version: {} as never, deliveryStatus: 'SENT' }));

    service.issueCommercialVersion(802);

    expect(baseServiceSpy.post).toHaveBeenCalledWith(
      '/service-order-agreements/commercial-versions/802/issue',
      {},
    );
  });
});
