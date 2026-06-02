type CaptureNameOptions = {
  location?: string | null;
  timestamp?: Date;
  prefix?: string;
};

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function extensionOf(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "jpg";
  return parts.pop()?.toLowerCase() || "jpg";
}

export function relabelCapturedPhotos(
  files: File[],
  options: CaptureNameOptions = {},
): File[] {
  if (!files.length) return [];

  const {
    location,
    timestamp = new Date(),
    prefix = "photo",
  } = options;

  const ts = formatTimestamp(timestamp);
  const locationSegment = sanitizeSegment(location || "unknown-location") || "unknown-location";
  const prefixSegment = sanitizeSegment(prefix) || "photo";

  return files.map((file, index) => {
    const ext = extensionOf(file.name);
    const suffix = index > 0 ? `-${index + 1}` : "";
    const nextName = `${prefixSegment}-${ts}-${locationSegment}${suffix}.${ext}`;

    return new File([file], nextName, {
      type: file.type,
      lastModified: file.lastModified,
    });
  });
}
