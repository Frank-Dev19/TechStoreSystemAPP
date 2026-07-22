import { Component, OnInit } from '@angular/core';
import { BusinessProfile, BillingEnvironment, BillingPlan, UpdateBusinessProfileRequest } from '../../models/business-profile/business-profile.model';
import { BusinessProfileApiService } from '../../services/business-profile-api.service';

type ToastType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-business-profile',
  standalone: false,
  templateUrl: './business-profile.html',
  styleUrl: './business-profile.scss',
})
export class BusinessProfilePage implements OnInit {
  readonly plans: BillingPlan[] = ['free', 'premium'];
  readonly environments: BillingEnvironment[] = ['beta', 'produccion', 'nubefact_beta', 'nubefact_produccion'];

  isLoading = false;
  isSaving = false;
  profile: BusinessProfile | null = null;
  logoPreview: string | null = null;

  form: UpdateBusinessProfileRequest = this.emptyForm();

  toast = {
    show: false,
    type: 'info' as ToastType,
    message: '',
  };

  constructor(private readonly businessProfileApi: BusinessProfileApiService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.businessProfileApi.get().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.form = {
          ruc: profile.ruc,
          razonSocial: profile.razonSocial,
          nombreComercial: profile.nombreComercial,
          direccion: profile.direccion,
          ubigueo: profile.ubigueo,
          codigoPais: profile.codigoPais || 'PE',
          departamento: profile.departamento,
          provincia: profile.provincia,
          distrito: profile.distrito,
          urbanizacion: profile.urbanizacion,
          codLocal: profile.codLocal,
          email: profile.email,
          telephone: profile.telephone,
          plan: profile.plan || 'free',
          environment: profile.environment || 'beta',
          apisPeruCompanyId: profile.apisPeruCompanyId,
          solUser: profile.solUser,
          solPass: '',
          clientId: '',
          clientSecret: '',
          logoBase64: undefined,
          logoFilename: profile.logoFilename,
          certificadoBase64: undefined,
          certificadoFilename: profile.certificadoFilename,
        };
        this.logoPreview = profile.logoBase64 ? `data:image/png;base64,${profile.logoBase64}` : null;
      },
      error: () => {
        this.showToast('error', 'No se pudo cargar la configuración de empresa');
        this.isLoading = false;
      },
      complete: () => this.isLoading = false,
    });
  }

  save(): void {
    if (!this.isValidForm()) return;

    this.isSaving = true;
    const payload = this.buildPayload();
    this.businessProfileApi.update(payload).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.showToast('success', 'Datos de empresa guardados correctamente');
        this.loadProfile();
      },
      error: (err) => {
        this.showToast('error', err?.error?.message || 'No se pudo guardar la configuración');
        this.isSaving = false;
      },
      complete: () => this.isSaving = false,
    });
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('warning', 'Seleccione un logo en formato de imagen');
      return;
    }
    this.readFileAsBase64(file, (base64) => {
      this.form.logoBase64 = base64;
      this.form.logoFilename = file.name;
      this.logoPreview = `data:${file.type};base64,${base64}`;
    });
    (event.target as HTMLInputElement).value = '';
  }

  onCertificateSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readFileAsBase64(file, (base64) => {
      this.form.certificadoBase64 = base64;
      this.form.certificadoFilename = file.name;
      this.showToast('info', 'Certificado cargado en base64. Si es P12/PFX, luego lo convertiremos a PEM con APIsPerú.');
    });
    (event.target as HTMLInputElement).value = '';
  }

  clearLogo(): void {
    this.form.logoBase64 = null;
    this.form.logoFilename = null;
    this.logoPreview = null;
  }

  clearCertificate(): void {
    this.form.certificadoBase64 = null;
    this.form.certificadoFilename = null;
  }

  get environmentLabel(): string {
    const value = this.form.environment || 'beta';
    const labels: Record<BillingEnvironment, string> = {
      beta: 'Beta SUNAT',
      produccion: 'Producción SUNAT',
      nubefact_beta: 'Beta Nubefact',
      nubefact_produccion: 'Producción Nubefact',
    };
    return labels[value];
  }

  private isValidForm(): boolean {
    if (!this.form.ruc || String(this.form.ruc).length !== 11) {
      this.showToast('warning', 'El RUC debe tener 11 dígitos');
      return false;
    }
    if (!this.form.razonSocial || !this.form.direccion) {
      this.showToast('warning', 'Complete razón social y dirección fiscal');
      return false;
    }
    if (!this.form.ubigueo || String(this.form.ubigueo).length !== 6) {
      this.showToast('warning', 'El ubigeo debe tener 6 dígitos');
      return false;
    }
    return true;
  }

  private buildPayload(): UpdateBusinessProfileRequest {
    const payload: UpdateBusinessProfileRequest = { ...this.form };
    if (!payload.solPass) delete payload.solPass;
    if (!payload.clientId) delete payload.clientId;
    if (!payload.clientSecret) delete payload.clientSecret;
    return payload;
  }

  private readFileAsBase64(file: File, callback: (base64: string) => void): void {
    if (file.size > 200 * 1024) {
      this.showToast('warning', 'El archivo no debe superar 200KB según la documentación de APIsPerú');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      callback(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => this.showToast('error', 'No se pudo leer el archivo seleccionado');
    reader.readAsDataURL(file);
  }

  private emptyForm(): UpdateBusinessProfileRequest {
    return {
      codigoPais: 'PE',
      plan: 'free',
      environment: 'beta',
    };
  }

  private showToast(type: ToastType, message: string): void {
    this.toast = { show: true, type, message };
    window.setTimeout(() => this.toast.show = false, 3500);
  }
}
