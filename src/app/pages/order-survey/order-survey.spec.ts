import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PublicOrderSurveyService } from '../../services/service-orders/public-order-survey.service';
import { OrderSurvey } from './order-survey';

describe('OrderSurvey', () => {
  let fixture: ComponentFixture<OrderSurvey>;
  const surveyService = {
    get: jasmine.createSpy('get'),
    submit: jasmine.createSpy('submit'),
  };

  beforeEach(async () => {
    surveyService.get.calls.reset();
    surveyService.submit.calls.reset();
    surveyService.get.and.returnValue(of({
      status: 'AVAILABLE',
      orderCode: 'SO-1',
      clientName: 'Sergio',
      equipmentSummary: '2 equipos',
      expiresAt: '2026-08-31T00:00:00.000Z',
    }));
    surveyService.submit.and.returnValue(of({ status: 'ANSWERED' }));

    await TestBed.configureTestingModule({
      declarations: [OrderSurvey],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PublicOrderSurveyService, useValue: surveyService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '7.signature' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderSurvey);
  });

  it('carga una encuesta pública por orden', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.state).toBe('available');
    expect(fixture.nativeElement.textContent).toContain('Orden SO-1');
    expect(fixture.nativeElement.textContent).toContain('2 equipos');
  });

  it('registra una sola respuesta completa', () => {
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({
      overallRating: 5,
      attentionRating: 4,
      serviceQualityRating: 5,
      comment: 'Muy buena atención',
    });
    fixture.componentInstance.submit();
    expect(surveyService.submit).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.state).toBe('answered');
  });

  it('muestra el estado vencido', () => {
    surveyService.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 410 })));
    fixture.detectChanges();
    expect(fixture.componentInstance.state).toBe('expired');
  });
});
