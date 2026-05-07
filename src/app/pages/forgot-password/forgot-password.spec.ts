import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { ForgotPassword } from './forgot-password';
import { AuthPasswordService } from '../../services/auth-password.service';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;

  beforeEach(async () => {
    const authPasswordSpy = jasmine.createSpyObj<AuthPasswordService>('AuthPasswordService', [
      'forgotPassword',
    ]);
    authPasswordSpy.forgotPassword.and.returnValue(of({ message: 'ok' }));

    await TestBed.configureTestingModule({
      declarations: [ForgotPassword],
      imports: [ReactiveFormsModule],
      providers: [{ provide: AuthPasswordService, useValue: authPasswordSpy }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
