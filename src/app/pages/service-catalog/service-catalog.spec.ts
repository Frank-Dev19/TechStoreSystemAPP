import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ServiceCatalog } from './service-catalog';
import { ServiceService } from '../../services/service-catalog/service.service';
import { ServiceCategoryService } from '../../services/service-catalog/service-category.service';

describe('ServiceCatalog', () => {
  let component: ServiceCatalog;
  let fixture: ComponentFixture<ServiceCatalog>;

  const serviceApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 10 })),
    create: jasmine.createSpy('create').and.returnValue(of({} as any)),
    update: jasmine.createSpy('update').and.returnValue(of({} as any)),
    softDelete: jasmine.createSpy('softDelete').and.returnValue(of({ ok: true })),
    bulkSoftDelete: jasmine.createSpy('bulkSoftDelete').and.returnValue(of({ ok: true })),
    restore: jasmine.createSpy('restore').and.returnValue(of({ ok: true })),
    bulkRestore: jasmine.createSpy('bulkRestore').and.returnValue(of({ ok: true })),
  };

  const categoryApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 10 })),
    create: jasmine.createSpy('create').and.returnValue(of({} as any)),
    update: jasmine.createSpy('update').and.returnValue(of({} as any)),
    softDelete: jasmine.createSpy('softDelete').and.returnValue(of({ ok: true })),
    bulkSoftDelete: jasmine.createSpy('bulkSoftDelete').and.returnValue(of({ ok: true })),
    restore: jasmine.createSpy('restore').and.returnValue(of({ ok: true })),
    bulkRestore: jasmine.createSpy('bulkRestore').and.returnValue(of({ ok: true })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceCatalog],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ServiceService, useValue: serviceApiStub },
        { provide: ServiceCategoryService, useValue: categoryApiStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCatalog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
