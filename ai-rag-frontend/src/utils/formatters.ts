/**
 * Format bytes into human readable KB / MB
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format ISO date string into readable date time
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Safely format upload errors into user-friendly messages without exposing
 * internal server details, stack traces, database schema names, or sensitive tokens.
 */
export function formatUploadErrorMessage(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred while uploading the PDF. Please try again.";
  }

  const rawMessage =
    typeof error === "string"
      ? error
      : (error as any)?.message && typeof (error as any).message === "string"
        ? (error as any).message
        : String(error);

  const lower = rawMessage.toLowerCase();

  // Network / Connection errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("econnrefused") ||
    lower.includes("offline")
  ) {
    return "Unable to connect to the server. Please check your network connection and try again.";
  }

  // Authentication errors
  if (
    lower.includes("authentication required") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("jwt") ||
    lower.includes("token")
  ) {
    return "Your session has expired. Please sign in again to upload documents.";
  }

  // Oversized file errors
  if (
    lower.includes("limit_file_size") ||
    lower.includes("file too large") ||
    lower.includes("too large") ||
    lower.includes("413") ||
    lower.includes("payload too large") ||
    lower.includes("exceeds")
  ) {
    return "The selected file is too large. Maximum allowed size is 12MB.";
  }

  // Unsupported or invalid file errors
  if (
    lower.includes("only pdf files are allowed") ||
    lower.includes("pdf file is required") ||
    lower.includes("invalid file") ||
    lower.includes("unsupported")
  ) {
    return "Invalid file format. Please upload a standard PDF document (.pdf).";
  }

  // Filter out internal server errors, database details, stack traces, paths, or secrets
  const containsSensitiveDetails =
    rawMessage.includes("at ") ||
    lower.includes("prisma") ||
    lower.includes("qdrant") ||
    lower.includes("supabase") ||
    lower.includes("<!doctype") ||
    lower.includes("evalmachine") ||
    lower.includes("internal server error") ||
    lower.includes("500");

  if (containsSensitiveDetails) {
    return "Server failed to process the upload. Please try again later.";
  }

  // If the backend sent a concise, safe message, reuse it
  if (rawMessage.trim().length > 0 && rawMessage.length <= 120) {
    return rawMessage.trim();
  }

  return "Failed to upload PDF. Please check the file and try again.";
}
