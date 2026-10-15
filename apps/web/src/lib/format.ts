/**
 * Single source of truth for displaying numbers, money and dates.
 * Never call toFixed / toLocaleString / hardcode "PKR" inside components.
 */

const DEFAULT_CURRENCY = 'PKR';
const LOCALE = 'en-PK';

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    currencyFormatters.set(key, fmt);
  }
  return fmt;
}

/** "PKR 1,500" (whole amounts) or "PKR 1,500.50" (with paisa). */
export function formatCurrency(
  value: number | string | null | undefined,
  options: { currency?: string; decimals?: 'auto' | 0 | 2 } = {},
): string {
  const amount = Number(value) || 0;
  const { currency = DEFAULT_CURRENCY, decimals = 'auto' } = options;
  const digits = decimals === 'auto' ? (Number.isInteger(amount) ? 0 : 2) : decimals;
  // Intl inserts a non-breaking space after the code; normalise to a regular space.
  return getCurrencyFormatter(currency, digits).format(amount).replace(/\u00a0/g, ' ');
}

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatNumber(value: number | string | null | undefined): string {
  return numberFormatter.format(Number(value) || 0);
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value));
}

/** "Zain Ali" -> "ZA", "Tariq" -> "TA" */
export function getInitials(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
