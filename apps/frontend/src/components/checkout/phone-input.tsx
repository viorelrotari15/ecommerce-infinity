'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT, translationKeys } from '@/lib/utils/translations';
import { phoneCountries } from '@/lib/phone-countries';

interface PhoneInputProps {
  label: string;
  namePrefix: string;
  register: any;
  errors: any;
  disabled?: boolean;
}

function toFlagEmoji(iso2: string) {
  if (!iso2 || iso2.length !== 2) return '';
  const chars = iso2.toUpperCase().split('');
  return String.fromCodePoint(
    ...chars.map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function PhoneInput({
  label,
  namePrefix,
  register,
  errors,
  disabled = false,
}: PhoneInputProps) {
  const t = useT();
  const fieldErrors = errors?.[namePrefix] || {};

  return (
    <div className="space-y-2">
      <Label>
        {label}
        <span className="text-destructive"> *</span>
      </Label>
      <div className="flex gap-2">
        <select
          className="h-10 w-[110px] rounded-md border border-input bg-background px-2 py-2 text-sm"
          disabled={disabled}
          {...register(`${namePrefix}.phoneCountryCode`)}
        >
          {phoneCountries.map((country) => (
            <option key={country.iso2} value={country.dialCode}>
              {toFlagEmoji(country.iso2)} {country.dialCode}
            </option>
          ))}
        </select>
        <Input
          id={`${namePrefix}.phoneNumber`}
          disabled={disabled}
          placeholder={t(translationKeys.checkout.address.phoneNumberPlaceholder, 'Phone number')}
          {...register(`${namePrefix}.phoneNumber`)}
          className={fieldErrors.phoneNumber?.message ? 'border-destructive flex-1' : 'flex-1'}
        />
      </div>
      {fieldErrors.phoneCountryCode?.message && (
        <p className="text-sm text-destructive">{fieldErrors.phoneCountryCode.message}</p>
      )}
      {fieldErrors.phoneNumber?.message && (
        <p className="text-sm text-destructive">{fieldErrors.phoneNumber.message}</p>
      )}
    </div>
  );
}
