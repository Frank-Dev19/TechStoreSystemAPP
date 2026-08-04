import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ServiceOrderClientDecisionResult } from '../../models/service-orders/service-agreement';
import {
  ServiceOrderClientDecisionChannel,
  ServiceOrderClientDecisionType,
} from '../../models/service-orders/service-agreement-request';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';

export interface ServiceOrderClientDecisionTarget {
  commercialVersionId: number;
  itemLabel: string;
  versionNumber: number;
  totalAmount: number;
}

@Component({
  selector: 'app-service-order-client-decision-modal',
  standalone: false,
  templateUrl: './service-order-client-decision-modal.html',
  styleUrls: ['./service-order-client-decision-modal.scss'],
})
export class ServiceOrderClientDecisionModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly agreementService = inject(ServiceOrderAgreementService);

  @Input({ required: true }) target!: ServiceOrderClientDecisionTarget;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly decisionRecorded = new EventEmitter<ServiceOrderClientDecisionResult>();

  readonly form = this.formBuilder.group({
    decision: this.formBuilder.nonNullable.control<ServiceOrderClientDecisionType>('ACCEPTED', Validators.required),
    channel: this.formBuilder.nonNullable.control<ServiceOrderClientDecisionChannel>('WHATSAPP', Validators.required),
    observation: this.formBuilder.nonNullable.control('', Validators.maxLength(1000)),
  });

  isSaving = false;
  errorMessage = '';

  close(): void {
    if (!this.isSaving) {
      this.closed.emit();
    }
  }

  submit(): void {
    if (this.form.invalid || !this.target?.commercialVersionId) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const observation = value.observation.trim();
    this.errorMessage = '';
    this.isSaving = true;
    this.agreementService
      .recordClientDecision({
        commercialVersionId: this.target.commercialVersionId,
        decision: value.decision,
        channel: value.channel,
        ...(observation ? { observation } : {}),
      })
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (result) => this.decisionRecorded.emit(result),
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private resolveErrorMessage(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } } | null;
    const backendMessage = response?.error?.message;
    if (Array.isArray(backendMessage)) {
      return backendMessage.join(' ');
    }
    return backendMessage || 'No pudimos registrar la decisión del cliente.';
  }
}
