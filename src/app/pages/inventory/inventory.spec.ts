import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Inventory],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ProductsService, useValue: {} },
        { provide: CatalogsService, useValue: {} },
        { provide: StockService, useValue: {} },
        { provide: KardexService, useValue: {} },
        { provide: CountsHttpService, useValue: {} },
        { provide: MovementsService, useValue: {} },
        { provide: LotsService, useValue: {} },
        { provide: SerialsService, useValue: {} },
        { provide: CurrentUserService, useValue: { value: { id: 1, name: 'Test User' } } },
        { provide: SuppliersApiService, useValue: {} },
        { provide: DocumentTypesApiService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inventory);
    component = fixture.componentInstance;
    spyOn(component, 'ngOnInit').and.stub();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
