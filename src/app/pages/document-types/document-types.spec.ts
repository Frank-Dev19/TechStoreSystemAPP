import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { DocumentTypes } from './document-types';
import { DocumentTypeKind } from '../../models/document-types/document-types-request';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { CurrentUserService } from '../../services/current-user.service';

describe('DocumentTypes', () => {
  let component: DocumentTypes;
  let fixture: ComponentFixture<DocumentTypes>;
  const apiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 10 })),
    create: jasmine.createSpy('create').and.returnValue(of(null as any)),
    update: jasmine.createSpy('update').and.returnValue(of(null as any)),
    delete: jasmine.createSpy('delete').and.returnValue(of(null as any)),
    restore: jasmine.createSpy('restore').and.returnValue(of(null as any)),
    bulkDelete: jasmine.createSpy('bulkDelete').and.returnValue(of(null as any)),
    bulkRestore: jasmine.createSpy('bulkRestore').and.returnValue(of(null as any)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocumentTypes],
      imports: [CommonModule, FormsModule, ReactiveFormsModule],
      providers: [
        { provide: DocumentTypesApiService, useValue: apiStub },
        {
          provide: CurrentUserService,
          useValue: {
            restoreFromStorage: jasmine.createSpy('restoreFromStorage'),
            hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentTypes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    apiStub.create.calls.reset();
    apiStub.update.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('envía kind obligatorio al crear un tipo de documento', () => {
    component.documentTypeForm.patchValue({
      name: 'RUC',
      kind: DocumentTypeKind.COMPANY,
      sunatCode: '6',
      digits: 11,
      description: 'Documento empresa',
    });

    component.saveDocumentType();

    expect(apiStub.create).toHaveBeenCalledWith({
      name: 'RUC',
      kind: DocumentTypeKind.COMPANY,
      sunatCode: '6',
      digits: 11,
      description: 'Documento empresa',
    });
  });

  it('bloquea guardar si no se selecciona kind', () => {
    component.documentTypeForm.patchValue({
      name: 'RUC',
      kind: null,
      digits: 11,
      description: 'Documento empresa',
    });

    component.saveDocumentType();

    expect(apiStub.create).not.toHaveBeenCalled();
    expect(component.documentTypeForm.invalid).toBeTrue();
  });

  it('hidrata kind al editar un tipo de documento existente', () => {
    component.openEditModal({
      id: 9,
      name: 'DNI',
      kind: DocumentTypeKind.PERSON,
      digits: 8,
      description: 'Documento natural',
    });

    expect(component.documentTypeForm.get('kind')?.value).toBe(DocumentTypeKind.PERSON);
  });
});
