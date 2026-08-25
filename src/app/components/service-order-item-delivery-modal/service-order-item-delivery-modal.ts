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

  selectedItemIds: number[] = [];
  isSaving = false;
  errorMessage = '';

  get pendingItems(): ServiceOrderItem[] {
    return (this.target?.order?.items ?? []).filter((item) => !item.deliveredAt);
  }

  get eligibleItems(): ServiceOrderItem[] {
    return this.pendingItems.filter((item) => !this.getItemBlockedReason(item));
  }

  get selectedCount(): number {
    return this.selectedItemIds.length;
  }

  get allEligibleSelected(): boolean {
    return this.eligibleItems.length > 0 && this.eligibleItems.every((item) => this.isItemSelected(item));
  }

  get someEligibleSelected(): boolean {
    return this.selectedCount > 0 && !this.allEligibleSelected;
  }

  get blockedReason(): string | null {
    const order = this.target?.order;
    if (!order) return 'No pudimos cargar la orden.';
    if (!this.pendingItems.length) return 'Todos los equipos de la orden ya fueron entregados.';
    return null;
  }

  getItemBlockedReason(item: ServiceOrderItem): string | null {
    const order = this.target?.order;
    if (!order) return 'No pudimos cargar la orden.';
    if (item.deliveredAt || item.operativeStatus === ServiceOrderOperativeStatus.ENTREGADA) {
      return 'El equipo ya fue entregado.';
    }
    if (item.operativeStatus === ServiceOrderOperativeStatus.CANCELACION_SOLICITADA) {
      return 'El equipo tiene una cancelación pendiente.';
    }
    const hasCoverage = [ServiceOrderEconomicStatus.TOTAL, ServiceOrderEconomicStatus.EXONERADO]
      .includes(order.economicStatus);

    if (item.operativeStatus === ServiceOrderOperativeStatus.CANCELADA) {
      if (this.hasCancellationCharge(item) && !hasCoverage) {
        return 'El cargo por diagnóstico debe estar pagado o exonerado antes de entregar este equipo.';
      }
      return null;
    }
    if (item.operativeStatus !== ServiceOrderOperativeStatus.LISTA_PARA_ENTREGA) {
      return 'El equipo todavía no está listo para entrega.';
    }
    if (this.hasPendingCancellation(item)) {
      return 'El equipo tiene una cancelación pendiente.';
    }
    if (order.commercialStatus !== ServiceOrderCommercialStatus.AUTORIZADA) {
      return 'La cotización vigente todavía no está confirmada.';
    }
    if (!hasCoverage) {
      return 'La orden necesita cobertura económica total o una exoneración antes de entregar equipos.';
    }
    return null;
  }

  ngOnChanges(): void {
    const preferredId = Number(this.target?.selectedItemId ?? 0);
    this.selectedItemIds = this.eligibleItems.some((item) => Number(item.id) === preferredId)
      ? [preferredId]
      : [];
    this.errorMessage = '';
  }

  toggleItem(item: ServiceOrderItem): void {
    if (this.getItemBlockedReason(item) || this.isSaving) return;
    const itemId = Number(item.id);
    this.selectedItemIds = this.isItemSelected(item)
      ? this.selectedItemIds.filter((id) => id !== itemId)
      : [...this.selectedItemIds, itemId];
  }

  toggleAllEligible(): void {
    if (this.isSaving || !this.eligibleItems.length) return;
    this.selectedItemIds = this.allEligibleSelected
      ? []
      : this.eligibleItems.map((item) => Number(item.id));
  }

  isItemSelected(item: ServiceOrderItem): boolean {
    return this.selectedItemIds.includes(Number(item.id));
  }

  getItemLabel(item: ServiceOrderItem): string {
    const equipment = [item.brand, item.model].filter(Boolean).join(' ');
    return equipment || item.code || `Equipo #${item.position}`;
  }

  getItemStateLabel(item: ServiceOrderItem): string {
    const blockedReason = this.getItemBlockedReason(item);
    if (blockedReason) return blockedReason;
    if (item.operativeStatus !== ServiceOrderOperativeStatus.CANCELADA) return 'Listo para entrega';
    return this.hasCancellationCharge(item) ? 'Cancelado · sujeto a cobro' : 'Cancelado · sin cargo';
  }

  close(): void {
    if (!this.isSaving) this.closed.emit();
  }

  submit(): void {
    if (this.blockedReason || !this.selectedCount || this.isSaving) return;
    this.errorMessage = '';
    this.isSaving = true;
    this.serviceOrderService
      .deliverItems(Number(this.target.order.id), [...this.selectedItemIds])
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

  private hasCancellationCharge(item: ServiceOrderItem): boolean {
    return (item.cancellationRequests ?? []).some(
      (request) => request.status === 'APPROVED' && Number(request.chargeAmount ?? 0) > 0,
    );
  }

  private hasPendingCancellation(item: ServiceOrderItem): boolean {
    return (item.cancellationRequests ?? []).some((request) =>
      ['PENDING', 'AWAITING_CLIENT_ACCEPTANCE'].includes(request.status),
    );
  }
}
