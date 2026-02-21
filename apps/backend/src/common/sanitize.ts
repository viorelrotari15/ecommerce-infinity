/**
 * Sanitize user input to prevent XSS and script injection.
 * - Trims whitespace
 * - Removes/neutralizes HTML tags, script patterns, and event handlers
 * - Keeps plain text safe for storage and display
 */
const SCRIPT_OR_HTML_REGEX =
  /<script\b[^>]*>[\s\S]*?<\/script>|<iframe\b[^>]*>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on\w+\s*=\s*["'][^"']*["']|on\w+\s*=\s*[^\s>]+|<\s*\w+[^>]*>|<\/\s*\w+\s*>/gi;

const DANGEROUS_CHARS_REGEX = /[<>'"`]/g;

/**
 * Sanitizes a string for safe storage and display.
 * Removes script tags, HTML, and dangerous characters that could lead to XSS.
 */
export function sanitizeString(value: unknown, maxLength = 2000): string {
  if (value == null) return '';
  const str = String(value).trim();
  const withoutScripts = str.replace(SCRIPT_OR_HTML_REGEX, '');
  const sanitized = withoutScripts.replace(DANGEROUS_CHARS_REGEX, '');
  return sanitized.slice(0, maxLength);
}

/**
 * Sanitize for short text fields (names, phone, etc.). Stricter length.
 */
export function sanitizeShortText(value: unknown, maxLength = 200): string {
  return sanitizeString(value, maxLength);
}

/**
 * Email-safe: trim and length only. Format validated separately by IsEmail.
 */
export function sanitizeEmail(value: unknown, maxLength = 255): string {
  if (value == null) return '';
  const str = String(value).trim().toLowerCase();
  return str.replace(DANGEROUS_CHARS_REGEX, '').slice(0, maxLength);
}

/**
 * Password must not contain HTML/script characters (e.g. < >). Reject if present.
 * Does not modify password; validation should fail if invalid.
 */
export function isPasswordSafe(value: unknown): boolean {
  if (value == null || typeof value !== 'string') return false;
  return !/[<>]/.test(value);
}
