import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { ClientSaveRequest, ClientUpdateRequest } from '../models/clients-request';
import { ClientResponse } from '../models/clients-response';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ClientsApiService {
  private readonly resource = '/clients';

  constructor(private readonly baseService: BaseService) {}

  findAll(params: Record<string, string | number | boolean | undefined>): Observable<PaginatedResponse<ClientResponse>> {
    return this.baseService.get<PaginatedResponse<ClientResponse>>(this.resource, { params });
  }

  findOne(id: number): Observable<ClientResponse> {
    return this.baseService.get<ClientResponse>(`${this.resource}/${id}`);
  }

  create(payload: ClientSaveRequest): Observable<ClientResponse> {
    return this.baseService.post<ClientResponse>(this.resource, payload);
  }

  update(id: number, payload: ClientUpdateRequest): Observable<ClientResponse> {
    return this.baseService.patch<ClientResponse>(`${this.resource}/${id}`, payload);
  }

  remove(id: number): Observable<{ ok: boolean; message: string }> {
    return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/${id}`);
  }

  bulkSoftDelete(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.baseService.delete<{ ok: boolean; message: string }>(`${this.resource}/bulk-delete`, {
      body: { ids },
    });
  }

  restore(id: number): Observable<{ ok: boolean; message: string }> {
    return this.baseService.patch<{ ok: boolean; message: string }>(`${this.resource}/${id}/restore`);
  }

  bulkRestore(ids: number[]): Observable<{ ok: boolean; message: string }> {
    return this.baseService.patch<{ ok: boolean; message: string }>(`${this.resource}/bulk-restore`, { ids });
  }
}
