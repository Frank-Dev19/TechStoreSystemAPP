import {
  buildPhoneFormValue,
  DEFAULT_PHONE_COUNTRY,
  parseStoredPhoneToFormValue,
} from './phone.util';

describe('phone.util', () => {
  it('usa Perú por defecto y construye E.164 desde número nacional', () => {
    const result = buildPhoneFormValue(DEFAULT_PHONE_COUNTRY, '987654321');

    expect(result.e164).toBe('+51987654321');
    expect(result.nationalNumber).toBe('987654321');
    expect(result.country.iso2).toBe('PE');
  });

  it('hidrata un número E.164 persistido a país y número nacional', () => {
    const result = parseStoredPhoneToFormValue('+14155552671');

    expect(result.country.iso2).toBe('US');
    expect(result.nationalNumber).toBe('4155552671');
    expect(result.e164).toBe('+14155552671');
    expect(result.isLegacy).toBeFalse();
  });

  it('marca como legacy un valor histórico no parseable', () => {
    const result = parseStoredPhoneToFormValue('999111222');

    expect(result.country.iso2).toBe('PE');
    expect(result.nationalNumber).toBe('999111222');
    expect(result.e164).toBeNull();
    expect(result.isLegacy).toBeTrue();
  });
});
