import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import {
  ServiceOrderCancellationChannel,
  ServiceOrderCancellationResolution,
  ServiceOrderItem,
  ServiceOrderItemCancellationResult,
  ServiceOrderItemsCancellationResult,
  ServiceOrderTechnicalStatus,
} from '../../models/service-orders/service-order';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';

export interface ServiceOrderItemCancellationTarget {
  mode: 'REQUEST' | 'RESOLVE';
  serviceOrderId: number;
  orderCode: string;
  items: ServiceOrderItem[];
  selectedItemId?: number | null;
  selectedItemIds?: number[];
  selectionLocked?: boolean;
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
  @Output() readonly cancellationSaved = new EventEmitter<
    ServiceOrderItemCancellationResult | ServiceOrderItemsCancellationResult
  >();

  readonly channelOptions = [
    { value: ServiceOrderCancellationChannel.WHATSAPP, label: 'WhatsApp' },
    { value: ServiceOrderCancellationChannel.PHONE, label: 'Llamada telefónica' },
    { value: ServiceOrderCancellationChannel.IN_PERSON, label: 'Presencial' },
    { value: ServiceOrderCancellationChannel.EMAIL, label: 'Correo electrónico' },
    { value: ServiceOrderCancellationChannel.OTHER, label: 'Otro canal' },
  ];

  readonly form = new FormGroup({
    itemIds: new FormControl<number[]>([], { nonNullable: true }),
    channel: new FormControl(ServiceOrderCancellationChannel.WHATSAPP, {
      nonNullable: true,
      validators: Validators.required,
    }),
    resolution: new FormControl(ServiceOrderCancellationResolution.APPROVED_WITHOUT_CHARGE, {
      nonNullable: true,
      validators: Validators.required,
    }),
    chargeAmount: new FormControl<number | null>(null, [Validators.min(0.01)]),
    customerChargeAcknowledged: new FormControl(false, { nonNullable: true }),
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
    const itemId = Number(this.target?.selectedItemId ?? this.form.controls.itemIds.value[0] ?? 0);
    return this.target?.items?.find((item) => Number(item.id) === itemId) ?? null;
  }

  get selectedItems(): ServiceOrderItem[] {
    const selectedIds = new Set(this.form.controls.itemIds.value.map(Number));
    return (this.target?.items ?? []).filter((item) => selectedIds.has(Number(item.id)));
  }

  get chargedItems(): ServiceOrderItem[] {
    return this.selectedItems.filter((item) => this.hasDiagnosisStarted(item));
  }

  get chargeTotal(): number {
    return this.chargedItems.length * 20;
  }

  get canSubmit(): boolean {
    if (this.form.invalid || this.isSaving) return false;
    if (this.isResolution) return Boolean(this.selectedItem) && (!this.requiresCharge || Boolean(this.form.controls.chargeAmount.value));
    return this.selectedItems.length > 0 && (!this.chargedItems.length || this.form.controls.customerChargeAcknowledged.value);
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
          ServiceOrderTechnicalStatus.GARANTIA_RECHAZADA,
        ].includes(item.technicalStatus),
    );
  }

  ngOnChanges(): void {
    const selectedId = Number(this.target?.selectedItemId ?? 0) || null;
    const selectedIds = this.target?.selectedItemIds?.length
      ? this.target.selectedItemIds.map(Number)
      : selectedId
        ? [selectedId]
        : [];
    this.form.reset({
      itemIds: selectedIds,
      channel: ServiceOrderCancellationChannel.WHATSAPP,
      resolution: ServiceOrderCancellationResolution.APPROVED_WITHOUT_CHARGE,
      chargeAmount: null,
      customerChargeAcknowledged: false,
      reason: '',
    });
    this.errorMessage = '';
  }

  getItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(' ');
    return [item.code || `Equipo #${item.id}`, equipment].filter(Boolean).join(' · ');
  }

  getItemDetail(item: ServiceOrderItem): string {
    const serial = item.serialNumber ? `Serie ${item.serialNumber}` : 'Sin serie registrada';
    return `${serial} · ${this.hasDiagnosisStarted(item) ? 'Diagnóstico iniciado · S/ 20.00' : 'Sin importe pendiente'}`;
  }

  getItemTitle(item: ServiceOrderItem): string {
    return [item.brand, item.model].filter(Boolean).join(' ') || `Equipo ${item.position || item.id}`;
  }

  isItemSelected(item: ServiceOrderItem): boolean {
    return this.form.controls.itemIds.value.map(Number).includes(Number(item.id));
  }

  toggleItem(item: ServiceOrderItem): void {
    const ids = this.form.controls.itemIds.value.map(Number);
    const itemId = Number(item.id);
    this.form.controls.itemIds.setValue(
      ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId],
    );
    this.form.controls.customerChargeAcknowledged.setValue(false);
  }

  selectAll(): void {
    this.form.controls.itemIds.setValue((this.target?.items ?? []).map((item) => Number(item.id)));
    this.form.controls.customerChargeAcknowledged.setValue(false);
  }

  deselectAll(): void {
    this.form.controls.itemIds.setValue([]);
    this.form.controls.customerChargeAcknowledged.setValue(false);
  }

  close(): void {
    if (!this.isSaving) this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    const reason = this.form.controls.reason.value.trim();
    const itemId = Number(this.selectedItem?.id ?? 0);
    const request: Observable<
      ServiceOrderItemCancellationResult | ServiceOrderItemsCancellationResult
    > = this.isResolution
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
      : this.serviceOrderService.requestItemsCancellation(this.target.serviceOrderId, {
          itemIds: this.selectedItems.map((item) => Number(item.id)),
          channel: this.form.controls.channel.value,
          reason,
          customerChargeAcknowledged: this.form.controls.customerChargeAcknowledged.value,
        });

    this.errorMessage = '';
    this.isSaving = true;
    request.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: (result) => this.cancellationSaved.emit(result),
      error: (error: unknown) => (this.errorMessage = this.resolveErrorMessage(error)),
    });
  }

  hasDiagnosisStarted(item: ServiceOrderItem): boolean {
    return ![
      ServiceOrderTechnicalStatus.PENDIENTE_ASIGNACION,
      ServiceOrderTechnicalStatus.ASIGNADA,
    ].includes(item.technicalStatus);
  }

  private resolveErrorMessage(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } } | null;
    const backendMessage = response?.error?.message;
    if (Array.isArray(backendMessage)) return backendMessage.join(' ');
    return backendMessage || 'No pudimos registrar la cancelación del equipo.';
  }
}
