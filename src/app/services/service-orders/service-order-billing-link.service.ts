import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import { PaginatedResponse } from '../sales/sales-api.service';
import { Sale } from '../../models/sales/sale.model';
import { ServiceOrderBillingLink } from '../../models/service-orders/service-order-billing-link';

@Injectable({ providedIn: 'root' })
export class ServiceOrderBillingLinkService {
  constructor(private readonly base: BaseService) {}

  searchSales(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<Sale>> {
    return this.base.get<PaginatedResponse<Sale>>(`${config.serviceOrders.serviceOrderBillingLinks}/search-sales`, {
      params,
    });
  }

  getLinksByOrders(serviceOrderIds: number[]): Observable<ServiceOrderBillingLink[]> {
    return this.base.get<ServiceOrderBillingLink[]>(`${config.serviceOrders.serviceOrderBillingLinks}/by-orders`, {
      params: { serviceOrderIds: serviceOrderIds.join(',') },
    });
  }

  linkSaleToOrders(saleId: number, serviceOrderIds: number[]): Observable<ServiceOrderBillingLink[]> {
    return this.base.post<ServiceOrderBillingLink[]>(config.serviceOrders.serviceOrderBillingLinks, {
      saleId,
      serviceOrderIds,
    });
  }

  unlink(id: number): Observable<{ ok: boolean; message: string }> {
    return this.base.delete<{ ok: boolean; message: string }>(`${config.serviceOrders.serviceOrderBillingLinks}/${id}`);
  }
}
