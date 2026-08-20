import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { config } from '../../environments/environment';
import {
  MailPurpose,
  MailSetting,
  TestMailSettingResponse,
  UpdateMailSettingRequest,
} from '../models/mail-settings/mail-settings.model';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class MailSettingsApiService {
  private readonly baseUrl = config.mailSettings.base;

  constructor(private readonly base: BaseService) {}

  getAll(): Observable<MailSetting[]> {
    return this.base.get<MailSetting[]>(this.baseUrl);
  }

  update(purpose: MailPurpose, payload: UpdateMailSettingRequest): Observable<MailSetting> {
    return this.base.put<MailSetting>(`${this.baseUrl}/${purpose}`, payload);
  }

  test(purpose: MailPurpose, recipient?: string): Observable<TestMailSettingResponse> {
    return this.base.post<TestMailSettingResponse>(`${this.baseUrl}/${purpose}/test`, {
      recipient: recipient?.trim() || undefined,
    });
  }
}
