import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
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

  it('uses the deepest active route title and links to the current module', () => {
    const childRoute = {
      firstChild: null,
      snapshot: { data: { navbarTitle: 'GESTIÓN DE VENTAS' } },
    } as unknown as ActivatedRoute;
    component['activatedRoute'] = {
      firstChild: childRoute,
      snapshot: { data: {} },
    } as unknown as ActivatedRoute;

    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/ventas?tab=caja#resumen');

    component['updateNavigationContext']();

    expect(component.navbarTitle).toBe('GESTIÓN DE VENTAS');
    expect(component.navbarLink).toBe('/ventas');
  });

  it('uses safe defaults when the active route has no navbar metadata', () => {
    component['activatedRoute'] = {
      firstChild: null,
      snapshot: { data: {} },
    } as unknown as ActivatedRoute;

    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/');

    component['updateNavigationContext']();

    expect(component.navbarTitle).toBe('SISTEMA DE GESTIÓN');
    expect(component.navbarLink).toBe('/home');
  });
});
