import { describe, expect, it } from "vitest";
import { relabelCapturedPhotos } from "@/lib/capturedPhotoNaming";

describe("relabelCapturedPhotos", () => {
  it("renames camera photos with timestamp, location, and index suffixes", () => {
    const files = [
      new File(["a"], "IMG_001.JPG", { type: "image/jpeg" }),
      new File(["b"], "IMG_002.png", { type: "image/png" }),
    ];

    const result = relabelCapturedPhotos(files, {
      timestamp: new Date(2026, 4, 19, 13, 5, 9),
      location: "  Main St #42  ",
      prefix: "Case Photo",
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("case-photo-20260519-130509-main-st-42.jpg");
    expect(result[1].name).toBe("case-photo-20260519-130509-main-st-42-2.png");
    expect(result[0].type).toBe("image/jpeg");
    expect(result[1].type).toBe("image/png");
  });

  it("falls back to defaults when location or extension are missing", () => {
    const files = [new File(["data"], "camera_upload", { type: "image/jpeg" })];

    const result = relabelCapturedPhotos(files, {
      timestamp: new Date(2026, 4, 19, 8, 1, 2),
      location: "   ",
      prefix: "",
    });

    expect(result[0].name).toBe("photo-20260519-080102-unknown-location.jpg");
  });
});