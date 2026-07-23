import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { ServiceOrderInboxService } from './service-order-inbox.service';

describe('ServiceOrderInboxService', () => {
  let service: ServiceOrderInboxService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post', 'put']);
    service = new ServiceOrderInboxService(httpClientSpy);
  });

  it('uses the dedicated order-to-thread endpoint', () => {
    httpClientSpy.get.and.returnValue(of({ id: 7 } as any));

    service.getThreadByOrder(42);

    expect(httpClientSpy.get).toHaveBeenCalledWith('http://localhost:3000/service-orders/42/inbox-thread');
  });

  it('loads the linked orders for a thread from the dedicated endpoint', () => {
    httpClientSpy.get.and.returnValue(of([]));

    service.getThreadOrders(15);

    expect(httpClientSpy.get).toHaveBeenCalledWith('http://localhost:3000/service-orders/inbox/threads/15/orders');
  });

  it('replaces message order links through the dedicated endpoint', () => {
    httpClientSpy.put.and.returnValue(of({ id: 99, serviceOrderIds: [4, 5] } as any));

    service.replaceMessageOrders(99, [4, 5]);

    expect(httpClientSpy.put).toHaveBeenCalledWith(
      'http://localhost:3000/service-orders/inbox/messages/99/orders',
      { serviceOrderIds: [4, 5] },
    );
  });

  it('sends selected serviceOrderIds together with the outbound inbox message', () => {
    httpClientSpy.post.and.returnValue(of({ id: 10 } as any));
    const attachments = [new File(['hola'], 'nota.txt', { type: 'text/plain' })];

    service.sendMessage(7, 'Hola cliente', attachments, [11, 12]);

    const [url, payload] = httpClientSpy.post.calls.mostRecent().args as [string, FormData];
    expect(url).toBe('http://localhost:3000/service-orders/inbox/threads/7/messages');
    expect(payload instanceof FormData).toBeTrue();
    expect(payload.get('text')).toBe('Hola cliente');
    expect(payload.getAll('serviceOrderIds')).toEqual(['11', '12']);
    expect((payload.getAll('attachments')[0] as File).name).toBe('nota.txt');
  });
});
