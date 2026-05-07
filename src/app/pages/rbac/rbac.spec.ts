import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { Rbac } from './rbac';
import { PermissionModulesApiService } from '../../services/rbac/permission-modules-api.service';
import { PermissionsApiService } from '../../services/rbac/permissions-api.service';
import { RolesApiService } from '../../services/rbac/roles-api.service';
import { UsersApiService } from '../../services/rbac/users-api.service';
import { UserPermsApiService } from '../../services/rbac/user-perms-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';

describe('Rbac', () => {
  let component: Rbac;
  let fixture: ComponentFixture<Rbac>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Rbac],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: PermissionModulesApiService, useValue: { findAll: () => of([]) } },
        { provide: PermissionsApiService, useValue: { findAll: () => of([]) } },
        { provide: RolesApiService, useValue: { findAll: () => of([]) } },
        { provide: UsersApiService, useValue: { findAll: () => of([]) } },
        { provide: UserPermsApiService, useValue: { listForUser: () => of([]) } },
        { provide: DocumentTypesApiService, useValue: { findAll: () => of({ data: [] }) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rbac);
    component = fixture.componentInstance;
    spyOn(component, 'ngOnInit').and.stub();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
