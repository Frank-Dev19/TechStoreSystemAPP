export interface ServiceSaveRequest {
    name: string;
    description?: string | null;
    categoryId: number;
    price: number;
    estimatedDurationMinutes: number;
    warrantyDays: number;
    isActive: boolean;
}

export interface ServiceUpdateRequest {
    name?: string;
    description?: string | null;
    categoryId?: number;
    price?: number;
    estimatedDurationMinutes?: number;
    warrantyDays?: number;
    isActive?: boolean;
}
