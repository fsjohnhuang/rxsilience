import { Endpoints } from "./Endpoints";
import { isNetworkError } from "../predicates";
import NotImplementedError from "../errors/NotImplementedError";
import FallbackError from "../errors/FallbackError";
import { of } from "rxjs";

type LastFallbackRecord = {
  reason: any;
  error: any;
  count: number;
  createdAt: number;
  updatedAt: number;
};

type Config = {
  shouldFallback:
    | ((error: unknown) => boolean)
    | ((error: unknown) => boolean)[];
  shouldReturnLastFallbackReason: (record: LastFallbackRecord) => boolean;
  shouldDeleteLastFallbackReason: (record: LastFallbackRecord) => boolean;
};

export const ShouldFallbackToNextType = {
  Promise: 1,
  Observable: 2,
} as const;

export type ShouldFallbackToNextType =
  (typeof ShouldFallbackToNextType)[keyof typeof ShouldFallbackToNextType];

/**
 * Class for resilient endpoints - tries next implementation on error based on shouldFallback predicate.
 * Extends Endpoints base class.
 *
 * @param impl - An object implementing the interface (e.g., Schemas) whose methods are used as fetch functions.
 * @param shouldFallback - Optional predicate(s) to determine if we should fallback to next implementation.
 *                        Defaults to [isNetworkError] (network failures trigger fallback).
 *                        Accepts a single function or an array of functions. Falls back if any returns true.
 *
 * @example
 * // Default - fallback on network errors
 * new ResilientEndpoints(remote)
 *
 * // Single custom predicate - fallback on server errors
 * new ResilientEndpoints(remote, (error) => {
 *   if (error instanceof Error && 'status' in error) {
 *     return (error as { status: number }).status >= 500;
 *   }
 *   return false;
 * })
 *
 * // Multiple predicates - fallback on network errors OR server errors
 * new ResilientEndpoints(remote, [
 *   isNetworkError,
 *   (error) => {
 *     if (error instanceof Error && 'status' in error) {
 *       return (error as { status: number }).status >= 500;
 *     }
 *     return false;
 *   }
 * ])
 */
export class ResilientEndpoints<T extends object> extends Endpoints<T> {
  private readonly shouldFallback: Config["shouldFallback"];
  private readonly shouldReturnLastFallbackReason: Config["shouldReturnLastFallbackReason"];
  private readonly shouldDeleteLastFallbackReason: Config["shouldDeleteLastFallbackReason"];
  private readonly _lastFallbackRecord: Map<any, LastFallbackRecord> =
    new Map();

  constructor(impl: T, config?: Config) {
    super(impl);

    this.shouldFallback = config?.shouldFallback ?? [
      isNetworkError,
      (error: unknown) => error instanceof NotImplementedError,
      (error: unknown) => error instanceof FallbackError,
    ];
    this.shouldReturnLastFallbackReason =
      config?.shouldReturnLastFallbackReason ??
      ((record: LastFallbackRecord) => {
        return (
          +new Date() - record.createdAt < 3600 * 1000 && record.count >= 3
        );
      });

    this.shouldDeleteLastFallbackReason =
      config?.shouldDeleteLastFallbackReason ??
      ((record: LastFallbackRecord) =>
        +new Date() - record.updatedAt >= 60 * 1000);
  }

  /**
   * Check if should fallback based on error and the shouldFallback predicates.
   * Returns true if any predicate returns true.
   */
  shouldFallbackToNext(
    error: unknown,
    handler?: any,
    type?: ShouldFallbackToNextType,
  ): boolean {
    const predicates = Array.isArray(this.shouldFallback)
      ? this.shouldFallback
      : [this.shouldFallback];
    const shouldFallback = predicates.some((predicate) => predicate(error));

    if (shouldFallback && handler && type) {
      let record = this._lastFallbackRecord.get(handler);
      if (!(record && record.error === error)) {
        record = record || {
          createdAt: +new Date(),
          updatedAt: +new Date(),
          count: 0,
          error,
          reason:
            (type as ShouldFallbackToNextType) ==
            ShouldFallbackToNextType.Promise
              ? Promise.reject(error)
              : of(error),
        };
        record.count += 1;
        record.updatedAt = +new Date();
        this._lastFallbackRecord.set(handler, record);
      }
    }

    return shouldFallback;
  }

  getLastFallbackReason(handler: any) {
    const record = this._lastFallbackRecord.get(handler);
    if (record) {
      if (this.shouldReturnLastFallbackReason(record)) {
        return record.reason;
      } else if (this.shouldDeleteLastFallbackReason(record)) {
        this._lastFallbackRecord.delete(handler);
      }
    }
  }
}
