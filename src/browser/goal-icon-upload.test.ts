import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_GOAL_ICON_SOURCE_BYTES,
  fitGoalIconDimensions,
  normalizeGoalIcon,
} from "./goal-icon-upload";

const normalizedIcon = "data:image/png;base64,AAAA";

describe("goal icon upload", () => {
  const close = vi.fn();
  const drawImage = vi.fn();
  const decodedImage = {
    width: 256,
    height: 128,
    close,
  } as unknown as ImageBitmap;

  beforeEach(() => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(decodedImage));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      normalizedIcon,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    close.mockClear();
    drawImage.mockClear();
  });

  it.each(["image/png", "image/jpeg", "image/webp"])(
    "accepts and normalizes a %s source",
    async (type) => {
      const file = new File(["image"], "goal-artwork", { type });

      await expect(normalizeGoalIcon(file)).resolves.toBe(normalizedIcon);
      expect(createImageBitmap).toHaveBeenCalledWith(file);
      expect(drawImage).toHaveBeenCalledWith(decodedImage, 0, 0, 128, 64);
      expect(close).toHaveBeenCalledOnce();
    },
  );

  it("rejects unsupported source types before decoding", async () => {
    const file = new File(["image"], "goal.gif", { type: "image/gif" });

    await expect(normalizeGoalIcon(file)).rejects.toThrow(
      "Choose a PNG, JPEG, or WebP image.",
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("rejects sources over 2 MB before decoding", async () => {
    const file = new File(
      [new Uint8Array(MAX_GOAL_ICON_SOURCE_BYTES + 1)],
      "large.png",
      { type: "image/png" },
    );

    await expect(normalizeGoalIcon(file)).rejects.toThrow(
      "Choose an image no larger than 2 MB.",
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("reports image decode failures", async () => {
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("decode"));

    await expect(
      normalizeGoalIcon(new File(["bad"], "bad.png", { type: "image/png" })),
    ).rejects.toThrow("This image could not be read. Choose another file.");
  });

  it("reports canvas encoding failures and closes the decoded image", async () => {
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockImplementationOnce(
      () => {
        throw new Error("encode");
      },
    );

    await expect(
      normalizeGoalIcon(new File(["image"], "goal.png", { type: "image/png" })),
    ).rejects.toThrow(
      "This image could not be processed. Choose another file.",
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("discards a stale selection and closes its decoded image", async () => {
    let resolveDecode!: (image: ImageBitmap) => void;
    vi.mocked(createImageBitmap).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDecode = resolve;
      }),
    );
    const controller = new AbortController();
    const result = normalizeGoalIcon(
      new File(["image"], "old.png", { type: "image/png" }),
      { signal: controller.signal },
    );

    controller.abort();
    resolveDecode(decodedImage);

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(close).toHaveBeenCalledOnce();
    expect(drawImage).not.toHaveBeenCalled();
  });

  it.each([
    [256, 128, { width: 128, height: 64 }],
    [100, 200, { width: 64, height: 128 }],
    [48, 32, { width: 48, height: 32 }],
  ])(
    "fits %sx%s within the limit without cropping or upscaling",
    (width, height, expected) => {
      expect(fitGoalIconDimensions(width, height)).toEqual(expected);
    },
  );

  it("rejects normalized PNG payloads over 100 KB", async () => {
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValueOnce(
      `data:image/png;base64,${"A".repeat(100 * 1024 + 1)}`,
    );

    await expect(
      normalizeGoalIcon(
        new File(["image"], "detailed.png", { type: "image/png" }),
      ),
    ).rejects.toThrow(
      "The processed image is too large. Choose a simpler image.",
    );
    expect(close).toHaveBeenCalledOnce();
  });
});
