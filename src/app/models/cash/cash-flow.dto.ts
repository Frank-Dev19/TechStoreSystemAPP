// src/app/core/models/cash/cash-flow.dto.ts
import { TransactionType } from "../sales/enums"
import { TransactionSubtype } from "../sales/enums"

export interface OpenCashRegisterDto {
  openingBalance: number
  observations?: string
}

export interface CloseCashRegisterDto {
  actualCash: number
  actualCard?: number
  actualTransfer?: number
  observations?: string
}

export interface CashFlowTransactionDto {
  type: TransactionType // puedes tiparlo a TransactionType
  subtype?: TransactionSubtype // TransactionSubtype
  description: string
  amount: number
  reference?: string
  observations?: string
}

export interface GetTransactionsParams {
  companyId: number
  dateFrom?: string
  dateTo?: string
  type?: string
  cashRegisterId?: number
  page?: number
  limit?: number
}

export interface DailyReportParams {
  companyId: number
  date: string // YYYY-MM-DD
}
