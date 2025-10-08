import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rbac } from './rbac';

describe('Rbac', () => {
  let component: Rbac;
  let fixture: ComponentFixture<Rbac>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Rbac]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rbac);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
