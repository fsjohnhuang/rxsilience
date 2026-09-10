import { Observable, catchError, isObservable, map } from "rxjs";
import {
  ResilientEndpoints,
  ShouldFallbackToNextType,
} from "./endpoints/ResilientEndpoints";
import { Endpoints } from "./endpoints/Endpoints";

type HandlerResult = Promise<unknown> | Observable<unknown> | unknown;
type Handler = (...args: any[]) => HandlerResult;

/**
 * Factory for creating endpoint services with fallback support.
 *
 * @example
 * const factory = new EndpointFactory<Schemas>()
 * factory.register(new ResilientEndpoints(remote))
 * factory.register(new Endpoints(local))
 * const endpoints = factory.build()
 */
export class EndpointFactory<S extends object> {
  private implementations: Endpoints<object>[] = [];

  constructor() {}

  /**
   * Register an endpoint implementation.
   * @param impl - Either an Endpoints subclass instance or a plain object.
   */
  register(impl: Endpoints<object> | object): void {
    if (impl instanceof ResilientEndpoints || impl instanceof Endpoints) {
      this.implementations.push(impl);
    } else {
      this.implementations.push(new Endpoints(impl));
    }
  }

  /**
   * Build the endpoint service with all registered implementations.
   * ResilientEndpoints are wrapped with try/catch and fall through to next on error.
   * Endpoints are called directly as fallback.
   */
  build<R extends S = S>(): R {
    const stub = {} as Record<string, Handler>;
    const implementations = this.implementations;

    // Get all method names from the first implementation
    const firstImpl = implementations[0];
    if (!firstImpl) {
      return stub as R;
    }

    // Get method names from prototype if available, otherwise from the object itself
    const proto = Object.getPrototypeOf(firstImpl.endpoints);
    const methodNames =
      proto && proto !== Object.prototype
        ? Object.getOwnPropertyNames(proto).filter(
            (name) => name !== "constructor",
          )
        : Object.keys(firstImpl.endpoints);

    for (const methodName of methodNames) {
      // Collect all handlers for this method in order
      const handlers: Handler[] = [];
      for (const impl of implementations) {
        const fn = (impl.endpoints as Record<string, Handler>)[methodName];
        if (fn) {
          handlers.push(fn);
        }
      }

      if (handlers.length > 0) {
        if (handlers.length === 1) {
          // Single handler - return as is, preserving original type
          stub[methodName] = handlers[0];
        } else {
          // Multiple handlers - wrap ResilientEndpoints handlers with try/catch
          stub[methodName] = (...args: any[]) => {
            let lastError: unknown;
            for (let i = 0; i < handlers.length; i++) {
              lastError = undefined;
              const handler = handlers[i];
              const impl = implementations[i];

              try {
                const result =
                  (impl instanceof ResilientEndpoints
                    ? impl.getLastFallbackReason(handler)
                    : undefined) || handler(...args);

                if (isObservable(result)) {
                  let j = i + 1;
                  return handlers.slice(j).reduce((result, handler) => {
                    let impl = implementations[j - 1];
                    j += 1;
                    if (impl instanceof ResilientEndpoints) {
                      return result.pipe(
                        map((x) => x),
                        catchError((e) => {
                          if (
                            impl instanceof ResilientEndpoints &&
                            impl.shouldFallbackToNext(
                              e,
                              handlers[j - 2],
                              ShouldFallbackToNextType.Observable,
                            )
                          ) {
                            return handler(...args) as Observable<unknown>;
                          } else {
                            throw e;
                          }
                        }),
                      );
                    } else {
                      return result;
                    }
                  }, result);
                } else if (result instanceof Promise) {
                  let j = i + 1;
                  return handlers.slice(j).reduce((result, handler) => {
                    let impl = implementations[j - 1];
                    j += 1;
                    if (impl instanceof ResilientEndpoints) {
                      return result.catch((e) => {
                        if (
                          impl.shouldFallbackToNext(
                            e,
                            handlers[j - 2],
                            ShouldFallbackToNextType.Promise,
                          )
                        ) {
                          return handler(...args);
                        } else {
                          throw e;
                        }
                      });
                    }

                    return result;
                  }, result);
                } else {
                  return result;
                }
              } catch (e) {
                // Handle the error thrown from the handler body straightly.
                if (
                  impl instanceof ResilientEndpoints &&
                  impl.shouldFallbackToNext(e) &&
                  i < handlers.length - 1
                ) {
                  lastError = e;
                }

                if (!lastError) {
                  throw e;
                }
              }
            }

            throw lastError;
          };
        }
      }
    }

    return stub as R;
  }
}
