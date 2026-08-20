import { Component, Input } from '@angular/core';
import { ServiceOrder } from '../../models/service-orders/service-order';

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

  get label(): string {
    if (!this.total) return 'Sin equipos registrados';
    if (this.delivered === this.total) return `${this.delivered} de ${this.total} equipos entregados`;
    if (this.delivered > 0) return `Entrega parcial: ${this.delivered} de ${this.total}`;
    return `${this.total} equipo${this.total === 1 ? '' : 's'} por entregar`;
  }
}
