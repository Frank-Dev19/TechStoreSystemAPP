import { of } from 'rxjs';
import { MailSettingsPage } from './mail-settings';

describe('MailSettingsPage Mailtrap', () => {
  let page: MailSettingsPage;
  let api: any;
  beforeEach(() => {
    api = { update: jasmine.createSpy().and.returnValue(of({ purpose: 'ELECTRONIC_BILLING', transport: 'MAILTRAP_API', hasApiToken: true })), test: jasmine.createSpy().and.returnValue(of({ ok: true, message: 'Aceptado' })), getAll: jasmine.createSpy().and.returnValue(of([])) };
    page = new MailSettingsPage(api);
    page.profiles.set('ELECTRONIC_BILLING', { purpose: 'ELECTRONIC_BILLING', transport: 'MAILTRAP_API', hasApiToken: true } as any);
    page.form.fromEmail = 'testeo@macrochips.com';
  });
  it('saves corporate identity without SMTP credentials in API mode', () => {
    page.save();
    expect(api.update).toHaveBeenCalled();
  });
  it('requires a recipient for a real API test', () => {
    page.test();
    expect(api.test).not.toHaveBeenCalled();
    expect(page.toast.message).toContain('destinatario');
  });
  it('blocks incomplete token configuration', () => {
    page.profiles.get('ELECTRONIC_BILLING')!.hasApiToken = false;
    page.save();
    expect(api.update).not.toHaveBeenCalled();
  });
  it('keeps SMTP validation for legacy profiles', () => {
    page.profiles.get('ELECTRONIC_BILLING')!.transport = 'SMTP';
    page.save();
    expect(api.update).not.toHaveBeenCalled();
    expect(page.toast.message).toContain('SMTP');
  });
});
