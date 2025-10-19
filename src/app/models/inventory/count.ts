export type CountStatus = 'DRAFT' | 'FROZEN' | 'COUNTING' | 'REVIEW' | 'POSTED' | 'CANCELLED';

export interface Count {
    id: number;
    code: string;
    description: string | null;
    status: CountStatus;
    created_by: string;
    created_at: string;   // ISO
    frozen_at: string | null;
    posted_at: string | null;
}
