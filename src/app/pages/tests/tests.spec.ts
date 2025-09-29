import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tests } from './tests';

describe('Tests', () => {
  let component: Tests;
  let fixture: ComponentFixture<Tests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Tests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
