import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';

import { Perfil } from './perfil';
import { CurrentUserService } from '../../services/current-user.service';
import { ProfileService } from '../../services/profile.service';

describe('Perfil', () => {
  let component: Perfil;
  let fixture: ComponentFixture<Perfil>;

  beforeEach(async () => {
    const currentUserServiceStub = {
      value: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        createdAt: new Date().toISOString(),
        documentType: { name: 'DNI' },
        documentNumber: '12345678',
      },
      user$: new BehaviorSubject(null),
    };

    const profileServiceSpy = jasmine.createSpyObj<ProfileService>('ProfileService', [
      'getMe',
      'setCurrent',
      'updateMe',
      'changePassword',
    ]);
    profileServiceSpy.getMe.and.returnValue(of(currentUserServiceStub.value as never));
    profileServiceSpy.updateMe.and.returnValue(of(currentUserServiceStub.value as never));
    profileServiceSpy.changePassword.and.returnValue(of({} as never));

    await TestBed.configureTestingModule({
      declarations: [Perfil],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: ProfileService, useValue: profileServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Perfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
