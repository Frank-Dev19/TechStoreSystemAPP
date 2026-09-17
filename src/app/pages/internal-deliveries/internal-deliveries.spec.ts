import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { InternalDeliveries } from './internal-deliveries';
describe('InternalDeliveries', () => {
  it('sends technician and inclusive dates to the paginated API', () => {
    const base = { get: jasmine.createSpy().and.returnValue(of({ data: [], total: 0 })) };
    const component = new InternalDeliveries(
      base as any,
      {} as any,
      {} as any,
      { hasPermission: () => true } as any,
    );
    component.technicianId = 8;
    component.deliveryType = 'MANUAL';
    component.from = '2026-09-01';
    component.to = '2026-09-13';
    component.page = 2;
    component.load();
    expect(base.get).toHaveBeenCalledWith('/service-order-material-deliveries', {
      params: {
        technicianId: 8,
        type: 'MANUAL',
        from: '2026-09-01',
        to: '2026-09-13',
        page: 2,
        limit: 20,
      },
      withLoader: false,
    });
  });
  it('blocks reversed ranges without requesting data', () => {
    const base = { get: jasmine.createSpy() };
    const component = new InternalDeliveries(
      base as any,
      {} as any,
      {} as any,
      { hasPermission: () => true } as any,
    );
    component.from = '2026-09-14';
    component.to = '2026-09-01';
    component.load();
    expect(base.get).not.toHaveBeenCalled();
    expect(component.error).toContain('Desde');
  });
  it('clears filters and resets pagination in the URL', () => {
    const router = { navigate: jasmine.createSpy() };
    const route = { snapshot: { queryParamMap: convertToParamMap({ page: 3 }) } };
    const component = new InternalDeliveries(
      {} as any,
      router as any,
      route as any,
      { hasPermission: () => true } as any,
    );
    component.page = 3;
    component.technicianId = 8;
    component.clear();
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: {
        technicianId: undefined,
        type: undefined,
        from: undefined,
        to: undefined,
        page: 1,
      },
    });
  });
  it('requires available quantity before creating a manual delivery', () => {
    const base = { post: jasmine.createSpy() };
    const component = new InternalDeliveries(
      base as any,
      {} as any,
      {} as any,
      { hasPermission: () => true } as any,
    );
    component.manualTechnicianId = 2;
    component.productId = 7;
    component.quantity = 5;
    component.products = [
      { id: 7, name: 'Pasta térmica', sku: 'PT', isSerialized: false, managesExpiration: false },
    ];
    component.options = { product: {} as any, availableQuantity: 3, lots: [], serials: [] };
    component.saveManual();
    expect(base.post).not.toHaveBeenCalled();
    expect(component.editorError).toContain('cantidad');
  });
  it('keeps historical recipients in filters but excludes them from manual delivery', () => {
    const component = new InternalDeliveries(
      {} as any,
      {} as any,
      {} as any,
      { hasPermission: () => true } as any,
    );
    component.technicians = [
      { id: 1, name: 'Administrador', canReceiveManual: false },
      { id: 2, name: 'Técnico activo', canReceiveManual: true },
    ];
    expect(component.manualTechnicians).toEqual([
      { id: 2, name: 'Técnico activo', canReceiveManual: true },
    ]);
    expect(component.technicians).toHaveSize(2);
  });
});
