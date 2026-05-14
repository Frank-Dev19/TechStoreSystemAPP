import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { DocumentTypeKind } from '../../models/document-types/document-types-request';
import { ClientKind } from '../../models/clients-request';
import { ClientsApiService } from '../../services/clients-api.service';
import { CurrentUserService } from '../../services/current-user.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { DEFAULT_PHONE_COUNTRY } from '../../utils/phone.util';
import { Clients } from './clients';

describe('Clients', () => {
  let component: Clients;
  let fixture: ComponentFixture<Clients>;

  const clientsApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(of({ data: [], total: 0, page: 1, limit: 10 })),
    create: jasmine.createSpy('create').and.returnValue(of({ id: 1 })),
    update: jasmine.createSpy('update').and.returnValue(of({ id: 1 })),
    remove: jasmine.createSpy('remove').and.returnValue(of({ ok: true })),
    restore: jasmine.createSpy('restore').and.returnValue(of({ ok: true })),
    bulkSoftDelete: jasmine.createSpy('bulkSoftDelete').and.returnValue(of({ ok: true })),
    bulkRestore: jasmine.createSpy('bulkRestore').and.returnValue(of({ ok: true })),
    validateImport: jasmine.createSpy('validateImport').and.returnValue(of({ rows: [], summary: {} })),
    commitImport: jasmine.createSpy('commitImport').and.returnValue(of({ createdCount: 0, skippedCount: 0, summary: { totalRows: 0, createdRows: 0, skippedRows: 0, failedRows: 0 } })),
  };

  const documentTypesApiStub = {
    findAll: jasmine.createSpy('findAll').and.returnValue(
      of({
        data: [
          { id: 1, name: 'DNI', digits: 8, kind: DocumentTypeKind.PERSON },
          { id: 2, name: 'RUC', digits: 11, kind: DocumentTypeKind.COMPANY },
          { id: 3, name: 'Doc 11', digits: 11, kind: DocumentTypeKind.PERSON },
        ],
      }),
    ),
  };

  const currentUserServiceStub = {
    restoreFromStorage: jasmine.createSpy('restoreFromStorage'),
    value: { roles: [] },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Clients],
      imports: [CommonModule, FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApiStub },
        { provide: DocumentTypesApiService, useValue: documentTypesApiStub },
        { provide: CurrentUserService, useValue: currentUserServiceStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Clients);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    clientsApiStub.create.calls.reset();
    clientsApiStub.update.calls.reset();
  });

  it('usa Perú por defecto en la captura telefónica principal', () => {
    expect(component.partnerForm.get('phoneCountry')?.value).toEqual(DEFAULT_PHONE_COUNTRY);
  });

  it('crea empresa con primer contacto en el mismo payload', () => {
    component.partnerForm.patchValue({
      name: 'Empresa SAC',
      kind: ClientKind.COMPANY,
      documentTypeId: 2,
      documentNumber: '12345678901',
      tradeName: 'Empresa',
      email: 'ventas@empresa.com',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '987654321',
      contactName: 'Ana Contacto',
      contactEmail: 'ana@empresa.com',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '900111222',
    });

    component.savePartner();

    expect(clientsApiStub.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        email: 'ventas@empresa.com',
        phone: '+51987654321',
        contacts: [
          jasmine.objectContaining({
            name: 'Ana Contacto',
            email: 'ana@empresa.com',
            phone: '+51900111222',
            isPrimary: true,
          }),
        ],
      }),
    );
  });

  it('bloquea crear empresa sin contacto principal', () => {
    component.partnerForm.patchValue({
      name: 'Empresa SAC',
      kind: ClientKind.COMPANY,
      documentTypeId: 2,
      documentNumber: '12345678901',
      tradeName: 'Empresa',
      contactName: '',
      contactPhone: '',
    });

    component.savePartner();

    expect(clientsApiStub.create).not.toHaveBeenCalled();
    expect(component.partnerForm.invalid).toBeTrue();
  });

  it('muestra gestión de contactos solo para clientes empresa', () => {
    expect(
      component.canManageContacts({
        id: 10,
        companyId: 1,
        kind: ClientKind.COMPANY,
        name: 'Empresa SAC',
        documentTypeId: 2,
        documentNumber: '12345678901',
      } as any),
    ).toBeTrue();

    expect(
      component.canManageContacts({
        id: 11,
        companyId: 1,
        kind: ClientKind.PERSON,
        name: 'Juan Perez',
        documentTypeId: 1,
        documentNumber: '12345678',
      } as any),
    ).toBeFalse();
  });

  it('abre el drawer de contactos con la empresa seleccionada', () => {
    const company = {
      id: 20,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Empresa SAC',
      documentTypeId: 2,
      documentNumber: '12345678901',
      contacts: [{ id: 201, clientId: 20, name: 'Principal', phone: '+51900111222', isPrimary: true }],
    } as any;

    component.openContactsDrawer(company);

    expect(component.showContactsDrawer).toBeTrue();
    expect(component.contactsDrawerClient?.id).toBe(20);
    expect(component.getDrawerContacts().length).toBe(1);
  });

  it('prellena el contacto principal al editar una empresa', () => {
    const company = {
      id: 23,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Carter SAC',
      tradeName: 'Carter',
      documentTypeId: 2,
      documentNumber: '20609766108',
      contacts: [
        {
          id: 501,
          clientId: 23,
          name: 'Debora Flores',
          email: 'debora@carter.com',
          phone: '+51900111222',
          isPrimary: true,
          isActive: true,
        },
      ],
    } as any;

    component.openEditModal(company);

    expect(component.partnerForm.get('contactName')?.value).toBe('Debora Flores');
    expect(component.partnerForm.get('contactEmail')?.value).toBe('debora@carter.com');
    expect(component.partnerForm.get('contactPhone')?.value).toBe('+51900111222');
    expect(component.partnerForm.get('contactPhoneCountry')?.value).toEqual(DEFAULT_PHONE_COUNTRY);
    expect(component.partnerForm.get('contactPhoneNationalNumber')?.value).toBe('900111222');
  });

  it('usa fallback del cliente al editar empresa sin contactos cargados', () => {
    const company = {
      id: 24,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Carter SAC',
      tradeName: 'Carter',
      documentTypeId: 2,
      documentNumber: '20609766108',
      email: 'principal@carter.com',
      phone: '+51988777666',
      contacts: [],
    } as any;

    component.openEditModal(company);

    expect(component.partnerForm.get('email')?.value).toBe('principal@carter.com');
    expect(component.partnerForm.get('phone')?.value).toBe('+51988777666');
    expect(component.partnerForm.get('phoneNationalNumber')?.value).toBe('988777666');
    expect(component.partnerForm.get('contactName')?.value).toBe('Carter SAC');
    expect(component.partnerForm.get('contactEmail')?.value).toBe('principal@carter.com');
    expect(component.partnerForm.get('contactPhone')?.value).toBe('+51988777666');
    expect(component.partnerForm.get('contactPhoneNationalNumber')?.value).toBe('988777666');
  });

  it('hidrata por separado teléfono de empresa y teléfono del contacto al editar empresa', () => {
    const company = {
      id: 25,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Carter SAC',
      tradeName: 'Carter',
      documentTypeId: 2,
      documentNumber: '20609766108',
      email: 'ventas@carter.com',
      phone: '+51987654321',
      contacts: [
        {
          id: 701,
          clientId: 25,
          name: 'Debora Flores',
          email: 'debora@carter.com',
          phone: '+51900111222',
          isPrimary: true,
          isActive: true,
        },
      ],
    } as any;

    component.openEditModal(company);

    expect(component.partnerForm.get('email')?.value).toBe('ventas@carter.com');
    expect(component.partnerForm.get('phone')?.value).toBe('+51987654321');
    expect(component.partnerForm.get('phoneNationalNumber')?.value).toBe('987654321');
    expect(component.partnerForm.get('contactName')?.value).toBe('Debora Flores');
    expect(component.partnerForm.get('contactEmail')?.value).toBe('debora@carter.com');
    expect(component.partnerForm.get('contactPhone')?.value).toBe('+51900111222');
    expect(component.partnerForm.get('contactPhoneNationalNumber')?.value).toBe('900111222');
  });

  it('actualiza empresa enviando datos top-level y contacto principal en el mismo payload', () => {
    const company = {
      id: 26,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Carter SAC',
      tradeName: 'Carter',
      documentTypeId: 2,
      documentNumber: '20609766108',
      email: 'ventas@carter.com',
      phone: '+51987654321',
      contacts: [
        {
          id: 801,
          clientId: 26,
          name: 'Debora Flores',
          email: 'debora@carter.com',
          phone: '+51900111222',
          isPrimary: true,
          isActive: true,
        },
      ],
    } as any;

    component.openEditModal(company);
    component.partnerForm.patchValue({
      email: 'facturacion@carter.com',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '999888777',
      contactName: 'Debora Flores',
      contactEmail: 'postventa@carter.com',
      contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
      contactPhoneNationalNumber: '900111333',
    });

    component.savePartner();

    expect(clientsApiStub.update).toHaveBeenCalledWith(
      26,
      jasmine.objectContaining({
        email: 'facturacion@carter.com',
        phone: '+51999888777',
        contacts: [
          jasmine.objectContaining({
            name: 'Debora Flores',
            email: 'postventa@carter.com',
            phone: '+51900111333',
            isPrimary: true,
          }),
        ],
      }),
    );
  });

  it('agrega contactos nuevos desde el drawer sin perder los existentes', () => {
    const company = {
      id: 21,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Empresa SAC',
      documentTypeId: 2,
      documentNumber: '12345678901',
      contacts: [{ id: 301, clientId: 21, name: 'Principal', phone: '+51900111222', isPrimary: true, isActive: true }],
    } as any;

    clientsApiStub.update.and.returnValue(
      of({
        ...company,
        contacts: [
          { id: 301, clientId: 21, name: 'Principal', phone: '+51900111222', isPrimary: true, isActive: true },
          { id: 302, clientId: 21, name: 'Nuevo contacto', phone: '+51988777666', email: 'nuevo@empresa.com', isPrimary: false, isActive: true },
        ],
      }),
    );

    component.openContactsDrawer(company);
    component.contactsDrawerForm.patchValue({
      name: 'Nuevo contacto',
      email: 'nuevo@empresa.com',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      phoneNationalNumber: '988777666',
      isPrimary: false,
    });

    component.saveDrawerContact();

    expect(clientsApiStub.update).toHaveBeenCalledWith(
      21,
      jasmine.objectContaining({
        contacts: [
          jasmine.objectContaining({ id: 301, name: 'Principal', isPrimary: true }),
          jasmine.objectContaining({ name: 'Nuevo contacto', email: 'nuevo@empresa.com', phone: '+51988777666', isPrimary: false }),
        ],
      }),
    );
  });

  it('permite cambiar el contacto principal desde el drawer', () => {
    const company = {
      id: 22,
      companyId: 1,
      kind: ClientKind.COMPANY,
      name: 'Empresa SAC',
      documentTypeId: 2,
      documentNumber: '12345678901',
      contacts: [
        { id: 401, clientId: 22, name: 'Principal', phone: '+51900111222', isPrimary: true, isActive: true },
        { id: 402, clientId: 22, name: 'Operaciones', phone: '+51977666555', isPrimary: false, isActive: true },
      ],
    } as any;

    clientsApiStub.update.and.returnValue(of(company));

    component.openContactsDrawer(company);
    component.setDrawerPrimaryContact(402);

    expect(clientsApiStub.update).toHaveBeenCalledWith(
      22,
      jasmine.objectContaining({
        contacts: [
          jasmine.objectContaining({ id: 401, isPrimary: false }),
          jasmine.objectContaining({ id: 402, isPrimary: true }),
        ],
      }),
    );
  });

  it('prefiere documentType.kind sobre la heurística legacy', () => {
    component.partnerForm.patchValue({
      documentTypeId: 3,
    });

    expect(component.partnerForm.get('kind')?.value).toBe(ClientKind.PERSON);
  });

  it('usa fallback legacy si el document type todavía no trae kind', () => {
    component.documentTypes = [
      { id: 4, name: 'RUC LEGACY', digits: 11, description: 'legacy', kind: null } as any,
    ];

    component.partnerForm.patchValue({
      documentTypeId: 4,
    });

    expect(component.partnerForm.get('kind')?.value).toBe(ClientKind.COMPANY);
  });
});
