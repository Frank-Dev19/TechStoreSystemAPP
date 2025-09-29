import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { DocumentTypes } from './document-types';
import { DocumentTypesApiService } from '../../services/document-types-api.service';

class DocumentTypesApiServiceStub {
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
  restore() {
    return of(null as any);
  }
  hardRemove() {
    return of(null as any);
  }
}

describe('DocumentTypes', () => {
  let component: DocumentTypes;
  let fixture: ComponentFixture<DocumentTypes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocumentTypes],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: DocumentTypesApiService, useClass: DocumentTypesApiServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentTypes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
