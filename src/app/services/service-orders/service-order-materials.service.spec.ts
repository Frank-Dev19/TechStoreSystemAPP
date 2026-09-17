import { of } from 'rxjs';
import { ServiceOrderMaterialsService } from './service-order-materials.service';

describe('ServiceOrderMaterialsService', () => {
  it('uses an absolute API path and passes an unchanged retry key', () => {
    const base = { get: jasmine.createSpy().and.returnValue(of({})), post: jasmine.createSpy().and.returnValue(of({})) };
    const api = new ServiceOrderMaterialsService(base as any);
    api.read(10, 20);
    expect(base.get).toHaveBeenCalledWith('/service-orders/10/items/20/materials', { withLoader: false });
    const data = { requestKey: 'same-key', versionId: 3 };
    api.act(10, 20, 'reconcile', data);
    expect(base.post).toHaveBeenCalledWith('/service-orders/10/items/20/materials/reconcile', data, { withLoader: false });
  });
});
