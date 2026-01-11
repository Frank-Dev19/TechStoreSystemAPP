// src/app/services/pricing/simulation-api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { config } from '../../../environments/environment';
import {
  SimulationQuery,
  SimulationResult,
  BatchSimulationQuery,
} from '../../models/pricing/pricing.models';

@Injectable({ providedIn: 'root' })
export class SimulationApiService {
  private readonly baseUrl = `${config.pricing.base}/simulate`;

  constructor(private base: BaseService) { }

  simulate(query: SimulationQuery): Observable<SimulationResult> {
    return this.base.post<SimulationResult>(this.baseUrl, query);
  }

  batchSimulate(query: BatchSimulationQuery): Observable<SimulationResult[]> {
    return this.base.post<SimulationResult[]>(`${this.baseUrl}/batch`, query);
  }

  downloadAuditReport(query: BatchSimulationQuery): Observable<Blob> {
    return this.base.post<Blob>(
      `${this.baseUrl}/audit-report`,
      query,
      { responseType: 'blob' as 'json' }
    );
  }
}