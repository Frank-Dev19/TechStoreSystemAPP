import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessProfile, UpdateBusinessProfileRequest } from '../models/business-profile/business-profile.model';
import { config } from '../../environments/environment';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class BusinessProfileApiService {
  private readonly baseUrl = config.businessProfile.base;

  constructor(private readonly base: BaseService) {}

  get(): Observable<BusinessProfile> {
    return this.base.get<BusinessProfile>(this.baseUrl);
  }

  update(payload: UpdateBusinessProfileRequest): Observable<BusinessProfile> {
    return this.base.put<BusinessProfile>(this.baseUrl, payload);
  }
}
