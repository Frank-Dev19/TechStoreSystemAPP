// src/app/core/models/sales/sale.dto.ts
import { DocumentType, PaymentMethod, SaleType, SaleStatus } from './enums'

export interface CreateSaleItemDto {
    itemType: 'PRODUCT' | 'SERVICE'
    productId?: number | null
    serviceId?: number | null
    lotId?: number | null
    quantity: number
    baseUnitPrice?: number
    finalUnitPrice?: number
    serialIds?: number[]
    comboId?: number | null
    description?: string
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

export interface CreateSaleFromServiceAgreementsDto {
    companyId: number
    serviceOrderIds: number[]
    taxpayerCustomerId: number
    documentType: DocumentType
    issueDate: string
    observations?: string
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
    paymentType?: PaymentMethod
    dateFrom?: string
    dateTo?: string
    search?: string
    page?: number
    limit?: number
}
