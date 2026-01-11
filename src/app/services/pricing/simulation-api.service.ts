// // src/app/services/pricing/simulation-api.service.ts
// import { Injectable } from '@angular/core';
// import { Observable } from 'rxjs';
// import { BaseService } from '../base.service';
// import { config } from '../../../environments/environment';

// export interface SimulationQuery {
//     product_id?: number;
//     combo_id?: number;
//     qty: number;
//     price_list_code?: string;
//     date?: string;
//     user_permissions?: string[];
//     include_combos?: boolean;
//     include_technical_details?: boolean;
//     mode?: 'simple' | 'advanced' | 'audit';
// }

// export interface SimulationResult {
//     productId?: number;
//     comboId?: number;
//     productName?: string;
//     comboName?: string;
//     quantity: number;
//     priceListCode: string;
//     simulationDate: string;
//     priceBreakdown: any;
//     validationIssues: any[];
//     technicalDetails?: any;
//     comparison?: any;
// }

// @Injectable({ providedIn: 'root' })
// export class SimulationApiService {
//     private readonly baseUrl = config.pricing.simulation;

//     constructor(private base: BaseService) { }

//     simulate(query: SimulationQuery): Observable<SimulationResult> {
//         return this.base.post<SimulationResult>(this.baseUrl, query);
//     }

//     batchSimulate(params: {
//         productIds: number[];
//         quantities: number[];
//         priceListCodes: string[];
//     }): Observable<any[]> {
//         const query = `?product_ids=${params.productIds.join(',')}&quantities=${params.quantities.join(',')}&price_lists=${params.priceListCodes.join(',')}`;
//         return this.base.get<any[]>(`${this.baseUrl}/batch${query}`);
//     }

//     validateConfig(): Observable<any> {
//         return this.base.get<any>(`${this.baseUrl}/validate-config`);
//     }
// }