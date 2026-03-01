// src/app/core/services/sales/cash-flow-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
 

import { CashRegister } from '../../models/cash/cash-register.model';
import { CashFlowTransaction } from '../../models/cash/cash-flow-transaction.model';
import {
    OpenCashRegisterDto,
    CloseCashRegisterDto,
    CashFlowTransactionDto,
    GetTransactionsParams,
    DailyReportParams,
} from '../../models/cash/cash-flow.dto';
import { CloseCashRegisterResponse } from '../../models/cash/close-response.model';

import { toHttpParams } from './http-params.util';

export interface PaginatedTransactionsResponse {
    data: CashFlowTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface DailyReportResponse {
    date: string;
    sales: {
        total: number;
        count: number;
        average: number;
    };
    payments: {
        cash: number;
        card: number;
        transfer: number;
        yape: number;
        plin: number;
        credit: number;
    };
    topProducts: Array<{
        productId: number;
        productName: string;
        quantity: number;
        amount: number;
    }>;
    transactions: Array<{
        id: number;
        type: string;
        description: string;
        amount: number;
        recordedAt: string;
        cashRegister?: string;
    }>;
}

@Injectable({ providedIn: 'root' })
export class CashFlowApiService {
    private readonly registerUrl = config.cashFlow.register;
    private readonly openRegisterUrl = config.cashFlow.openRegister;
    private readonly closeRegisterUrl = config.cashFlow.closeRegister;
    private readonly transactionsUrl = config.cashFlow.transactions;
    private readonly dailyReportUrl = config.cashFlow.dailyReport;

    constructor(private base: BaseService) { }

  // GET /cash-flow/register?companyId=...&code=...
  getRegister(companyId: number, code?: string): Observable<CashRegister | null> {
      return this.base.get<CashRegister | null>(this.registerUrl, {
          params: toHttpParams({ companyId, code }),
      });
  }

  // GET /cash-flow/registers
  listRegisters(params: { companyId: number; page?: number; limit?: number }): Observable<{ data: CashRegister[]; total: number; page: number; limit: number; totalPages: number }> {
      return this.base.get<{ data: CashRegister[]; total: number; page: number; limit: number; totalPages: number }>(`/cash-flow/registers`, {
          params: toHttpParams(params as any),
      });
  }

  // GET /cash-flow/register/open-current
  getOpenRegister(companyId: number): Observable<CashRegister | null> {
      return this.base.get<CashRegister | null>(`/cash-flow/register/open-current`, {
          params: toHttpParams({ companyId }),
      });
  }

    // POST /cash-flow/register/open?companyId=...&code=...
    openRegister(companyId: number, code: string, payload: OpenCashRegisterDto): Observable<CashRegister> {
        return this.base.post<CashRegister>(this.openRegisterUrl, payload, {
            params: toHttpParams({ companyId, code }),
        });
    }

    // POST /cash-flow/register/close?companyId=...&code=...
    closeRegister(companyId: number, code: string, payload: CloseCashRegisterDto): Observable<CloseCashRegisterResponse> {
        return this.base.post<CloseCashRegisterResponse>(this.closeRegisterUrl, payload, {
            params: toHttpParams({ companyId, code }),
        });
    }

    // GET /cash-flow/transactions?companyId=...&dateFrom=...&dateTo=...&type=...&cashRegisterId=...&page=...&limit=...
    listTransactions(params: GetTransactionsParams): Observable<PaginatedTransactionsResponse> {
        return this.base.get<PaginatedTransactionsResponse>(this.transactionsUrl, {
            params: toHttpParams(params as any),
        });
    }

    // POST /cash-flow/transactions?companyId=...&cashRegisterId=...
    // OJO: tu controller recibe companyId y opcional cashRegisterId en query.
    createTransaction(companyId: number, payload: CashFlowTransactionDto, cashRegisterId?: number): Observable<CashFlowTransaction> {
        return this.base.post<CashFlowTransaction>(this.transactionsUrl, payload, {
            params: toHttpParams({ companyId, cashRegisterId }),
        });
    }

    // GET /cash-flow/reports/daily?companyId=...&date=YYYY-MM-DD
    dailyReport(params: DailyReportParams): Observable<DailyReportResponse> {
        return this.base.get<DailyReportResponse>(this.dailyReportUrl, {
            params: toHttpParams(params as any),
        });
    }

    // GET /cash-flow/metrics?companyId=...&dateFrom=...&dateTo=...
    getCashFlowMetrics(params: { companyId: number; dateFrom?: string; dateTo?: string; cashRegisterId?: number }): Observable<{ total: number; cash: number; card: number; transfer: number; yape: number; plin: number }> {
        return this.base.get<{ total: number; cash: number; card: number; transfer: number; yape: number; plin: number }>('/cash-flow/metrics', {
            params: toHttpParams(params as any),
        });
    }
}
