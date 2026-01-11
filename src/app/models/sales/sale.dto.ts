// src/app/core/models/sales/sale.dto.ts
import { DocumentType, PaymentMethod, SaleType, SaleStatus } from './enums'

export interface CreateSaleItemDto {
    productId: number
    lotId?: number | null
    quantity: number
    baseUnitPrice?: number
    finalUnitPrice?: number
    serialIds?: number[]
    comboId?: number | null
}

export interface CreateSalePaymentDto {
    method: PaymentMethod
    amount: number
    reference?: string
    bankName?: string
    cardType?: string
    paymentDate?: string
}

export interface CreateSaleDto {
    companyId: number
    customerId: number
    saleType: SaleType
    documentType: DocumentType
    series: string
    number: string
    issueDate: string
    dueDate?: string

    priceListCode?: string
    applyAutoDiscounts?: boolean
    taxRate?: number

    observations?: string

    items: CreateSaleItemDto[]
    payments: CreateSalePaymentDto[]
}

export interface CancelSaleDto {
    reason: string
    observations?: string
}

export interface FilterSalesParams {
    companyId: number
    customerId?: number
    status?: SaleStatus
    documentType?: DocumentType
    saleType?: SaleType
    dateFrom?: string
    dateTo?: string
    search?: string
    page?: number
    limit?: number
}
