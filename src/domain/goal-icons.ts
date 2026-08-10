export const GOAL_ICON_DATA_URL_PREFIX = "data:image/png;base64,";
export const MAX_GOAL_ICON_PAYLOAD_BYTES = 100 * 1024;

const BASE64_PAYLOAD_PATTERN =
  /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/;

export function getGoalIconPayloadBytes(payload: string): number {
  return new TextEncoder().encode(payload).byteLength;
}

export function isNormalizedGoalIconDataUrl(value: string): boolean {
  if (!value.startsWith(GOAL_ICON_DATA_URL_PREFIX)) {
    return false;
  }

  const payload = value.slice(GOAL_ICON_DATA_URL_PREFIX.length);
  return (
    payload.length > 0 &&
    getGoalIconPayloadBytes(payload) <= MAX_GOAL_ICON_PAYLOAD_BYTES &&
    BASE64_PAYLOAD_PATTERN.test(payload)
  );
}
