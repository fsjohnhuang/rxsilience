/**
 * Base class for endpoint implementations.
 * Subclasses: ResilientEndpoints (with fallback), Endpoints (direct call).
 *
 * @param impl - An object implementing the interface (e.g., Schemas)
 *               whose methods are used as fetch functions.
 */
export class Endpoints<T extends object> {
  readonly impl: T;
  constructor(impl: T) {
    this.impl = impl;
  }

  /**
   * Returns all methods of the implementation as endpoint functions.
   * Method names become the fetch keys.
   */
  get endpoints(): T {
    return this.impl;
  }
}
