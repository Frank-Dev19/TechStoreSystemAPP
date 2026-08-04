import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ServiceOrderAgreement,
  ServiceOrderItemCommercialLine,
} from '../../models/service-orders/service-agreement';
import { ServiceOrderCommercialRevisionLineRequest } from '../../models/service-orders/service-agreement-request';
import { ServiceOrderAgreementService } from '../../services/service-orders/service-agreement.service';

export interface ServiceOrderLineDiscountTarget {
  serviceOrderId: number;
  serviceOrderItemId: number;
  itemLabel: string;
  baseVersionId: number;
  versionNumber: number;
  notes: string | null;
  lines: ServiceOrderItemCommercialLine[];
}

type DiscountLineForm = FormGroup<{
  percentage: FormControl<number>;
  overrideReason: FormControl<string>;
}>;

@Component({
  selector: 'app-service-order-line-discount-modal',
  standalone: false,
  templateUrl: './service-order-line-discount-modal.html',
  styleUrls: ['./service-order-line-discount-modal.scss'],
})
export class ServiceOrderLineDiscountModalComponent implements OnChanges {
  private readonly agreementService = inject(ServiceOrderAgreementService);

  @Input({ required: true }) target!: ServiceOrderLineDiscountTarget;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly revisionCreated = new EventEmitter<ServiceOrderAgreement>();

  readonly form = new FormGroup({
    lines: new FormArray<DiscountLineForm>([]),
  });

  isSaving = false;
  errorMessage = '';

  get lineForms(): FormArray<DiscountLineForm> {
    return this.form.controls.lines;
  }

  ngOnChanges(): void {
    const forms = (this.target?.lines ?? []).map((line) =>
      new FormGroup({
        percentage: new FormControl(this.getCurrentPercentage(line), {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0), Validators.max(100)],
        }),
        overrideReason: new FormControl(line.discounts?.[0]?.overrideReason ?? '', {
          nonNullable: true,
          validators: [Validators.maxLength(500)],
        }),
      }),
    );
    this.form.setControl('lines', new FormArray<DiscountLineForm>(forms));
    this.errorMessage = '';
  }

  close(): void {
    if (!this.isSaving) this.closed.emit();
  }

  setPercentage(index: number, value: number | string): void {
    const percentage = Math.min(100, Math.max(0, Number(value) || 0));
    this.lineForms.at(index)?.controls.percentage.setValue(percentage);
    this.errorMessage = '';
  }

  setOverrideReason(index: number, value: string): void {
    this.lineForms.at(index)?.controls.overrideReason.setValue(value);
  }

  getCurrentPercentage(line: ServiceOrderItemCommercialLine): number {
    return Number(line.discounts?.[0]?.percentage ?? 0);
  }

  getPercentage(index: number): number {
    return Number(this.lineForms.at(index)?.controls.percentage.value ?? 0);
  }

  getDiscountAmount(line: ServiceOrderItemCommercialLine, index: number): number {
    return Number((Number(line.grossAmount) * (this.getPercentage(index) / 100)).toFixed(2));
  }

  getNetAmount(line: ServiceOrderItemCommercialLine, index: number): number {
    return Number((Number(line.grossAmount) - this.getDiscountAmount(line, index)).toFixed(2));
  }

  getTotalDiscount(): number {
    return Number(
      (this.target?.lines ?? [])
        .reduce((total, line, index) => total + this.getDiscountAmount(line, index), 0)
        .toFixed(2),
    );
  }

  getNetTotal(): number {
    return Number(
      (this.target?.lines ?? [])
        .reduce((total, line, index) => total + this.getNetAmount(line, index), 0)
        .toFixed(2),
    );
  }

  hasChanges(): boolean {
    return (this.target?.lines ?? []).some(
      (line, index) => this.getCurrentPercentage(line) !== this.getPercentage(index),
    );
  }

  submit(): void {
    if (this.form.invalid || !this.target?.serviceOrderId || !this.target?.baseVersionId || !this.hasChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    let lines: ServiceOrderCommercialRevisionLineRequest[];
    try {
      lines = this.target.lines.map((line, index) => this.toRevisionLine(line, index));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'No pudimos preparar las líneas del acuerdo.';
      return;
    }

    this.errorMessage = '';
    this.isSaving = true;
    this.agreementService
      .createRevision({
        serviceOrderId: this.target.serviceOrderId,
        items: [
          {
            serviceOrderItemId: this.target.serviceOrderItemId,
            baseVersionId: this.target.baseVersionId,
            ...(this.target.notes?.trim() ? { notes: this.target.notes.trim() } : {}),
            lines,
          },
        ],
      })
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (agreement) => this.revisionCreated.emit(agreement),
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private toRevisionLine(
    line: ServiceOrderItemCommercialLine,
    index: number,
  ): ServiceOrderCommercialRevisionLineRequest {
    if (line.type === 'ADJUSTMENT') {
      throw new Error('Las líneas de ajuste no admiten descuentos desde este formulario.');
    }

    const discountPct = this.getPercentage(index);
    const overrideReason = this.lineForms.at(index)?.controls.overrideReason.value.trim() ?? '';
    return {
      type: line.type,
      ...(line.type === 'PRODUCT' && line.productId ? { productId: Number(line.productId) } : {}),
      ...(line.type === 'SERVICE' && line.serviceId ? { serviceId: Number(line.serviceId) } : {}),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      ...(discountPct > 0 ? { discountPct } : {}),
      ...(overrideReason ? { discountOverrideReason: overrideReason } : {}),
      ...(line.type === 'PRODUCT' && line.requiresPurchase ? { requiresPurchase: true } : {}),
      ...(line.notes?.trim() ? { notes: line.notes.trim() } : {}),
    };
  }

  private resolveErrorMessage(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } } | null;
    const backendMessage = response?.error?.message;
    if (Array.isArray(backendMessage)) return backendMessage.join(' ');
    return backendMessage || 'No pudimos guardar los descuentos de esta cotización.';
  }
}
