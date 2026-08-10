import {
  GOAL_ICON_DATA_URL_PREFIX,
  MAX_GOAL_ICON_PAYLOAD_BYTES,
  getGoalIconPayloadBytes,
  isNormalizedGoalIconDataUrl,
} from "../domain/goal-icons";

export const MAX_GOAL_ICON_SOURCE_BYTES = 2 * 1024 * 1024;
export const MAX_GOAL_ICON_DIMENSION = 128;

const ACCEPTED_GOAL_ICON_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

interface NormalizeGoalIconOptions {
  readonly signal?: AbortSignal;
}

interface GoalIconDimensions {
  readonly width: number;
  readonly height: number;
}

export async function normalizeGoalIcon(
  file: File,
  options: NormalizeGoalIconOptions = {},
): Promise<string> {
  validateSource(file);
  throwIfAborted(options.signal);

  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throwIfAborted(options.signal);
    throw new Error("This image could not be read. Choose another file.");
  }

  try {
    throwIfAborted(options.signal);
    const dimensions = fitGoalIconDimensions(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error(
        "This image could not be processed. Choose another file.",
      );
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    throwIfAborted(options.signal);

    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      throw new Error(
        "This image could not be processed. Choose another file.",
      );
    }

    throwIfAborted(options.signal);
    if (
      dataUrl.startsWith(GOAL_ICON_DATA_URL_PREFIX) &&
      getGoalIconPayloadBytes(dataUrl.slice(GOAL_ICON_DATA_URL_PREFIX.length)) >
        MAX_GOAL_ICON_PAYLOAD_BYTES
    ) {
      throw new Error(
        "The processed image is too large. Choose a simpler image.",
      );
    }

    if (!isNormalizedGoalIconDataUrl(dataUrl)) {
      throw new Error(
        "This image could not be processed. Choose another file.",
      );
    }

    return dataUrl;
  } finally {
    image.close();
  }
}

export function fitGoalIconDimensions(
  sourceWidth: number,
  sourceHeight: number,
): GoalIconDimensions {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error("This image could not be read. Choose another file.");
  }

  const scale = Math.min(
    1,
    MAX_GOAL_ICON_DIMENSION / Math.max(sourceWidth, sourceHeight),
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function validateSource(file: File): void {
  if (!ACCEPTED_GOAL_ICON_TYPES.has(file.type)) {
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  }

  if (file.size > MAX_GOAL_ICON_SOURCE_BYTES) {
    throw new Error("Choose an image no larger than 2 MB.");
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new DOMException(
      "The image selection is no longer current.",
      "AbortError",
    );
  }
}
