import { RequestOrigin, ServiceOrderPriority } from './service-order';
import { ServiceOrderItemSaveRequest } from './service-order-item-request';

export interface ServiceOrderSaveRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  priority?: ServiceOrderPriority;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
  items: ServiceOrderItemSaveRequest[];
}

export interface ServiceOrderUpdateRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isPaid?: boolean;
  priority?: ServiceOrderPriority;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
  items?: ServiceOrderItemSaveRequest[];
}
