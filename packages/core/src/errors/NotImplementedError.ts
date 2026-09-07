export default class NotImplementedError extends Error {
  constructor(message = "This method is not implemented") {
    super(message);
    this.name = "NotImplementedError";
    // Optional: handle stack trace for browsers
    if (
      typeof (Error as { captureStackTrace?: Function }).captureStackTrace ===
      "function"
    ) {
      (Error as unknown as { captureStackTrace: Function }).captureStackTrace(
        this,
        NotImplementedError,
      );
    }
  }
}
