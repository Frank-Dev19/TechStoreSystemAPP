// src/app/core/models/cash/cash-flow-transaction.model.ts
import { TransactionSubtype, TransactionType } from '../sales/enums'
import type { Sale } from '../sales/sale.model'
import type { CashRegister } from './cash-register.model'

export interface CashFlowTransaction {
    id: number

    cashRegisterId?: number | null
    cashRegister?: CashRegister | null

    saleId?: number | null
    sale?: Sale | null

    type: TransactionType
    subtype?: TransactionSubtype | null

    description: string
    amount: number
    balanceAfter: number

    currency: string
    exchangeRate: number

    reference?: string | null
    recordedBy: string
    recordedAt: string // Date ISO
}
