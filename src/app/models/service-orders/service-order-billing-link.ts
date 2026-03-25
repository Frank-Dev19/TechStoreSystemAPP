import { Sale } from '../sales/sale.model';

export interface ServiceOrderBillingLink {
  id: number;
  saleId: number;
  serviceOrderId: number;
  agreementId: number | null;
  linkedAmount: number;
  linkedBy?: string | null;
  linkedAt: string;
  sale: Sale;
}
