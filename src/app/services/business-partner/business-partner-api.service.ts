// import { Injectable } from '@angular/core';
// import { Observable } from 'rxjs';
// import { BaseService } from '../base.service';
// import { config } from '../../../environments/environment';
// import { BusinessPartner } from '../../models/sales/sale.model';

// @Injectable({ providedIn: 'root' })
// export class BusinessPartnerApiService {
//   private readonly baseUrl = config.businessPartner.base;

//   constructor(private base: BaseService) { }

//   findAll(companyId: number, search?: string): Observable<BusinessPartner[]> {
//     const params: any = { companyId };
//     if (search) params.search = search;

//     return this.base.get<BusinessPartner[]>(this.baseUrl, params);
//   }

//   findOne(id: number): Observable<BusinessPartner> {
//     return this.base.get<BusinessPartner>(`${this.baseUrl}/${id}`);
//   }

//   create(businessPartner: Partial<BusinessPartner>): Observable<BusinessPartner> {
//     return this.base.post<BusinessPartner>(this.baseUrl, businessPartner);
//   }
// }