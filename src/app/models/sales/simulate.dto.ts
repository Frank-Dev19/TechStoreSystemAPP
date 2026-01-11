// src/app/core/models/sales/simulate.dto.ts
import { SaleType } from './enums'

export interface SimulateItemDto {
    productId: number
    quantity: number
    comboId?: number | null
}

export interface SimulateSaleDto {
    customerId: number
    saleType: SaleType
    priceListCode?: string
    applyAutoDiscounts?: boolean
    items: SimulateItemDto[]
    userPermissions?: string[]
}
