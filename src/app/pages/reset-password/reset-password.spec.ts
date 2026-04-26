import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ResetPassword } from './reset-password';
import { AuthPasswordService } from '../../services/auth-password.service';

describe('ResetPassword', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;

  beforeEach(async () => {
    const authPasswordSpy = jasmine.createSpyObj<AuthPasswordService>('AuthPasswordService', [
      'verifyReset',
      'resetPassword',
    ]);
    authPasswordSpy.verifyReset.and.returnValue(of({ ok: true }));
    authPasswordSpy.resetPassword.and.returnValue(of({ ok: true } as never));

    await TestBed.configureTestingModule({
      declarations: [ResetPassword],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ uid: '1', token: 'token-ok' }),
            },
          },
        },
        { provide: AuthPasswordService, useValue: authPasswordSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
