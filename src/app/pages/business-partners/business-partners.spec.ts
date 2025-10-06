import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { BusinessPartners } from './business-partners';
import { BusinessPartnersApiService } from '../../services/business-partners-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';

class BusinessPartnersApiServiceStub {
  findAll() {
    return of({ data: [], total: 0, page: 1, limit: 10 });
  }
  create() {
    return of(null as any);
  }
  update() {
    return of(null as any);
  }
  remove() {
    return of(null as any);
  }
  bulkSoftDelete() {
    return of(null as any);
  }
}

class DocumentTypesApiServiceStub {
  findAll() {
    return of({ data: [], total: 0, page: 1, limit: 10 });
  }
}

describe('BusinessPartners', () => {
  let component: BusinessPartners;
  let fixture: ComponentFixture<BusinessPartners>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BusinessPartners],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: BusinessPartnersApiService, useClass: BusinessPartnersApiServiceStub },
        { provide: DocumentTypesApiService, useClass: DocumentTypesApiServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessPartners);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
