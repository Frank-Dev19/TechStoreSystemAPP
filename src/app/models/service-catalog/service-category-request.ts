export interface ServiceCategorySaveRequest {
    name: string;
    description?: string | null;
    isActive: boolean;
}

export interface ServiceCategoryUpdateRequest {
    name?: string;
    description?: string | null;
    isActive?: boolean;
}
