// src/app/core/services/sales/sales-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';

import { Sale } from '../../models/sales/sale.model';
import { ServiceOrder } from '../../models/service-orders/service-order';
import {
    CreateSaleDto,
    CreateSaleFromServiceAgreementsDto,
    CancelSaleDto,
    FilterSalesParams,
} from '../../models/sales/sale.dto';
import { SimulateSaleDto } from '../../models/sales/simulate.dto';
import { SimulateSaleResponse } from '../../models/sales/simulate.response';

import { toHttpParams } from './http-params.util';

export interface IncomeTaxReport {
    year: number;
    rentaRatePct: number;
    yearlyBaseTotal: number;
    yearlyTaxDue: number;
    breakdown: Array<{
        month: number;
        baseTotal: number;
        taxDue: number;
    }>;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface SalesMetricsResponse {
    totalSales: number;
    confirmedSales: number;
    cancelledSales: number;
    totalAmount: number;
    totalDiscounts: number;
    totalTax: number;
    averageSale: number;
}

export interface SalesByProductRow {
    productId: number;
    productName: string;
    sku: string;
    totalQuantity: number;
    totalAmount: number;
    saleCount: number;
    averagePrice: number;
}

export interface EligibleServiceOrdersParams {
    page?: number;
    limit?: number;
}

@Injectable({ providedIn: 'root' })
export class SalesApiService {
    // Asumiendo que en tu environment tienes algo como:
    // sales: { base: '/sales', simulate: '/sales/simulate', metrics: '/sales/metrics', byProduct: '/sales/by-product' }
    private readonly baseUrl = config.sales.base;
    private readonly simulateUrl = config.sales.simulate;
    private readonly metricsUrl = config.sales.metrics;
    private readonly byProductUrl = config.sales.byProduct;

    constructor(private base: BaseService) { }

    list(params: FilterSalesParams): Observable<PaginatedResponse<Sale>> {
        return this.base.get<PaginatedResponse<Sale>>(this.baseUrl, {
            params: toHttpParams(params as any),
        });
    }

    get(id: number): Observable<Sale> {
        return this.base.get<Sale>(`${this.baseUrl}/${id}`);
    }

    simulate(payload: SimulateSaleDto): Observable<SimulateSaleResponse> {
        return this.base.post<SimulateSaleResponse>(this.simulateUrl, payload);
    }

    create(payload: CreateSaleDto): Observable<Sale> {
        return this.base.post<Sale>(this.baseUrl, payload);
    }

    createFromServiceOrder(payload: {
        serviceOrderId: number;
        companyId: number;
        documentType: string;
        issueDate: string;
        observations?: string;
        payments: Array<{
            method: string;
            amount: number;
            reference?: string;
            bankName?: string;
            cardType?: string;
            paymentDate?: string;
        }>;
    }): Observable<Sale> {
        return this.base.post<Sale>(`${this.baseUrl}/from-service-order`, payload);
    }

    createFromServiceAgreements(payload: CreateSaleFromServiceAgreementsDto): Observable<Sale> {
        return this.base.post<Sale>(`${this.baseUrl}/from-service-agreements`, payload);
    }

    getEligibleServiceOrders(params: EligibleServiceOrdersParams = {}): Observable<PaginatedResponse<ServiceOrder>> {
        return this.base.get<PaginatedResponse<ServiceOrder>>(`${this.baseUrl}/eligible-service-orders`, {
            params: toHttpParams(params as any),
        });
    }

    cancel(id: number, payload: CancelSaleDto): Observable<Sale> {
        // backend: PATCH /sales/:id/cancel
        return this.base.patch<Sale>(`${this.baseUrl}/${id}/cancel`, payload);
    }

    metrics(companyId: number, dateFrom?: string, dateTo?: string, status?: string, documentType?: string, paymentType?: string): Observable<SalesMetricsResponse> {
        const params: any = { companyId, dateFrom, dateTo }
        if (status) params.status = status
        if (documentType) params.documentType = documentType
        if (paymentType) params.paymentType = paymentType
        return this.base.get<SalesMetricsResponse>(this.metricsUrl, {
            params: toHttpParams(params),
        });
    }

    byProduct(companyId: number, productId?: number, dateFrom?: string, dateTo?: string): Observable<SalesByProductRow[]> {
        return this.base.get<SalesByProductRow[]>(this.byProductUrl, {
            params: toHttpParams({ companyId, productId, dateFrom, dateTo }),
        });
    }

    getIncomeTaxReport(companyId: number, year: number): Observable<IncomeTaxReport> {
        // En tu environment 'config.sales.base' es '/sales'
        return this.base.get<IncomeTaxReport>(`${this.baseUrl}/reports/income-tax`, {
            params: toHttpParams({ companyId, year }),
        });
    }

}
