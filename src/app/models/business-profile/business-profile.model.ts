export type BillingEnvironment = 'beta' | 'produccion' | 'nubefact_beta' | 'nubefact_produccion';
export type BillingPlan = 'free' | 'premium';

export interface BusinessProfile {
  id: number;
  ruc: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  direccion: string | null;
  ubigueo: string | null;
  codigoPais: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  urbanizacion: string | null;
  codLocal: string | null;
  email: string | null;
  telephone: string | null;
  plan: BillingPlan;
  environment: BillingEnvironment;
  apisPeruCompanyId: number | null;
  solUser: string | null;
  solPass: string | null;
  clientId: string | null;
  clientSecret: string | null;
  certificadoBase64?: string | null;
  logoBase64: string | null;
  certificadoFilename: string | null;
  certificadoUpdatedAt: string | null;
  logoFilename: string | null;
  logoUpdatedAt: string | null;
  hasSolPass: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasCertificate: boolean;
  hasLogo: boolean;
}

export type UpdateBusinessProfileRequest = Partial<Omit<BusinessProfile,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'hasSolPass'
  | 'hasClientId'
  | 'hasClientSecret'
  | 'hasCertificate'
  | 'hasLogo'
>>;
