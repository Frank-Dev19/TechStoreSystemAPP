import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { Navbar } from './navbar';
import { LoginService } from '../../services/login-service.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, of } from 'rxjs';
import { CurrentUserService } from '../../services/current-user.service';
import { ProfileService } from '../../services/profile.service';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    const loginServiceSpy = jasmine.createSpyObj<LoginService>('LoginService', ['logout']);
    const modalSpy = jasmine.createSpyObj<NgbModal>('NgbModal', ['open', 'dismissAll']);
    const currentUserServiceStub = {
      user$: new BehaviorSubject(null),
      value: null,
      restoreFromStorage: jasmine.createSpy('restoreFromStorage'),
      set: jasmine.createSpy('set'),
      clear: jasmine.createSpy('clear'),
    };
    const profileServiceSpy = jasmine.createSpyObj<ProfileService>('ProfileService', ['getMe']);
    profileServiceSpy.getMe.and.returnValue(of({} as never));

    await TestBed.configureTestingModule({
      declarations: [Navbar],
      imports: [RouterTestingModule],
      providers: [
        { provide: LoginService, useValue: loginServiceSpy },
        { provide: NgbModal, useValue: modalSpy },
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: ProfileService, useValue: profileServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    spyOn(component, 'ngOnInit').and.stub();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
