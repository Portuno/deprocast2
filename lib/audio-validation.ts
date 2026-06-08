const ALLOWED_EXTENSIONS = [".mp3", ".m4a", ".wav"] as const;

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
] as const;

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return filename.slice(dotIndex).toLowerCase();
}

const GENERIC_MIME_TYPES = [
  "application/octet-stream",
  "binary/octet-stream",
] as const;

export function isAllowedAudioFile(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename);
  const hasValidExtension = ALLOWED_EXTENSIONS.includes(
    extension as (typeof ALLOWED_EXTENSIONS)[number],
  );
  const hasValidMime =
    mimeType === "" ||
    GENERIC_MIME_TYPES.includes(
      mimeType as (typeof GENERIC_MIME_TYPES)[number],
    ) ||
    ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number]);

  return hasValidExtension && hasValidMime;
}
