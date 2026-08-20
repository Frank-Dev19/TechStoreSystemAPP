export type MailPurpose = 'ELECTRONIC_BILLING' | 'PASSWORD_RESET';
export type MailEncryption = 'SSL_TLS' | 'STARTTLS' | 'NONE';

export interface MailSetting {
  purpose: MailPurpose;
  host: string;
  port: number;
  encryption: MailEncryption;
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  subjectTemplate: string | null;
  introText: string | null;
  footerText: string | null;
  isActive: boolean;
  hasPassword: boolean;
  passwordSource: 'DATABASE' | 'ENVIRONMENT' | 'NONE';
  isConfigured: boolean;
  lastTestedAt: string | null;
  lastTestSuccessful: boolean | null;
  lastTestMessage: string | null;
  updatedAt: string | null;
}

export interface UpdateMailSettingRequest {
  host: string;
  port: number;
  encryption: MailEncryption;
  username: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  subjectTemplate?: string | null;
  introText?: string | null;
  footerText?: string | null;
  isActive: boolean;
}

export interface TestMailSettingResponse {
  ok: boolean;
  message: string;
}
