// src/app/core/models/sales/sale.model.ts
import { DocumentType, SaleStatus, SaleType, PaymentMethod } from './enums'

export interface SaleCustomer {
  id: number
  name: string
  documentNumber: string
  documentTypeId: number
}

export interface SaleItem {
  id: number
  saleId: number
  itemType?: 'PRODUCT' | 'SERVICE'
  productId?: number | null
  serviceId?: number | null

  product?: {
    id: number
    sku: string
    name: string
  }
  service?: {
    id: number
    code: string
    name: string
  }
  serviceCodeSnapshot?: string | null
  serviceNameSnapshot?: string | null
  descriptionSnapshot?: string | null

  lotId?: number | null
  lot?: any | null

  baseUnitPrice: number
  finalUnitPrice: number
  quantity: number

  discountAmount: number
  taxAmount: number
  lineTotal: number

  serialCount: number
  isComboItem: boolean
  comboId?: number | null
}

export interface SalePayment {
  id: number
  saleId: number
  method: PaymentMethod
  amount: number
  exchangeRate: number
  currency: string
  paymentDate: string
  reference?: string | null
  bankName?: string | null
  cardType?: string | null
  observations?: string | null
  createdAt: string
}

export type DiscountSource = 'RULE_AUTO' | 'RULE_MANUAL' | 'COMBO' | 'MANUAL' | 'PROMOTION'

export interface SaleLineDiscount {
  id: number
  saleId: number
  saleItemId?: number | null
  discountRuleId?: number | null
  discountSource: DiscountSource
  name: string
  amount: number
  isPercent: boolean
  discountValue: number
  priority: number
}

export interface SaleComboItem {
  id: number
  saleId: number
  saleItemId?: number | null
  comboId: number
  productId: number

  combo: { id: number; name: string; comboType: string }
  product: { id: number; sku: string; name: string }

  qtyInCombo: number
  unitPriceAtSale: number
  comboSavings: number
}

export interface Sale {
  id: number
  companyId: number

  customerId: number
  customer: SaleCustomer

  cashRegisterId?: number | null

  saleType: SaleType
  documentType: DocumentType
  series: string
  number: string
  issueDate: string
  dueDate?: string | null

  priceListCode?: string | null
  applyAutoDiscounts: boolean

  baseSubtotal: number
  subtotal: number
  discountTotal: number
  taxAmount: number
  total: number
  taxRate: number

  status: SaleStatus

  observations?: string | null
  createdBy?: string | null
  confirmedBy?: string | null
  cancelledBy?: string | null
  cancelledReason?: string | null
  cancelledAt?: string | null

  createdAt: string
  updatedAt: string
  deletedAt?: string | null

  items: SaleItem[]
  payments: SalePayment[]
  lineDiscounts: SaleLineDiscount[]
  comboItems: SaleComboItem[]
}
