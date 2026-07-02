// src/app/core/models/sales/simulate.response.ts
import { ValidationMessage } from './validation.model'

export interface SimulatedDiscount {
    ruleId?: number
    name: string
    type: string
    amount: number
    value: number
    source: string
    priority: number
}

export interface SimulatedCombo {
    comboId: number
    name: string
    type: string
    comboPrice?: number
    discountPercent?: number
    savings: number
    items: Array<{ productId: number; productName: string; quantity: number }>
}

export interface SimulatedItem {
    productId: number
    productName: string
    sku: string
    quantity: number

    baseUnitPrice: number
    finalUnitPrice: number

    baseSubtotal: number
    finalSubtotal: number
    totalDiscount: number

    discounts: SimulatedDiscount[]
    availableCombos: SimulatedCombo[]

    stockValidation: {
        productId: number
        productName: string
        requestedQty: number
        availableQty: number
        isValid: boolean
        warning?: string
        lots?: { lotId: number; lotCode: string; expirationDate?: string; available: number }[]
        serials?: { serialId: number; serialCode: string; lotId?: number }[]
    }

}

export interface SimulateSaleResponse {
    customer: any
    items: SimulatedItem[]
    summary: {
        baseSubtotal: number
        discountTotal: number
        subtotal: number
        grossSubtotal?: number
        taxRate: number
        taxAmount: number
        total: number
    }
    validation: {
        isValid: boolean
        messages: ValidationMessage[]
    }
}
