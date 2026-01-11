// src/app/core/models/cash/close-response.model.ts
import { CashRegister } from './cash-register.model'

export interface CloseCashRegisterResponse {
  register: CashRegister
  summary: {
    salesCount: number
    salesTotal: number
    paymentSummary: {
      cash: number
      card: number
      transfer: number
      yape: number
      plin: number
      credit: number
    }
    openingBalance: number
    expectedCash: number
    actualCash: number
    cashDifference: number
  }
}
