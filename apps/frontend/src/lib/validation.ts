import * as yup from 'yup';

/** Regex: disallow characters that can be used for script/HTML injection */
const UNSAFE_STRING_REGEX = /[<>'"`]/;

/** Max lengths aligned with backend */
export const VALIDATION = {
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 200,
  PHONE_MAX_LENGTH: 50,
  STREET_MAX_LENGTH: 500,
  HOUSE_NUMBER_MAX_LENGTH: 50,
  CITY_MAX_LENGTH: 200,
  COMPANY_MAX_LENGTH: 200,
} as const;

/**
 * Yup schema for email: valid format, max length. No script characters.
 */
export function emailSchema(messageInvalid = 'Please provide a valid email address', messageMax = 'Email is too long') {
  return yup
    .string()
    .trim()
    .email(messageInvalid)
    .max(VALIDATION.EMAIL_MAX_LENGTH, messageMax)
    .required('Email is required');
}

/**
 * Yup schema for login password: min/max length, no < or >.
 */
export function passwordLoginSchema(
  messageMin = 'Password must be at least 8 characters',
  messageMax = 'Password must not exceed 128 characters',
  messageInvalidChars = 'Password must not contain < or >',
) {
  return yup
    .string()
    .required('Password is required')
    .min(VALIDATION.PASSWORD_MIN_LENGTH, messageMin)
    .max(VALIDATION.PASSWORD_MAX_LENGTH, messageMax)
    .test('no-script-chars', messageInvalidChars, (v) => !v || !/[<>]/.test(v));
}

/**
 * Yup schema for register password: same as login + at least one letter and one number.
 */
export function passwordRegisterSchema(
  messageMin = 'Password must be at least 8 characters',
  messageMax = 'Password must not exceed 128 characters',
  messageInvalidChars = 'Password must not contain < or >',
  messageLetter = 'Password must contain at least one letter',
  messageNumber = 'Password must contain at least one number',
) {
  return yup
    .string()
    .required('Password is required')
    .min(VALIDATION.PASSWORD_MIN_LENGTH, messageMin)
    .max(VALIDATION.PASSWORD_MAX_LENGTH, messageMax)
    .test('no-script-chars', messageInvalidChars, (v) => !v || !/[<>]/.test(v))
    .test('has-letter', messageLetter, (v) => !v || /[a-zA-Z]/.test(v))
    .test('has-number', messageNumber, (v) => !v || /\d/.test(v));
}

/**
 * Yup schema for safe text (names, address fields): no HTML/script chars, optional max length.
 */
export function safeStringSchema(
  maxLength: number,
  messageMax = 'Value is too long',
  messageInvalid = 'Invalid characters (no < > or quotes)',
) {
  return yup
    .string()
    .trim()
    .max(maxLength, messageMax)
    .test('safe-string', messageInvalid, (v) => !v || !UNSAFE_STRING_REGEX.test(v));
}

/**
 * Required safe string (e.g. required name/address field).
 */
export function requiredSafeStringSchema(
  maxLength: number,
  messageRequired = 'This field is required',
  messageMax = 'Value is too long',
  messageInvalid = 'Invalid characters (no < > or quotes)',
) {
  return safeStringSchema(maxLength, messageMax, messageInvalid).required(messageRequired);
}

export type TranslateFn = (key: string, fallback?: string) => string;

/**
 * Address fields schema (firstName, lastName, street, houseNumber, city, etc.).
 * Call with country code and translate function e.g. createAddressSchema('DE', t).
 */
export function createAddressSchema(countryCode: string, t: TranslateFn) {
  return yup.object({
    firstName: requiredSafeStringSchema(
      VALIDATION.NAME_MAX_LENGTH,
      t('validation.firstNameRequired', 'First name is required'),
      t('validation.firstNameTooLong', 'First name is too long'),
      t('validation.invalidCharacters', 'Invalid characters (no < > or quotes)'),
    ),
    lastName: requiredSafeStringSchema(
      VALIDATION.NAME_MAX_LENGTH,
      t('validation.lastNameRequired', 'Last name is required'),
      t('validation.lastNameTooLong', 'Last name is too long'),
      t('validation.invalidCharacters', 'Invalid characters (no < > or quotes)'),
    ),
    phoneCountryCode: yup.string().required(t('validation.phoneCountryRequired', 'Phone country code is required')),
    phoneNumber: yup
      .string()
      .matches(/^[0-9\s-]{6,18}$/, t('validation.phoneInvalid', 'Phone number is invalid'))
      .required(t('validation.phoneRequired', 'Phone number is required')),
    street: requiredSafeStringSchema(
      VALIDATION.STREET_MAX_LENGTH,
      t('validation.streetRequired', 'Street is required'),
      t('validation.streetTooLong', 'Street is too long'),
      t('validation.invalidCharacters', 'Invalid characters (no < > or quotes)'),
    ),
    houseNumber: requiredSafeStringSchema(
      VALIDATION.HOUSE_NUMBER_MAX_LENGTH,
      t('validation.houseNumberRequired', 'House number is required'),
      t('validation.houseNumberTooLong', 'House number is too long'),
      t('validation.invalidCharacters', 'Invalid characters (no < > or quotes)'),
    ),
    city: requiredSafeStringSchema(
      VALIDATION.CITY_MAX_LENGTH,
      t('validation.cityRequired', 'City is required'),
      t('validation.cityTooLong', 'City is too long'),
      t('validation.invalidCharacters', 'Invalid characters (no < > or quotes)'),
    ),
    postalCode: yup
      .string()
      .matches(/^\d{5}$/, t('validation.postalCodeDigits', 'Postal code must be 5 digits'))
      .required(t('validation.postalCodeRequired', 'Postal code is required')),
    country: yup.string().oneOf([countryCode]).required(t('validation.countryRequired', 'Country is required')),
  });
}
