export default class FallbackError extends Error {
  constructor(message = "Fallback on purpose") {
    super(message);
    this.name = "FallbackError";
    // Optional: handle stack trace for browsers
    if (
      typeof (Error as { captureStackTrace?: Function }).captureStackTrace ===
      "function"
    ) {
      (Error as unknown as { captureStackTrace: Function }).captureStackTrace(
        this,
        FallbackError,
      );
    }
  }
}
