'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT, translationKeys } from '@/lib/utils/translations';
import { PhoneInput } from '@/components/checkout/phone-input';

interface AddressFormProps {
  title: string;
  prefix: 'shippingAddress' | 'billingAddress';
  register: any;
  errors: any;
  disabled?: boolean;
  countryLabel: string;
}

export function AddressForm({
  title,
  prefix,
  register,
  errors,
  disabled = false,
  countryLabel,
}: AddressFormProps) {
  const t = useT();
  const addressErrors = (errors?.[prefix] || {}) as Record<string, { message?: string }>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}.firstName`}>
            {t(translationKeys.checkout.address.firstName, 'First Name')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id={`${prefix}.firstName`}
            disabled={disabled}
            {...register(`${prefix}.firstName`)}
            className={addressErrors.firstName?.message ? 'border-destructive' : undefined}
          />
          {addressErrors.firstName?.message && (
            <p className="text-sm text-destructive">{addressErrors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}.lastName`}>
            {t(translationKeys.checkout.address.lastName, 'Last Name')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id={`${prefix}.lastName`}
            disabled={disabled}
            {...register(`${prefix}.lastName`)}
            className={addressErrors.lastName?.message ? 'border-destructive' : undefined}
          />
          {addressErrors.lastName?.message && (
            <p className="text-sm text-destructive">{addressErrors.lastName.message}</p>
          )}
        </div>
        <PhoneInput
          label={t(translationKeys.checkout.address.phone, 'Phone')}
          namePrefix={prefix}
          register={register}
          errors={errors}
          disabled={disabled}
        />
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${prefix}.street`}>
            {t(translationKeys.checkout.address.street, 'Street')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id={`${prefix}.street`}
            disabled={disabled}
            {...register(`${prefix}.street`)}
            className={addressErrors.street?.message ? 'border-destructive' : undefined}
          />
          {addressErrors.street?.message && (
            <p className="text-sm text-destructive">{addressErrors.street.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}.houseNumber`}>
            {t(translationKeys.checkout.address.houseNumber, 'House Number')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id={`${prefix}.houseNumber`}
            disabled={disabled}
            {...register(`${prefix}.houseNumber`)}
            className={addressErrors.houseNumber?.message ? 'border-destructive' : undefined}
          />
          {addressErrors.houseNumber?.message && (
            <p className="text-sm text-destructive">{addressErrors.houseNumber.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}.city`}>
            {t(translationKeys.checkout.address.city, 'City')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id={`${prefix}.city`}
            disabled={disabled}
            {...register(`${prefix}.city`)}
            className={addressErrors.city?.message ? 'border-destructive' : undefined}
          />
          {addressErrors.city?.message && (
            <p className="text-sm text-destructive">{addressErrors.city.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}.postalCode`}>
            {t(translationKeys.checkout.address.postalCode, 'Postal Code')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id={`${prefix}.postalCode`}
            disabled={disabled}
            {...register(`${prefix}.postalCode`)}
            className={addressErrors.postalCode?.message ? 'border-destructive' : undefined}
          />
          {addressErrors.postalCode?.message && (
            <p className="text-sm text-destructive">{addressErrors.postalCode.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}.country`}>
            {t(translationKeys.checkout.address.country, 'Country')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input id={`${prefix}.country`} value={countryLabel} disabled readOnly />
          <input type="hidden" {...register(`${prefix}.country`)} />
        </div>
      </div>
    </div>
  );
}
