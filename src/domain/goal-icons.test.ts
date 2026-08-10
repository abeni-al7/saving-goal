import { describe, expect, it } from "vitest";
import {
  GOAL_ICON_DATA_URL_PREFIX,
  MAX_GOAL_ICON_PAYLOAD_BYTES,
  getGoalIconPayloadBytes,
  isNormalizedGoalIconDataUrl,
} from "./goal-icons";

describe("normalized goal icons", () => {
  it("accepts a PNG data URL at the payload limit", () => {
    const payload = "A".repeat(MAX_GOAL_ICON_PAYLOAD_BYTES);

    expect(
      isNormalizedGoalIconDataUrl(`${GOAL_ICON_DATA_URL_PREFIX}${payload}`),
    ).toBe(true);
    expect(getGoalIconPayloadBytes(payload)).toBe(MAX_GOAL_ICON_PAYLOAD_BYTES);
  });

  it.each([
    ["a non-data URL", "https://example.com/icon.png"],
    ["a non-PNG data URL", "data:image/jpeg;base64,AAAA"],
    ["an empty payload", GOAL_ICON_DATA_URL_PREFIX],
    ["malformed base64", `${GOAL_ICON_DATA_URL_PREFIX}not base64!`],
    [
      "a payload over 100 KB",
      `${GOAL_ICON_DATA_URL_PREFIX}${"A".repeat(MAX_GOAL_ICON_PAYLOAD_BYTES + 1)}`,
    ],
  ])("rejects %s", (_label, value) => {
    expect(isNormalizedGoalIconDataUrl(value)).toBe(false);
  });
});
