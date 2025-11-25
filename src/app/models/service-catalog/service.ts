export interface Service {
    id: number;
    code: string;
    name: string;
    description: string | null;
    categoryId: number;
    price: number;
    estimatedDurationMinutes: number;
    warrantyDays: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}