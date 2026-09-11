export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export interface CardBrandInfo {
  brand: CardBrand;
  name: string;
  pattern: RegExp;
  cvcLength: number;
  formatGaps: number[];
}

const CARD_BRANDS: CardBrandInfo[] = [
  {
    brand: 'visa',
    name: 'Visa',
    pattern: /^4/,
    cvcLength: 3,
    formatGaps: [4, 8, 12],
  },
  {
    brand: 'mastercard',
    name: 'Mastercard',
    pattern: /^(5[1-5]|2[2-7])/,
    cvcLength: 3,
    formatGaps: [4, 8, 12],
  },
  {
    brand: 'amex',
    name: 'American Express',
    pattern: /^3[47]/,
    cvcLength: 4,
    formatGaps: [4, 10],
  },
  {
    brand: 'discover',
    name: 'Discover',
    pattern: /^(6011|65|64[4-9])/,
    cvcLength: 3,
    formatGaps: [4, 8, 12],
  },
];

export function detectCardBrand(cardNumber: string): CardBrandInfo {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  for (const info of CARD_BRANDS) {
    if (info.pattern.test(cleanNumber)) {
      return info;
    }
  }
  return {
    brand: 'unknown',
    name: 'Card',
    pattern: /.*/,
    cvcLength: 3,
    formatGaps: [4, 8, 12],
  };
}

export function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 16);
  const brandInfo = detectCardBrand(clean);
  
  if (brandInfo.brand === 'amex') {
    // 4-6-5 format for AMEX
    const part1 = clean.slice(0, 4);
    const part2 = clean.slice(4, 10);
    const part3 = clean.slice(10, 15);
    return [part1, part2, part3].filter(Boolean).join(' ');
  }
  
  // Standard 4-4-4-4 format
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join(' ');
}

export function formatExpiry(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 2) {
    return clean.slice(0, 2) + '/' + clean.slice(2);
  }
  return clean;
}

export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

export function validateExpiry(expiryStr: string): boolean {
  const parts = expiryStr.split('/');
  if (parts.length !== 2) return false;
  
  const month = parseInt(parts[0], 10);
  const year = parseInt('20' + parts[1], 10);

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

// Assignment specific test cards rules
export const TEST_CARDS = {
  SUCCESS: '4242 4242 4242 4242',
  DECLINE: '4000 0000 0000 0002',
  RETRY_SUCCESS: '4000 0000 0000 0341',
};
