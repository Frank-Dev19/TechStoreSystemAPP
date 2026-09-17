import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';

import { Sidebar } from './sidebar';
import { CurrentUserService } from '../../services/current-user.service';
import { ProfileService } from '../../services/profile.service';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    const user$ = new BehaviorSubject(null);
    const currentUserServiceStub = {
      user$,
      value: { id: 1 },
      restoreFromStorage: jasmine.createSpy('restoreFromStorage'),
      set: jasmine.createSpy('set'),
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(false),
      hasAnyPermission: jasmine.createSpy('hasAnyPermission').and.returnValue(false),
    };

    const profileServiceSpy = jasmine.createSpyObj<ProfileService>('ProfileService', ['getMe']);
    profileServiceSpy.getMe.and.returnValue(of({} as never));

    await TestBed.configureTestingModule({
      declarations: [Sidebar],
      imports: [RouterTestingModule],
      providers: [
        { provide: CurrentUserService, useValue: currentUserServiceStub },
        { provide: ProfileService, useValue: profileServiceSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows every navigation entry for admin even with an empty permission snapshot', () => {
    component.authenticatedUser = { id: 1, roles: [{ name: 'admin' }], effectivePermissions: [] } as any;
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(link => link.getAttribute('href'));
    for (const route of ['/clientes', '/proveedores', '/ventas', '/garantias', '/reception-panel', '/technician-panel', '/supervisor-panel', '/internal-deliveries']) expect(links).toContain(route);
    expect(component.can('navigation.inventory-manage')).toBeTrue();
    expect(component.canAny('navigation.inventory-kardex')).toBeTrue();
  });

  it('keeps permission checks for other roles', () => {
    component.authenticatedUser = { id: 2, roles: [{ name: 'technician' }] } as any;
    expect(component.can('navigation.sales')).toBeFalse();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
