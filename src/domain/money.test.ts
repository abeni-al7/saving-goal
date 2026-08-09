import { describe, expect, it } from "vitest";
import {
  currencyCode,
  currencyFractionDigits,
  formatMinorUnits,
  parseAmountToMinorUnits,
} from "./money";

describe("money", () => {
  const usd = currencyCode("USD");

  it.each([
    ["USD", 2],
    ["JPY", 0],
    ["KWD", 3],
  ])("reads the fraction digits for %s", (code, expectedDigits) => {
    expect(currencyFractionDigits(currencyCode(code))).toBe(expectedDigits);
  });

  it.each([
    ["12.34", "USD", 1234],
    ["12", "JPY", 12],
    ["12.340", "KWD", 12340],
    ["0", "USD", 0],
  ])("parses %s %s into safe minor units", (value, code, expected) => {
    expect(
      parseAmountToMinorUnits(value, currencyCode(code), { allowZero: true }),
    ).toBe(expected);
  });

  it.each(["1.", ".5", "1,00", "1e2", "12.345", "word"])(
    "rejects malformed USD amount %s",
    (value) => {
      expect(() => parseAmountToMinorUnits(value, usd)).toThrow(
        "Enter a valid amount with no more than 2 decimal places.",
      );
    },
  );

  it("rejects negative amounts", () => {
    expect(() => parseAmountToMinorUnits("-1.00", usd)).toThrow(
      "Amount cannot be negative.",
    );
  });

  it("rejects amounts whose minor units are unsafe integers", () => {
    expect(() => parseAmountToMinorUnits("90071992547409.92", usd)).toThrow(
      "Amount is too large.",
    );
  });

  it("rejects zero when a positive amount is required", () => {
    expect(() => parseAmountToMinorUnits("0.00", usd)).toThrow(
      "Amount must be greater than zero.",
    );
  });

  it("formats minor units using the requested locale and currency", () => {
    expect(formatMinorUnits(123456, usd, "en-US")).toBe("$1,234.56");
    expect(formatMinorUnits(123456, usd, "de-DE")).toBe("1.234,56 $");
  });

  it("formats the largest safe minor-unit value without losing precision", () => {
    expect(formatMinorUnits(Number.MAX_SAFE_INTEGER, usd, "en-US")).toBe(
      "$90,071,992,547,409.91",
    );
  });

  it("rejects malformed currency codes", () => {
    expect(() => currencyCode("usd")).toThrow(
      "Currency must be a three-letter ISO code.",
    );
  });

  it("rejects unknown currency codes", () => {
    expect(() => currencyCode("ZZZ")).toThrow("Currency is not supported.");
  });
});
