// src/app/core/models/cash/cash-register.model.ts
import { CashFlowTransaction } from './cash-flow-transaction.model'

export type CashRegisterStatus = 'CLOSED' | 'OPEN' | 'COUNTING'

export interface CashRegister {
  id: number
  companyId: number
  code: string
  name: string

  openingBalance: number
  currentBalance: number
  expectedBalance: number

  status: CashRegisterStatus

  openedBy?: string | null
  openedAt?: string | null // Date ISO
  closedBy?: string | null
  closedAt?: string | null // Date ISO

  closingObservations?: string | null

  createdAt: string
  updatedAt: string

  transactions?: CashFlowTransaction[]
}
