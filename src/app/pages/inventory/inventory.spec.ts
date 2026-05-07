import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { Inventory } from './inventory';
import { ProductsService } from '../../services/inventory/products.service';
import { CatalogsService } from '../../services/inventory/catalogs.service';
import { StockService } from '../../services/inventory/stock.service';
import { KardexService } from '../../services/inventory/kardex.service';
import { CountsHttpService } from '../../services/inventory/counts.service';
import { MovementsService } from '../../services/inventory/movements.service';
import { LotsService } from '../../services/inventory/lots.service';
import { SerialsService } from '../../services/inventory/serials.service';
import { CurrentUserService } from '../../services/current-user.service';
import { SuppliersApiService } from '../../services/suppliers-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';

describe('Inventory', () => {
  let component: Inventory;
  let fixture: ComponentFixture<Inventory>;
  let productsServiceMock: jasmine.SpyObj<ProductsService>;
  let catalogsServiceMock: jasmine.SpyObj<CatalogsService>;
  let stockServiceMock: jasmine.SpyObj<StockService>;
  let kardexServiceMock: jasmine.SpyObj<KardexService>;
  let countsServiceMock: jasmine.SpyObj<CountsHttpService>;
  let movementsServiceMock: jasmine.SpyObj<MovementsService>;
  let lotsServiceMock: jasmine.SpyObj<LotsService>;
  let serialsServiceMock: jasmine.SpyObj<SerialsService>;
  let suppliersApiMock: jasmine.SpyObj<SuppliersApiService>;
  let documentTypesApiMock: jasmine.SpyObj<DocumentTypesApiService>;

  const remoteProductsResponse = [
    { id: 1, sku: 'SKU-001', name: 'Laptop Pro' },
    { id: 2, sku: 'MON-002', name: 'Monitor 24' },
  ];

  beforeEach(async () => {
    productsServiceMock = jasmine.createSpyObj<ProductsService>('ProductsService', ['listWithFilter']);
    productsServiceMock.listWithFilter.and.returnValue(of({ data: remoteProductsResponse, total: remoteProductsResponse.length }) as any);

    catalogsServiceMock = jasmine.createSpyObj<CatalogsService>('CatalogsService', ['listCategories', 'listCategoriesWithFilter', 'listUnits', 'listUnitsWithFilter']);
    catalogsServiceMock.listCategories.and.returnValue(of([]) as any);
    catalogsServiceMock.listCategoriesWithFilter.and.returnValue(of({ data: [], total: 0 }) as any);
    catalogsServiceMock.listUnits.and.returnValue(of([]) as any);
    catalogsServiceMock.listUnitsWithFilter.and.returnValue(of({ data: [], total: 0 }) as any);

    stockServiceMock = jasmine.createSpyObj<StockService>('StockService', ['listPaged', 'getCurrentStock']);
    stockServiceMock.listPaged.and.returnValue(of({ data: [], total: 0, metrics: {} }) as any);
    stockServiceMock.getCurrentStock.and.returnValue(of({ total_qty: 0, avg_cost: 0 }) as any);

    kardexServiceMock = jasmine.createSpyObj<KardexService>('KardexService', ['list']);
    kardexServiceMock.list.and.returnValue(of({ data: [], total: 0 }) as any);

    countsServiceMock = jasmine.createSpyObj<CountsHttpService>('CountsHttpService', ['list']);
    countsServiceMock.list.and.returnValue(of([]) as any);

    movementsServiceMock = jasmine.createSpyObj<MovementsService>('MovementsService', ['create', 'entry', 'exit', 'adjustment']);
    movementsServiceMock.create.and.returnValue(of({}) as any);
    movementsServiceMock.entry.and.returnValue(of({}) as any);
    movementsServiceMock.exit.and.returnValue(of({}) as any);
    movementsServiceMock.adjustment.and.returnValue(of({}) as any);

    lotsServiceMock = jasmine.createSpyObj<LotsService>('LotsService', ['listByProduct']);
    lotsServiceMock.listByProduct.and.returnValue(of([]) as any);
    serialsServiceMock = jasmine.createSpyObj<SerialsService>('SerialsService', ['list', 'byMovement', 'resolve']);
    serialsServiceMock.list.and.returnValue(of([]) as any);
    serialsServiceMock.byMovement.and.returnValue(of([]) as any);
    serialsServiceMock.resolve.and.returnValue(of([]) as any);
    suppliersApiMock = jasmine.createSpyObj<SuppliersApiService>('SuppliersApiService', ['findAll']);
    suppliersApiMock.findAll.and.returnValue(of({ data: [] }) as any);
    documentTypesApiMock = jasmine.createSpyObj<DocumentTypesApiService>('DocumentTypesApiService', ['findAll']);
    documentTypesApiMock.findAll.and.returnValue(of({ data: [] }) as any);

    await TestBed.configureTestingModule({
      declarations: [Inventory],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: StockService, useValue: stockServiceMock },
        { provide: KardexService, useValue: kardexServiceMock },
        { provide: CountsHttpService, useValue: countsServiceMock },
        { provide: MovementsService, useValue: movementsServiceMock },
        { provide: LotsService, useValue: lotsServiceMock },
        { provide: SerialsService, useValue: serialsServiceMock },
        { provide: CurrentUserService, useValue: { value: { id: 1, name: 'Test User' } } },
        { provide: SuppliersApiService, useValue: suppliersApiMock },
        { provide: DocumentTypesApiService, useValue: documentTypesApiMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inventory);
    component = fixture.componentInstance;
    spyOn(component, 'ngOnInit').and.stub();
    fixture.detectChanges();
    productsServiceMock.listWithFilter.calls.reset();
    stockServiceMock.getCurrentStock.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require at least 2 characters before searching entry products', fakeAsync(() => {
    component.entryProductSearchText = 's';

    component.onEntryProductSearch();
    tick(300);

    expect(productsServiceMock.listWithFilter).not.toHaveBeenCalled();
    expect(component.filteredEntryProducts).toEqual([] as any);
    expect(component.showEntryProductDropdown).toBeTrue();
  }));

  it('should debounce and reuse cached remote results across operations', fakeAsync(() => {
    component.entryProductSearchText = '  sku  ';

    component.onEntryProductSearch();
    tick(299);
    expect(productsServiceMock.listWithFilter).not.toHaveBeenCalled();

    tick(1);
    expect(productsServiceMock.listWithFilter).toHaveBeenCalledOnceWith({ search: 'sku', page: 1, limit: 20 });
    expect(component.filteredEntryProducts).toEqual(remoteProductsResponse as any);

    component.exitProductSearchText = 'sku';
    component.onExitProductSearch();
    tick(300);

    expect(productsServiceMock.listWithFilter).toHaveBeenCalledTimes(1);
    expect(component.filteredExitProducts).toEqual(remoteProductsResponse as any);
  }));

  it('should load current stock after selecting an exit product from remote search', fakeAsync(() => {
    const stockInfo = { total_qty: 7, avg_cost: 1550.5 };
    stockServiceMock.getCurrentStock.and.returnValue(of(stockInfo) as any);

    component.selectExitProduct(remoteProductsResponse[0] as any);
    tick();

    expect(stockServiceMock.getCurrentStock).toHaveBeenCalledOnceWith(1);
    expect(component.exitForm.product_id).toBe(1);
    expect(component.selectedProductExit).toEqual(jasmine.objectContaining({
      id: 1,
      stock_qty: 7,
      avg_cost: 1550.5,
    }) as any);
  }));

  it('should load current stock after selecting an adjustment product from remote search', fakeAsync(() => {
    const stockInfo = { total_qty: 3, avg_cost: 250 };
    stockServiceMock.getCurrentStock.and.returnValue(of(stockInfo) as any);

    component.selectAdjProduct(remoteProductsResponse[1] as any);
    tick();

    expect(stockServiceMock.getCurrentStock).toHaveBeenCalledOnceWith(2);
    expect(component.adjustmentForm.product_id).toBe(2);
    expect(component.selectedProductAdjustment).toEqual(jasmine.objectContaining({
      id: 2,
      stock_qty: 3,
      avg_cost: 250,
    }) as any);
  }));
});
