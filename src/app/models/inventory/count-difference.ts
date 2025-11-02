export interface CountDifferenceRow {
    productId: number;
    lotId: number | null;
    qtySystem: number;
    qtyCounted: number;
    difference: number;
    avgCostAtFreeze: number;
    valueDifference: number;
}
export interface CountDifferenceSummary {
    surplusValue: number;
    shortageValue: number;
    netValue: number;
}
