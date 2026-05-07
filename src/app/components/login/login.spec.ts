import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { Login } from './login';
import { LoginService } from '../../services/login-service.service';
import { TriggerService } from '../../services/trigger-service.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    const loginServiceSpy = jasmine.createSpyObj<LoginService>('LoginService', ['login']);
    loginServiceSpy.login.and.returnValue(of({ accessToken: 'test-token', user: {} as never }));

    const triggerServiceSpy = jasmine.createSpyObj<TriggerService>('TriggerService', [
      'fireShowLoader',
      'fireHideLoader',
    ]);

    await TestBed.configureTestingModule({
      declarations: [Login],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: LoginService, useValue: loginServiceSpy },
        { provide: TriggerService, useValue: triggerServiceSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
