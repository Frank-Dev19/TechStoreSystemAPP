import { Component, OnInit } from '@angular/core';
import {
  MailEncryption,
  MailPurpose,
  MailSetting,
  UpdateMailSettingRequest,
} from '../../models/mail-settings/mail-settings.model';
import { MailSettingsApiService } from '../../services/mail-settings-api.service';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface MailSettingForm extends UpdateMailSettingRequest {
  password: string;
}

@Component({
  selector: 'app-mail-settings',
  standalone: false,
  templateUrl: './mail-settings.html',
  styleUrl: './mail-settings.scss',
})
export class MailSettingsPage implements OnInit {
  readonly purposes: MailPurpose[] = ['ELECTRONIC_BILLING', 'PASSWORD_RESET'];
  readonly encryptions: Array<{ value: MailEncryption; label: string }> = [
    { value: 'SSL_TLS', label: 'SSL/TLS' },
    { value: 'STARTTLS', label: 'STARTTLS' },
    { value: 'NONE', label: 'Sin cifrado' },
  ];

  activePurpose: MailPurpose = 'ELECTRONIC_BILLING';
  profiles = new Map<MailPurpose, MailSetting>();
  form: MailSettingForm = this.emptyForm();
  testRecipient = '';
  isLoading = false;
  isSaving = false;
  isTesting = false;
  showPassword = false;

  toast = { show: false, type: 'info' as ToastType, message: '' };

  constructor(private readonly api: MailSettingsApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.api.getAll().subscribe({
      next: (profiles) => {
        this.profiles = new Map(profiles.map((profile) => [profile.purpose, profile]));
        this.loadActiveForm();
      },
      error: (error) => {
        this.showToast('error', error?.error?.message || 'No se pudo cargar la configuración de correo');
        this.isLoading = false;
      },
      complete: () => this.isLoading = false,
    });
  }

  selectPurpose(purpose: MailPurpose): void {
    if (this.isSaving || this.isTesting) return;
    this.activePurpose = purpose;
    this.testRecipient = '';
    this.showPassword = false;
    this.loadActiveForm();
  }

  save(): void {
    this.persist(true);
  }

  test(): void {
    if (!this.validate()) return;
    if (this.testRecipient && !this.isEmail(this.testRecipient)) {
      this.showToast('warning', 'Ingrese un correo de prueba válido');
      return;
    }

    this.persist(false, () => {
      this.isTesting = true;
      this.api.test(this.activePurpose, this.testRecipient).subscribe({
        next: (result) => {
          this.showToast('success', result.message);
          this.load();
        },
        error: (error) => {
          this.showToast('error', error?.error?.message || 'No se pudo validar la conexión SMTP');
          this.isTesting = false;
        },
        complete: () => this.isTesting = false,
      });
    });
  }

  get activeProfile(): MailSetting | undefined {
    return this.profiles.get(this.activePurpose);
  }

  get purposeTitle(): string {
    return this.activePurpose === 'ELECTRONIC_BILLING'
      ? 'Comprobantes electrónicos'
      : 'Recuperación de contraseña';
  }

  get purposeDescription(): string {
    return this.activePurpose === 'ELECTRONIC_BILLING'
      ? 'Remitente utilizado para enviar el PDF, XML y CDR de boletas y facturas.'
      : 'Remitente utilizado para enviar enlaces seguros de restablecimiento de contraseña.';
  }

  get passwordHint(): string {
    if (!this.activeProfile?.hasPassword) return 'Ingrese la contraseña de la cuenta SMTP';
    return this.activeProfile.passwordSource === 'DATABASE'
      ? 'Contraseña guardada. Déjelo vacío para conservarla.'
      : 'Usando contraseña del entorno. Ingrese una para reemplazarla.';
  }

  private persist(showSuccess: boolean, afterSave?: () => void): void {
    if (!this.validate()) return;
    this.isSaving = true;
    const payload = this.buildPayload();
    this.api.update(this.activePurpose, payload).subscribe({
      next: (profile) => {
        this.profiles.set(profile.purpose, profile);
        this.form.password = '';
        if (showSuccess) this.showToast('success', 'Configuración de correo guardada correctamente');
        afterSave?.();
      },
      error: (error) => {
        this.showToast('error', error?.error?.message || 'No se pudo guardar la configuración');
        this.isSaving = false;
      },
      complete: () => this.isSaving = false,
    });
  }

  private loadActiveForm(): void {
    const profile = this.activeProfile;
    if (!profile) {
      this.form = this.emptyForm();
      return;
    }
    this.form = {
      host: profile.host,
      port: profile.port,
      encryption: profile.encryption,
      username: profile.username,
      password: '',
      fromName: profile.fromName,
      fromEmail: profile.fromEmail,
      replyTo: profile.replyTo,
      subjectTemplate: profile.subjectTemplate,
      introText: profile.introText,
      footerText: profile.footerText,
      isActive: profile.isActive,
    };
  }

  private buildPayload(): UpdateMailSettingRequest {
    const payload: UpdateMailSettingRequest = {
      ...this.form,
      host: this.form.host.trim(),
      username: this.form.username.trim(),
      fromName: this.form.fromName.trim(),
      fromEmail: this.form.fromEmail.trim(),
      replyTo: this.form.replyTo?.trim() || null,
      subjectTemplate: this.form.subjectTemplate?.trim() || null,
      introText: this.form.introText?.trim() || null,
      footerText: this.form.footerText?.trim() || null,
    };
    if (!this.form.password) delete payload.password;
    return payload;
  }

  private validate(): boolean {
    if (!this.form.host.trim() || !this.form.username.trim()) {
      this.showToast('warning', 'Complete el servidor SMTP y el usuario');
      return false;
    }
    if (!Number.isInteger(Number(this.form.port)) || this.form.port < 1 || this.form.port > 65535) {
      this.showToast('warning', 'Ingrese un puerto SMTP válido');
      return false;
    }
    if (!this.form.fromName.trim() || !this.isEmail(this.form.fromEmail)) {
      this.showToast('warning', 'Complete el nombre y un correo remitente válido');
      return false;
    }
    if (this.form.replyTo && !this.isEmail(this.form.replyTo)) {
      this.showToast('warning', 'El correo de respuesta no es válido');
      return false;
    }
    if (!this.activeProfile?.hasPassword && !this.form.password) {
      this.showToast('warning', 'Ingrese la contraseña SMTP');
      return false;
    }
    return true;
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private emptyForm(): MailSettingForm {
    return {
      host: '',
      port: 465,
      encryption: 'SSL_TLS',
      username: '',
      password: '',
      fromName: 'Macrochips',
      fromEmail: '',
      replyTo: null,
      subjectTemplate: null,
      introText: null,
      footerText: null,
      isActive: true,
    };
  }

  private showToast(type: ToastType, message: string): void {
    const normalized = Array.isArray(message) ? message.join('. ') : message;
    this.toast = { show: true, type, message: normalized };
    window.setTimeout(() => this.toast.show = false, 4200);
  }
}
