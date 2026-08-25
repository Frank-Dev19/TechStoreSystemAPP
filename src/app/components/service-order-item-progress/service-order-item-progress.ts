import { Component, Input } from '@angular/core';
import {
  ServiceOrder,
  ServiceOrderOperativeStatus,
} from '../../models/service-orders/service-order';

@Component({
  selector: 'app-service-order-item-progress',
  standalone: false,
  templateUrl: './service-order-item-progress.html',
  styleUrls: ['./service-order-item-progress.scss'],
})
export class ServiceOrderItemProgressComponent {
  @Input({ required: true }) order!: ServiceOrder;
  @Input() compact = false;

  get delivered(): number {
    return Number(this.order?.itemProgress?.delivered ?? 0);
  }

  get active(): number {
    return Number(this.order?.itemProgress?.active ?? this.order?.items?.length ?? 0);
  }

  get total(): number {
    return Number(this.order?.itemProgress?.total ?? this.order?.items?.length ?? 0);
  }

  get cancelled(): number {
    return Number(this.order?.itemProgress?.cancelled ?? 0);
  }

  get percentage(): number {
    if (!this.total) return 0;
    return Math.min(100, Math.round((this.delivered / this.total) * 100));
  }

  get returned(): number {
    return (this.order?.items ?? []).filter(
      (item) =>
        !!item.deliveredAt &&
        item.operativeStatus === ServiceOrderOperativeStatus.CANCELADA,
    ).length;
  }

  get servicedDelivered(): number {
    return Math.max(0, this.delivered - this.returned);
  }

  get heading(): string {
    return 'Salida de equipos';
  }

  get label(): string {
    if (!this.total) return 'Sin equipos registrados';
    if (!this.delivered) return `0 de ${this.total}`;
    if (this.delivered < this.total) return `${this.delivered} de ${this.total}`;
    if (this.returned === this.total) return `${this.delivered} de ${this.total} devueltos`;
    if (!this.returned) return `${this.delivered} de ${this.total} entregados`;
    return `${this.delivered} de ${this.total} entregados o devueltos`;
  }

  get detail(): string {
    if (!this.total) return '';
    if (!this.delivered) return 'Pendiente';
    if (this.delivered < this.total) return 'Salida parcial';
    if (this.returned === this.total) return 'Devolución completada';
    if (!this.returned) return 'Entrega completada';
    return `${this.servicedDelivered} entregado${this.servicedDelivered === 1 ? '' : 's'} · ${this.returned} devuelto${this.returned === 1 ? '' : 's'}`;
  }
}
