import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/min';

export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const INVALID_E164_SENTINEL = '__INVALID_PHONE__';

export type PhoneCountry = {
  iso2: CountryCode;
  name: string;
  dialCode: string;
  label: string;
};

export type ParsedPhoneFormValue = {
  country: PhoneCountry;
  nationalNumber: string;
  e164: string | null;
  isLegacy: boolean;
};

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined'
    ? new Intl.DisplayNames(['es-PE', 'es', 'en'], { type: 'region' })
    : null;

export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .map((iso2) => {
    const dialCode = `+${getCountryCallingCode(iso2)}`;
    const name = regionNames?.of(iso2) ?? iso2;
    return {
      iso2,
      name,
      dialCode,
      label: `${name} (${dialCode})`,
    };
  })
  .sort((left, right) => {
    if (left.iso2 === 'PE') return -1;
    if (right.iso2 === 'PE') return 1;
    return left.name.localeCompare(right.name, 'es');
  });

export const DEFAULT_PHONE_COUNTRY =
  PHONE_COUNTRIES.find((country) => country.iso2 === 'PE') ?? PHONE_COUNTRIES[0];

export function findPhoneCountry(value: PhoneCountry | CountryCode | string | null | undefined): PhoneCountry {
  if (!value) {
    return DEFAULT_PHONE_COUNTRY;
  }

  if (typeof value === 'object' && 'iso2' in value) {
    return PHONE_COUNTRIES.find((country) => country.iso2 === value.iso2) ?? DEFAULT_PHONE_COUNTRY;
  }

  const normalized = String(value).trim().toUpperCase();
  return (
    PHONE_COUNTRIES.find(
      (country) =>
        country.iso2 === normalized ||
        country.dialCode === normalized ||
        country.label.toUpperCase() === normalized,
    ) ?? DEFAULT_PHONE_COUNTRY
  );
}

export function sanitizeNationalPhoneInput(value: unknown): string {
  return String(value ?? '').replace(/\D+/g, '').trim();
}

export function buildPhoneFormValue(
  countryInput: PhoneCountry | CountryCode | string | null | undefined,
  nationalNumberInput: unknown,
): ParsedPhoneFormValue {
  const country = findPhoneCountry(countryInput);
  const nationalNumber = sanitizeNationalPhoneInput(nationalNumberInput);

  if (!nationalNumber) {
    return {
      country,
      nationalNumber: '',
      e164: null,
      isLegacy: false,
    };
  }

  const parsed = parsePhoneNumberFromString(nationalNumber, country.iso2);
  return {
    country,
    nationalNumber,
    e164: parsed?.isValid() ? parsed.number : null,
    isLegacy: false,
  };
}

export function parseStoredPhoneToFormValue(value: unknown): ParsedPhoneFormValue {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return {
      country: DEFAULT_PHONE_COUNTRY,
      nationalNumber: '',
      e164: null,
      isLegacy: false,
    };
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.isValid() && parsed.country) {
    return {
      country: findPhoneCountry(parsed.country),
      nationalNumber: parsed.nationalNumber,
      e164: parsed.number,
      isLegacy: false,
    };
  }

  return {
    country: DEFAULT_PHONE_COUNTRY,
    nationalNumber: sanitizeNationalPhoneInput(trimmed) || trimmed,
    e164: null,
    isLegacy: true,
  };
}

export function normalizePhoneInputForValidation(value: unknown): string | null {
  const parsed = parseStoredPhoneToFormValue(value);
  return parsed.e164 ?? null;
}

export function normalizePhoneToE164(value: unknown): string | null {
  if (typeof value === 'string' && value === INVALID_E164_SENTINEL) {
    return null;
  }

  const parsed = parseStoredPhoneToFormValue(value);
  if (parsed.e164) {
    return parsed.e164;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const built = buildPhoneFormValue(DEFAULT_PHONE_COUNTRY, raw);
  return built.e164;
}

export function invalidPhoneSentinel(): string {
  return INVALID_E164_SENTINEL;
}

export function e164PhoneValidator(options?: { required?: boolean }): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return options?.required ? { required: true } : null;
    }

    if (raw === INVALID_E164_SENTINEL) {
      return { e164Phone: true };
    }

    return normalizePhoneToE164(raw) ? null : { e164Phone: true };
  };
}
