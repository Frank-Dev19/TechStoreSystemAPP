import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';

export interface MaterialSerial {
  id: number;
  serialCode: string;
  productId: number;
  lotId: number | null;
  status: string;
  condition: string;
}
export interface MaterialLine {
  id: number;
  deliveryId: number;
  productId: number;
  commercialLineId: number;
  quantity: number;
  returnedQuantity: number;
  serialId: number | null;
  serialCode: string | null;
  saleId: number | null;
}
export interface MaterialQuoteLine {
  id: number;
  type: string;
  productId: number;
  quantity: number;
  catalogNameSnapshot: string;
  product?: { isSerialized: boolean; managesExpiration: boolean };
}
export interface MaterialState {
  itemId: number;
  itemCode: string;
  technicianId: number | null;
  technicalStatus: string;
  isAdmin: boolean;
  version: { id: number; lines: MaterialQuoteLine[] } | null;
  lines: MaterialLine[];
  serials: MaterialSerial[];
  deliveries: { id: number; createdAt: string; technicianId: number; actorId: number }[];
  returns: {
    id: number;
    deliveryLineId: number;
    quantity: number;
    faulty: boolean;
    reason: string;
    createdAt: string;
    actorId: number;
  }[];
  reconciliation: { versionId: number; valid: boolean; confirmedAt: string } | null;
  conditionHistory: {
    id: number;
    serialId: number;
    condition: string;
    reason: string;
    createdAt: string;
    actorId: number;
  }[];
}
@Injectable({ providedIn: 'root' })
export class ServiceOrderMaterialsService {
  constructor(private readonly base: BaseService) {}
  private path(orderId: number, itemId: number) {
    return `/service-orders/${orderId}/items/${itemId}/materials`;
  }
  read(orderId: number, itemId: number) {
    return this.base.get<MaterialState>(this.path(orderId, itemId), { withLoader: false });
  }
  available(orderId: number, itemId: number, productId: number) {
    return this.base.get<{ serials: MaterialSerial[]; lots: { id: number; lotCode: string }[] }>(
      `${this.path(orderId, itemId)}/available/${productId}`,
      { withLoader: false },
    );
  }
  act(orderId: number, itemId: number, action: string, data: object) {
    return this.base.post(`${this.path(orderId, itemId)}/${action}`, data, { withLoader: false });
  }
}
