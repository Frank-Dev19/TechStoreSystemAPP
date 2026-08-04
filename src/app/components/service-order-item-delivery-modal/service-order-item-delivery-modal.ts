import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { finalize } from 'rxjs';
import {
  ServiceOrder,
  ServiceOrderCommercialStatus,
  ServiceOrderEconomicStatus,
  ServiceOrderItem,
  ServiceOrderOperativeStatus,
} from '../../models/service-orders/service-order';
import { ServiceOrderService } from '../../services/service-orders/service-order.service';

export interface ServiceOrderItemDeliveryTarget {
  order: ServiceOrder;
  selectedItemId?: number | null;
}

@Component({
  selector: 'app-service-order-item-delivery-modal',
  standalone: false,
  templateUrl: './service-order-item-delivery-modal.html',
  styleUrls: ['./service-order-item-delivery-modal.scss'],
})
export class ServiceOrderItemDeliveryModalComponent implements OnChanges {
  private readonly serviceOrderService = inject(ServiceOrderService);

  @Input({ required: true }) target!: ServiceOrderItemDeliveryTarget;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly deliverySaved = new EventEmitter<ServiceOrder>();

  selectedItemId: number | null = null;
  isSaving = false;
  errorMessage = '';

  get eligibleItems(): ServiceOrderItem[] {
    return (this.target?.order?.items ?? []).filter(
      (item) => item.operativeStatus === ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA,
    );
  }

  get selectedItem(): ServiceOrderItem | null {
    return this.eligibleItems.find((item) => Number(item.id) === Number(this.selectedItemId)) ?? null;
  }

  get blockedReason(): string | null {
    const order = this.target?.order;
    if (!order) return 'No pudimos cargar la orden.';
    if (order.commercialStatus !== ServiceOrderCommercialStatus.AUTORIZADA) {
      return 'El acuerdo comercial vigente todavía no está confirmado.';
    }
    if (![ServiceOrderEconomicStatus.TOTAL, ServiceOrderEconomicStatus.EXONERADO].includes(order.economicStatus)) {
      return 'La orden necesita cobertura económica total o una exoneración antes de entregar equipos.';
    }
    if (!this.eligibleItems.length) return 'No hay equipos listos para entregar.';
    return null;
  }

  ngOnChanges(): void {
    const preferredId = Number(this.target?.selectedItemId ?? 0);
    this.selectedItemId =
      this.eligibleItems.find((item) => Number(item.id) === preferredId)?.id ?? this.eligibleItems[0]?.id ?? null;
    this.errorMessage = '';
  }

  selectItem(item: ServiceOrderItem): void {
    if (!this.blockedReason && !this.isSaving) this.selectedItemId = Number(item.id);
  }

  getItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(' ');
    return equipment || item.code || `Equipo #${item.position}`;
  }

  close(): void {
    if (!this.isSaving) this.closed.emit();
  }

  submit(): void {
    if (this.blockedReason || !this.selectedItem || this.isSaving) return;
    this.errorMessage = '';
    this.isSaving = true;
    this.serviceOrderService
      .deliverItem(Number(this.target.order.id), Number(this.selectedItem.id))
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (order) => this.deliverySaved.emit(order),
        error: (error: unknown) => (this.errorMessage = this.resolveErrorMessage(error)),
      });
  }

  private resolveErrorMessage(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } } | null;
    const backendMessage = response?.error?.message;
    if (Array.isArray(backendMessage)) return backendMessage.join(' ');
    return backendMessage || 'No pudimos registrar la entrega del equipo.';
  }
}
