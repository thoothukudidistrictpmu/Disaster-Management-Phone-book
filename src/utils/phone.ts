/**
 * Utilities for parsing and formatting Indian mobile numbers
 */

export function cleanIndianMobile(phoneStr: string | null | undefined): string | null {
  if (!phoneStr) return null;
  // Remove all non-numeric characters
  const digits = phoneStr.replace(/\D/g, '');

  // If 12 digits starting with 91, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  // If 11 digits starting with 0, strip 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  // If 10 digits
  if (digits.length === 10) {
    return digits;
  }

  // If more than 10 digits, attempt to extract the last 10 digits if it starts with valid Indian series (6-9)
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    if (/^[6-9]/.test(last10)) {
      return last10;
    }
  }

  return digits.length >= 7 ? digits : null;
}

export function isValidIndianMobile(cleanDigits: string | null | undefined): boolean {
  if (!cleanDigits) return false;
  return cleanDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanDigits);
}

export function getCallLink(phoneStr: string | null | undefined): string {
  const clean = cleanIndianMobile(phoneStr);
  if (!clean) return '#';
  if (clean.length === 10) {
    return `tel:+91${clean}`;
  }
  return `tel:${clean}`;
}

export function getWhatsAppLink(phoneStr: string | null | undefined): string {
  const clean = cleanIndianMobile(phoneStr);
  if (!clean || !isValidIndianMobile(clean)) return '#';
  return `https://wa.me/91${clean}`;
}

export function formatIndianMobileDisplay(phoneStr: string | null | undefined): string {
  if (!phoneStr) return '—';
  const clean = cleanIndianMobile(phoneStr);
  if (clean && clean.length === 10) {
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phoneStr.trim();
}
