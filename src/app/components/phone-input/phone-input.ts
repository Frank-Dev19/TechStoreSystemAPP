import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';

import {
  buildPhoneFormValue,
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountry,
  invalidPhoneSentinel,
  parseStoredPhoneToFormValue,
  PHONE_COUNTRIES,
  PhoneCountry,
} from '../../utils/phone.util';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss',
})
export class PhoneInputComponent implements OnInit, OnDestroy {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) e164ControlName!: string;
  @Input({ required: true }) countryControlName!: string;
  @Input({ required: true }) nationalNumberControlName!: string;
  @Input() inputId = 'phone-input';
  @Input() label = 'Teléfono';
  @Input() required = false;
  @Input() submitted = false;
  @Input() appearance: 'default' | 'form-control' = 'default';

  readonly countries = PHONE_COUNTRIES;
  readonly defaultCountry = DEFAULT_PHONE_COUNTRY;

  private readonly subscriptions = new Subscription();
  private isSyncing = false;

  ngOnInit(): void {
    this.ensureControls();
    this.hydrateFromStoredPhoneIfNeeded();
    this.syncHiddenControl();

    this.subscriptions.add(this.countryControl.valueChanges.subscribe(() => this.syncHiddenControl()));
    this.subscriptions.add(this.nationalNumberControl.valueChanges.subscribe(() => this.syncHiddenControl()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get controlInvalid(): boolean {
    return this.e164Control.invalid && (this.e164Control.touched || this.submitted);
  }

  get showRequiredError(): boolean {
    return !!this.e164Control.errors?.['required'] && this.controlInvalid;
  }

  get countryControl() {
    return this.formGroup.get(this.countryControlName)!;
  }

  get nationalNumberControl() {
    return this.formGroup.get(this.nationalNumberControlName)!;
  }

  get e164Control() {
    return this.formGroup.get(this.e164ControlName)!;
  }

  markTouched(): void {
    this.e164Control.markAsTouched();
  }

  private ensureControls(): void {
    if (!this.countryControl || !this.nationalNumberControl || !this.e164Control) {
      throw new Error(`PhoneInputComponent requires controls ${this.countryControlName}, ${this.nationalNumberControlName}, ${this.e164ControlName}`);
    }
  }

  private hydrateFromStoredPhoneIfNeeded(): void {
    const countryValue = this.countryControl.value;
    const nationalNumberValue = String(this.nationalNumberControl.value ?? '').trim();
    if (countryValue && nationalNumberValue) {
      return;
    }

    const parsed = parseStoredPhoneToFormValue(this.e164Control.value);
    this.isSyncing = true;
    this.countryControl.setValue(parsed.country, { emitEvent: false });
    this.nationalNumberControl.setValue(parsed.nationalNumber, { emitEvent: false });
    this.isSyncing = false;
  }

  private syncHiddenControl(): void {
    if (this.isSyncing) {
      return;
    }

    const country = findPhoneCountry(this.countryControl.value);
    const parsed = buildPhoneFormValue(country, this.nationalNumberControl.value);
    const nationalRaw = String(this.nationalNumberControl.value ?? '').trim();
    const nextValue = !nationalRaw ? '' : parsed.e164 ?? invalidPhoneSentinel();

    this.isSyncing = true;
    this.countryControl.setValue(country, { emitEvent: false });
    this.nationalNumberControl.setValue(parsed.nationalNumber, { emitEvent: false });
    this.e164Control.setValue(nextValue, { emitEvent: false });
    this.e164Control.updateValueAndValidity({ emitEvent: false });
    this.isSyncing = false;
  }
}
