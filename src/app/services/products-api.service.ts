import { Injectable } from '@angular/core'
import { Observable, from } from 'rxjs'
import { BaseService } from './base.service'
import { lastValueFrom } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly baseUrl = '/inventory/catalogs/products'

  constructor(private base: BaseService) {}

  getProducts(): Promise<any[]> {
    // Retorna una promesa para compatibilidad con el código actual
    return lastValueFrom(this.base.get<any[]>(this.baseUrl))
  }
}
