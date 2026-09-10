# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rxsilience is a TypeScript monorepo providing frontend resilience utilities:
- **@rxsilience/core** - Client-side load balancing, service degradation with fallback endpoints
- **@rxsilience/graft** - Bidirectional DTO↔VO mapping using Zod
- **@rxsilience/asciiflow** - A separate application in the monorepo

## Commands

```bash
# Build all packages
pnpm build

# Dev mode (parallel for all packages)
pnpm dev

# Build/dev a specific package
pnpm --filter @rxsilience/core build
pnpm --filter @rxsilience/graft build
```

Each package builds with `tsc --noEmit && vite build` (TypeScript check + Vite/Rolldown bundle).

## Architecture

### @rxsilience/core (`packages/core`)

**Endpoint Pattern**: Wraps implementation objects and exposes their methods as endpoints.

```
Endpoints (base)
  └── ResilientEndpoints (with fallback on error predicates)
```

**Key Classes**:
- `Endpoints<T>` - Base class storing an implementation object, exposes `impl.endpoints`
- `ResilientEndpoints<T>` - Extends Endpoints with configurable fallback behavior:
  - Default predicates: `isNetworkError`, `NotImplementedError`, `FallbackError`
  - Caches last fallback reason with TTL (1hr) and retry count (3) thresholds
  - `shouldFallbackToNext()` - determines if fallback should occur
  - `getLastFallbackReason()` - returns cached fallback or cleans up expired record

- `EndpointFactory<S>` - Builds endpoint service from multiple implementations:
  - `register()` - adds Endpoints or ResilientEndpoints instances
  - `build()` - creates a stub that chains handlers, falling through on errors
  - For multiple handlers, wraps with try/catch and RxJS `catchError`/`map` operators

**Error Predicates** (`predicates.ts`):
- `isNetworkError()` - checks network error codes (ECONNREFUSED, ETIMEDOUT, etc.) and axios error patterns

### @rxsilience/graft (`packages/graft`)

**DTO↔VO Mapping**: Creates bidirectional mappers between Zod schemas using `@graftjs/zod`.

```typescript
createGraft(leftSchema, rightSchema, {
  fieldName: 'otherFieldName',        // simple rename
  fieldName: ['otherName', codec],    // rename with codec transform
  fieldName: codec                   // codec transform (ZodCodec)
})
// Returns { toLeft: (dto) => vo, toRight: (vo) => dto }
```

## Dependencies

- `@rxsilience/core` requires `rxjs ^7.8.2` (peer dependency)
- `@rxsilience/graft` requires `zod ^4.5.4` (peer dependency)
