import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Pricing } from './pricing';
import { PricingConfigApiService } from '../../services/pricing/pricing-config-api.service';
import { TaxConfigApiService } from '../../services/pricing/tax-config-api.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { CurrentUserService } from '../../services/current-user.service';

describe('Pricing', () => {
  let component: Pricing;
  let fixture: ComponentFixture<Pricing>;

  beforeEach(async () => {
    spyOn(Pricing.prototype, 'ngOnInit').and.stub();

    await TestBed.configureTestingModule({
      declarations: [Pricing],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: PricingConfigApiService, useValue: {} },
        { provide: TaxConfigApiService, useValue: {} },
        { provide: PricingQueryApiService, useValue: {} },
        { provide: PricingProductsApiService, useValue: {} },
        { provide: SalesApiService, useValue: {} },
        { provide: CurrentUserService, useValue: { value: { id: 1, name: 'Test User' } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pricing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
