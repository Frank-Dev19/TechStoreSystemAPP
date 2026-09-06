import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { ServiceOrder } from '../models/service-orders/service-order';
import {
  WarrantyClaim,
  WarrantyCoverage,
  WarrantyCoverageGroupPage,
  WarrantyIntakeRequest,
  WarrantyPage,
  WarrantyTechnicianReport,
} from '../models/warranties/warranty.model';

export interface WarrantySearchFilter {
  page?: number;
  limit?: number;
  customerId?: number;
  sourceType?: string;
  status?: string;
  search?: string;
}

export interface WarrantyClaimSearchFilter {
  page?: number;
  limit?: number;
  sourceType?: string;
  status?: string;
  outcome?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class WarrantiesApiService {
  constructor(private readonly base: BaseService) {}

  findCoverages(filter: WarrantySearchFilter): Observable<WarrantyPage<WarrantyCoverage>> {
    return this.base.get<WarrantyPage<WarrantyCoverage>>('/warranties/coverages', {
      params: this.params(filter),
    });
  }

  findCoverageGroups(filter: WarrantySearchFilter): Observable<WarrantyCoverageGroupPage> {
    return this.base.get<WarrantyCoverageGroupPage>('/warranties/coverage-groups', {
      params: this.params(filter),
    });
  }

  findClaims(filter: WarrantyClaimSearchFilter): Observable<WarrantyPage<WarrantyClaim>> {
    return this.base.get<WarrantyPage<WarrantyClaim>>('/warranties/claims', {
      params: this.claimParams(filter),
    });
  }

  createIntake(payload: WarrantyIntakeRequest): Observable<ServiceOrder> {
    return this.base.post<ServiceOrder>('/service-orders/warranty-intake', payload);
  }

  cancelClaim(id: number, reason: string): Observable<WarrantyClaim> {
    return this.base.patch<WarrantyClaim>(`/warranties/claims/${id}/cancel`, { reason });
  }

  getTechnicianReport(dateFrom?: string, dateTo?: string): Observable<WarrantyTechnicianReport> {
    const params: Record<string, string> = {};
    if (dateFrom) params['dateFrom'] = dateFrom;
    if (dateTo) params['dateTo'] = dateTo;
    return this.base.get<WarrantyTechnicianReport>('/warranties/reports/technicians', { params });
  }

  private params(filter: WarrantySearchFilter): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
    if (filter.customerId) params['customerId'] = filter.customerId;
    if (filter.sourceType) params['sourceType'] = filter.sourceType;
    if (filter.status) params['status'] = filter.status;
    if (filter.search?.trim()) params['search'] = filter.search.trim();
    return params;
  }

  private claimParams(filter: WarrantyClaimSearchFilter): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
    if (filter.sourceType) params['sourceType'] = filter.sourceType;
    if (filter.status) params['status'] = filter.status;
    if (filter.outcome) params['outcome'] = filter.outcome;
    if (filter.dateFrom) params['dateFrom'] = filter.dateFrom;
    if (filter.dateTo) params['dateTo'] = filter.dateTo;
    if (filter.search?.trim()) params['search'] = filter.search.trim();
    return params;
  }
}
