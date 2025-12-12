import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Auditoria } from './auditoria';

describe('Auditoria', () => {
  let component: Auditoria;
  let fixture: ComponentFixture<Auditoria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Auditoria]
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
