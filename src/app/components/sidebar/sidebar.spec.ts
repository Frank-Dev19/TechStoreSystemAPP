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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
