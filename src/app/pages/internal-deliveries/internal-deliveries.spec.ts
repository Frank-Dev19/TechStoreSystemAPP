import { of } from 'rxjs';
import { InternalDeliveries } from './internal-deliveries';

describe('InternalDeliveries', () => {
  it('uses the dispatch fulfillment permission', () => {
    const current = { hasPermission: jasmine.createSpy().and.returnValue(true) };
    const component = new InternalDeliveries({} as any, current as any);
    expect(component.canFulfill).toBeTrue();
    expect(current.hasPermission).toHaveBeenCalledWith('dispatches.fulfill');
  });

  it('loads a server-paginated request queue for the active view', () => {
    const base = { get: jasmine.createSpy().and.returnValue(of({ data: [], total: 0 })) };
    const component = new InternalDeliveries(base as any, { hasPermission: () => true } as any);
    component.activeTab = 'INTERNAL_SUPPLY';
    component.page = 2;
    component.load();
    expect(base.get).toHaveBeenCalledWith('/dispatches/queue', {
      params: { type: 'INTERNAL_SUPPLY', status: 'PENDING', page: 2, limit: 20 },
      withLoader: false,
    });
  });

  it('requires the exact number of series before fulfillment', () => {
    const component = new InternalDeliveries({} as any, { hasPermission: () => true } as any);
    component.actionRow = { id: 1, type: 'WARRANTY_REPLACEMENT', status: 'PENDING', technicianId: 2, technicianName: 'Técnico', productId: 3, productName: 'Mouse', productSku: 'M1', quantity: 1, createdAt: '' };
    component.options = { product: { id: 3, name: 'Mouse', sku: 'M1', isSerialized: true, managesExpiration: false, unit: 'und' }, availableQuantity: 2, lots: [], serials: [] };
    expect(component.actionInvalid).toBeTrue();
    component.serialIds = [9];
    expect(component.actionInvalid).toBeFalse();
  });
});
