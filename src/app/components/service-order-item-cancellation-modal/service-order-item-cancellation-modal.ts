import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ServiceOrderCancellationChannel,
  ServiceOrderCancellationResolution,
  ServiceOrderItem,
  ServiceOrderItemCancellationResult,
  ServiceOrderTechnicalStatus,
} from '../../models/service-orders/service-order';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';

export interface ServiceOrderItemCancellationTarget {
  mode: 'REQUEST' | 'RESOLVE';
  serviceOrderId: number;
  orderCode: string;
  items: ServiceOrderItem[];
  selectedItemId?: number | null;
  cancellationRequestId?: number | null;
}

@Component({
  selector: 'app-service-order-item-cancellation-modal',
  standalone: false,
  templateUrl: './service-order-item-cancellation-modal.html',
  styleUrls: ['./service-order-item-cancellation-modal.scss'],
})
export class ServiceOrderItemCancellationModalComponent implements OnChanges {
  private readonly serviceOrderService = inject(ServiceOrderService);

  @Input({ required: true }) target!: ServiceOrderItemCancellationTarget;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly cancellationSaved = new EventEmitter<ServiceOrderItemCancellationResult>();

  readonly channelOptions = [
    { value: ServiceOrderCancellationChannel.WHATSAPP, label: 'WhatsApp' },
    { value: ServiceOrderCancellationChannel.PHONE, label: 'Llamada telefónica' },
    { value: ServiceOrderCancellationChannel.IN_PERSON, label: 'Presencial' },
    { value: ServiceOrderCancellationChannel.EMAIL, label: 'Correo electrónico' },
    { value: ServiceOrderCancellationChannel.OTHER, label: 'Otro canal' },
  ];

  readonly form = new FormGroup({
    itemId: new FormControl<number | null>(null, Validators.required),
    channel: new FormControl(ServiceOrderCancellationChannel.WHATSAPP, {
      nonNullable: true,
      validators: Validators.required,
    }),
    resolution: new FormControl(ServiceOrderCancellationResolution.APPROVED_WITHOUT_CHARGE, {
      nonNullable: true,
      validators: Validators.required,
    }),
    chargeAmount: new FormControl<number | null>(null, [Validators.min(0.01)]),
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(1000)],
    }),
  });

  isSaving = false;
  errorMessage = '';

  get isResolution(): boolean {
    return this.target?.mode === 'RESOLVE';
  }

  get selectedItem(): ServiceOrderItem | null {
    const itemId = Number(this.form.controls.itemId.value ?? 0);
    return this.target?.items?.find((item) => Number(item.id) === itemId) ?? null;
  }

  get requiresCharge(): boolean {
    return this.form.controls.resolution.value === ServiceOrderCancellationResolution.APPROVED_WITH_CHARGE;
  }

  get willRequireSupervision(): boolean {
    const item = this.selectedItem;
    if (!item) return false;
    return Boolean(
      item.serviceStartedAt ||
        [
          ServiceOrderTechnicalStatus.EN_EJECUCION,
          ServiceOrderTechnicalStatus.BLOQUEADA,
          ServiceOrderTechnicalStatus.ESPERANDO_REPUESTOS_O_TERCERO,
          ServiceOrderTechnicalStatus.RESUELTA,
          ServiceOrderTechnicalStatus.SIN_SOLUCION,
        ].includes(item.technicalStatus),
    );
  }

  ngOnChanges(): void {
    const selectedId = Number(this.target?.selectedItemId ?? this.target?.items?.[0]?.id ?? 0) || null;
    this.form.reset({
      itemId: selectedId,
      channel: ServiceOrderCancellationChannel.WHATSAPP,
      resolution: ServiceOrderCancellationResolution.APPROVED_WITHOUT_CHARGE,
      chargeAmount: null,
      reason: '',
    });
    if (this.isResolution) this.form.controls.itemId.disable({ emitEvent: false });
    else this.form.controls.itemId.enable({ emitEvent: false });
    this.errorMessage = '';
  }

  getItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(' ');
    return [item.code || `Equipo #${item.id}`, equipment].filter(Boolean).join(' · ');
  }

  close(): void {
    if (!this.isSaving) this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid || !this.selectedItem || (this.isResolution && this.requiresCharge && !this.form.controls.chargeAmount.value)) {
      this.form.markAllAsTouched();
      return;
    }

    const reason = this.form.controls.reason.value.trim();
    const itemId = Number(this.selectedItem.id);
    const request = this.isResolution
      ? this.serviceOrderService.resolveItemCancellation(
          this.target.serviceOrderId,
          itemId,
          Number(this.target.cancellationRequestId),
          {
            resolution: this.form.controls.resolution.value,
            ...(this.requiresCharge ? { chargeAmount: Number(this.form.controls.chargeAmount.value) } : {}),
            reason,
          },
        )
      : this.serviceOrderService.requestItemCancellation(this.target.serviceOrderId, itemId, {
          channel: this.form.controls.channel.value,
          reason,
        });

    this.errorMessage = '';
    this.isSaving = true;
    request.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: (result) => this.cancellationSaved.emit(result),
      error: (error: unknown) => (this.errorMessage = this.resolveErrorMessage(error)),
    });
  }

  private resolveErrorMessage(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } } | null;
    const backendMessage = response?.error?.message;
    if (Array.isArray(backendMessage)) return backendMessage.join(' ');
    return backendMessage || 'No pudimos registrar la cancelación del equipo.';
  }
}
