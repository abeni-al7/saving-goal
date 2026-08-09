import type { CurrencyCode } from "./types";

const MAX_SAFE_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER);
const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

export interface ParseAmountOptions {
  readonly allowZero?: boolean;
}

export function currencyCode(value: string): CurrencyCode {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error("Currency must be a three-letter ISO code.");
  }

  if (!SUPPORTED_CURRENCIES.has(value)) {
    throw new Error("Currency is not supported.");
  }

  return value as CurrencyCode;
}

export function currencyFractionDigits(currency: CurrencyCode): number {
  const fractionDigits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;

  if (fractionDigits === undefined) {
    throw new Error("Currency fraction digits are unavailable.");
  }

  return fractionDigits;
}

export function parseAmountToMinorUnits(
  value: string,
  currency: CurrencyCode,
  options: ParseAmountOptions = {},
): number {
  const normalizedValue = value.trim();
  if (normalizedValue.startsWith("-")) {
    throw new Error("Amount cannot be negative.");
  }

  const fractionDigits = currencyFractionDigits(currency);
  const amountPattern =
    fractionDigits === 0
      ? /^\d+$/
      : new RegExp(`^\\d+(?:\\.\\d{1,${fractionDigits}})?$`);

  if (!amountPattern.test(normalizedValue)) {
    throw new Error(
      `Enter a valid amount with no more than ${fractionDigits} decimal places.`,
    );
  }

  const [wholeUnits, fraction = ""] = normalizedValue.split(".");
  const paddedFraction = fraction.padEnd(fractionDigits, "0");
  const scale = 10n ** BigInt(fractionDigits);
  const minorUnits = BigInt(wholeUnits) * scale + BigInt(paddedFraction || "0");

  if (minorUnits > MAX_SAFE_MINOR_UNITS) {
    throw new Error("Amount is too large.");
  }

  if (minorUnits === 0n && !options.allowZero) {
    throw new Error("Amount must be greater than zero.");
  }

  return Number(minorUnits);
}

export function formatMinorUnits(
  amountMinorUnits: number,
  currency: CurrencyCode,
  locale?: string,
): string {
  if (!Number.isSafeInteger(amountMinorUnits)) {
    throw new Error("Amount must be a safe integer in minor units.");
  }

  const fractionDigits = currencyFractionDigits(currency);
  const scale = 10n ** BigInt(fractionDigits);
  const amount = BigInt(amountMinorUnits);
  const wholeUnits = amount / scale;
  const fractionMinorUnits = amount < 0 ? -(amount % scale) : amount % scale;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });

  if (fractionDigits === 0) {
    return formatter.format(wholeUnits);
  }

  const localizedFraction = new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumIntegerDigits: fractionDigits,
  }).format(fractionMinorUnits);
  const valueForParts = amount < 0 && wholeUnits === 0n ? -0 : wholeUnits;

  return formatter
    .formatToParts(valueForParts)
    .map((part) => (part.type === "fraction" ? localizedFraction : part.value))
    .join("");
}
