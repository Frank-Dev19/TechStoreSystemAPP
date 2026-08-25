import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { config } from '../../../environments/environment';

export interface PublicOrderSurvey {
  status: 'AVAILABLE' | 'ANSWERED';
  orderCode?: string;
  clientName?: string;
  equipmentSummary?: string;
  expiresAt?: string;
}

export interface SubmitOrderSurvey {
  overallRating: number;
  attentionRating: number;
  serviceQualityRating: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class PublicOrderSurveyService {
  private readonly headers = new HttpHeaders({ 'X-Skip-Auth': 'true' });

  constructor(private readonly http: HttpClient) {}

  get(token: string): Observable<PublicOrderSurvey> {
    return this.http.get<PublicOrderSurvey>(
      `${config.endpointServices}/service-orders/surveys/${encodeURIComponent(token)}`,
      { headers: this.headers },
    );
  }

  submit(token: string, payload: SubmitOrderSurvey): Observable<{ status: 'ANSWERED' }> {
    return this.http.post<{ status: 'ANSWERED' }>(
      `${config.endpointServices}/service-orders/surveys/${encodeURIComponent(token)}`,
      payload,
      { headers: this.headers },
    );
  }
}
