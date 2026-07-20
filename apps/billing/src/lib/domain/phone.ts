const PHONE_REGEX = /^[6-9]\d{9}$/;

export function normalizeIndianPhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(value: string): boolean {
  return PHONE_REGEX.test(normalizeIndianPhone(value));
}
