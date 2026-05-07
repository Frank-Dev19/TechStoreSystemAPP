import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Auditoria } from './auditoria';
import { AuditService } from '../../services/audit/audit.service';
import { UsersApiService } from '../../services/rbac/users-api.service';

describe('Auditoria', () => {
  let component: Auditoria;
  let fixture: ComponentFixture<Auditoria>;

  beforeEach(async () => {
    spyOn(Auditoria.prototype, 'ngOnInit').and.stub();

    await TestBed.configureTestingModule({
      declarations: [Auditoria],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: AuditService, useValue: {} },
        { provide: UsersApiService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Auditoria);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
