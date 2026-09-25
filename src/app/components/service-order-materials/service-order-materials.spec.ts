import { of, Subject } from 'rxjs';
import { ServiceOrderMaterialsComponent } from './service-order-materials';

describe('ServiceOrderMaterialsComponent', () => {
  it('does not expose inventory actions to a technician without permission', () => {
    const component = new ServiceOrderMaterialsComponent(
      {} as any,
      { hasPermission: () => false } as any,
    );
    expect(component.canManage).toBeFalse();
  });
  it('does not expose inventory actions on the technician surface even with inventory permission', () => {
    const component = new ServiceOrderMaterialsComponent(
      {} as any,
      { hasPermission: () => true } as any,
    );
    component.allowInventoryActions = false;
    expect(component.canManage).toBeFalse();
  });
  it('requires a reason for a faulty return and keeps the form open', () => {
    const api = { act: jasmine.createSpy() };
    const component = new ServiceOrderMaterialsComponent(
      api as any,
      { hasPermission: () => true } as any,
    );
    component.returnLine = { id: 1 } as any;
    component.reason = ' ';
    component.submitReturn();
    expect(api.act).not.toHaveBeenCalled();
    expect(component.error).toContain('falla');
  });
  it('recognizes a reconciliation only for the current version', () => {
    const component = new ServiceOrderMaterialsComponent({} as any, {} as any);
    component.state = { version: { id: 2 }, reconciliation: { valid: true, versionId: 1 } } as any;
    expect(component.reconciled).toBeFalse();
  });
  it('does not describe a warranty replacement as a missing quotation', () => {
    const component = new ServiceOrderMaterialsComponent({} as any, {} as any);
    component.order = { serviceType: 'WARRANTY_SERVICE' } as any;
    component.state = { version: null } as any;

    expect(component.isWarrantyOrder).toBeTrue();
    expect(component.statusLabel).toBe('Gestión por garantía');
  });
});

describe('Material workflow guidance', () => {
  function setup() {
    const api = {
      act: jasmine.createSpy(),
      available: jasmine.createSpy().and.returnValue(of({ serials: [], lots: [] })),
    };
    const c = new ServiceOrderMaterialsComponent(api as any, { hasPermission: () => true } as any);
    c.order = { id: 1, items: [{ id: 1 }] } as any;
    c.selectedItemId = 1;
    c.state = {
      version: {
        id: 1,
        lines: [
          { id: 1, type: 'PRODUCT', productId: 7, quantity: 2, product: { isSerialized: true } },
        ],
      },
      lines: [],
      serials: [],
      returns: [],
      conditionHistory: [],
      technicianId: 1,
      technicalStatus: 'EN_EJECUCION',
    } as any;
    return { c, api };
  }
  it('counts only pieces still delivered and combines repeated quoted products', () => {
    const { c } = setup();
    c.state!.version!.lines.push({ ...c.products[0], id: 2, quantity: 1 });
    c.state!.lines = [{ productId: 7, quantity: 2, returnedQuantity: 1 }] as any;
    expect(c.productProgress[0].authorized).toBe(3);
    expect(c.productProgress[0].issued).toBe(1);
    expect(c.productProgress[0].pending).toBe(2);
    expect(c.reconciliationBlock).toContain('entregar');
  });
  it('blocks confirmation when an old product is still assigned', () => {
    const { c, api } = setup();
    c.state!.lines = [
      { productId: 7, quantity: 2, returnedQuantity: 0 },
      { productId: 8, quantity: 1, returnedQuantity: 0 },
    ] as any;
    expect(c.reconciliationBlock).toContain('cotización');
    c.reconcile();
    expect(api.act).not.toHaveBeenCalled();
  });
  it('blocks confirmation until the equipment is in service', () => {
    const { c, api } = setup();
    c.state!.technicalStatus = 'AUTORIZADA_PARA_EJECUCION';
    c.state!.lines = [{ productId: 7, quantity: 2, returnedQuantity: 0 }] as any;
    expect(c.reconciliationBlock).toContain('En servicio');
    c.reconcile();
    expect(api.act).not.toHaveBeenCalled();

    c.state!.technicalStatus = 'EN_EJECUCION';
    expect(c.reconciliationBlock).toBe('');
  });
  it('separates returned products from pieces held by the technician', () => {
    const { c } = setup();
    c.state!.lines = [
      { id: 1, productId: 7, quantity: 1, returnedQuantity: 0 },
      { id: 2, productId: 7, quantity: 1, returnedQuantity: 1 },
    ] as any;
    expect(c.activeLines.map((line) => line.id)).toEqual([1]);
    expect(c.returnedLines.map((line) => line.id)).toEqual([2]);
  });
  it('prevents selecting more serials than the remaining authorization', () => {
    const { c, api } = setup();
    c.openIssue(c.products[0]);
    c.selectedSerials = [10, 11, 12];
    c.submitIssue();
    expect(api.act).not.toHaveBeenCalled();
    expect(c.error).toContain('2');
  });
  it('requires an explicit review result instead of defaulting to usable', () => {
    const { c, api } = setup();
    c.openReview({ id: 9, serialCode: 'RAM-9' } as any);
    c.reason = 'Revisión terminada';
    c.submitReview();
    expect(api.act).not.toHaveBeenCalled();
    expect(c.error).toContain('resultado');
  });
  it('keeps stock loading distinct from an empty stock response', () => {
    const { c, api } = setup();
    const stock = new Subject<any>();
    api.available.and.returnValue(stock);
    c.openIssue(c.products[0]);
    expect(c.stockLoading).toBeTrue();
    stock.next({ serials: [], lots: [] });
    expect(c.stockLoading).toBeFalse();
    expect(c.serials.length).toBe(0);
  });
});
