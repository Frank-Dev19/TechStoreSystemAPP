// src/app/core/models/sales/validation.model.ts
export interface ValidationMessage {
    type: 'ERROR' | 'WARNING' | 'INFO'
    message: string
}
