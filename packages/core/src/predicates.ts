// Network error codes
const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EPIPE",
  "ECONNRESET",
  "ERR_BAD_REQUEST", // 404
]);

const MESSAGE_KEYWORDS = ["invalid url", "network"] as const;

/**
 * Checks if an error is a network error.
 * Used as default predicate for ResilientEndpoints fallback.
 */
export function isNetworkError(error: unknown): boolean {
  if (error === null || error === undefined) return false;

  // Check for standard network error codes
  if (error instanceof Error) {
    // Check error code
    if ("code" in error && NETWORK_ERROR_CODES.has(error.code as string)) {
      return true;
    }
    // Check error message
    const msg = error.message.toLowerCase();
    if (MESSAGE_KEYWORDS.find((keyword) => msg.includes(keyword))) {
      return true;
    }
  }

  // Check for axios network errors (no response means network issue)
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    // Axios error with no response indicates network failure
    if (err.response === undefined && err.request !== undefined) {
      return true;
    }
  }

  return false;
}
