// src/app/core/models/sales/enums.ts

export enum DocumentType {
    NOTA_PEDIDO = 'NOTA_PEDIDO',
    BOLETA = 'BOLETA',
    FACTURA = 'FACTURA',
}

export enum SaleStatus {
    DRAFT = 'DRAFT',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
}

export enum SaleType {
    PRODUCT = 'PRODUCT',
    COMBO = 'COMBO',
    MIXED = 'MIXED',
    SERVICE = 'SERVICE',
}

export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    TRANSFER = 'TRANSFER',
    YAPE = 'YAPE',
    PLIN = 'PLIN',
    CREDIT = 'CREDIT',
}

export enum TransactionType {
    OPENING = 'OPENING',
    SALE = 'SALE',
    EXPENSE = 'EXPENSE',
    INCOME = 'INCOME',
    CLOSING = 'CLOSING',
}

export enum TransactionSubtype {
    CASH = 'CASH',
    CARD = 'CARD',
    TRANSFER = 'TRANSFER',
    YAPE = 'YAPE',
    PLIN = 'PLIN',
}
