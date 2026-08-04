import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ServiceOrderClientDecisionResult } from '../../models/service-orders/service-agreement';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';
import { ServiceOrderClientDecisionModalComponent } from './service-order-client-decision-modal';

describe('ServiceOrderClientDecisionModalComponent', () => {
  let fixture: ComponentFixture<ServiceOrderClientDecisionModalComponent>;
  let component: ServiceOrderClientDecisionModalComponent;
  const agreementService = jasmine.createSpyObj<ServiceOrderAgreementService>('ServiceOrderAgreementService', [
    'recordClientDecision',
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceOrderClientDecisionModalComponent],
      imports: [CommonModule, ReactiveFormsModule],
      providers: [{ provide: ServiceOrderAgreementService, useValue: agreementService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceOrderClientDecisionModalComponent);
    component = fixture.componentInstance;
    component.target = {
      commercialVersionId: 91,
      itemLabel: 'OS-03-08-2026-001-02 · Laptop Acer',
      versionNumber: 4,
      totalAmount: 260,
    };
    agreementService.recordClientDecision.calls.reset();
  });

  it('registra la decisión manual sobre la versión exacta y emite el resultado', () => {
    const result = { allAccepted: false } as ServiceOrderClientDecisionResult;
    agreementService.recordClientDecision.and.returnValue(of(result));
    const emitted = jasmine.createSpy('decisionRecorded');
    component.decisionRecorded.subscribe(emitted);
    component.form.setValue({
      decision: 'CHANGES_REQUESTED',
      channel: 'PHONE',
      observation: 'Pidió retirar un repuesto.',
    });

    component.submit();

    expect(agreementService.recordClientDecision).toHaveBeenCalledOnceWith({
      commercialVersionId: 91,
      decision: 'CHANGES_REQUESTED',
      channel: 'PHONE',
      observation: 'Pidió retirar un repuesto.',
    });
    expect(emitted).toHaveBeenCalledOnceWith(result);
  });

  it('muestra el mensaje del backend sin cerrar ni emitir una decisión', () => {
    agreementService.recordClientDecision.and.returnValue(
      throwError(() => ({ error: { message: 'La versión seleccionada ya no es la vigente.' } })),
    );
    const emitted = jasmine.createSpy('decisionRecorded');
    component.decisionRecorded.subscribe(emitted);

    component.submit();

    expect(component.errorMessage).toBe('La versión seleccionada ya no es la vigente.');
    expect(emitted).not.toHaveBeenCalled();
  });
});
