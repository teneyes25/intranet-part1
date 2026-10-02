export type StorageFailureRecord = {
  key: string;
  errorName: string;
  httpStatus: number | null;
};

/** A write may have landed, but this attempt could not confirm the bytes. */
export type UnresolvedStorageRecord = {
  key: string;
  outcome: "uncertain";
  reconciliationRequired: true;
  cleanupRequired: true;
  errorName: string;
  httpStatus: number | null;
};

const MISSING_OBJECT_NAMES = new Set(["NotFound", "NoSuchKey"]);

const AMBIGUOUS_NAMES = new Set([
  "TimeoutError",
  "NetworkingError",
  "RequestTimeout",
  "InternalError",
  "ServiceUnavailable",
  "SlowDown",
]);

const AMBIGUOUS_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function httpStatus(error: object): number | null {
  if (!("$metadata" in error) || !error.$metadata || typeof error.$metadata !== "object") {
    return null;
  }
  const status = (error.$metadata as { httpStatusCode?: unknown }).httpStatusCode;
  return typeof status === "number" ? status : null;
}

export function safeErrorName(error: unknown) {
  if (typeof error === "object" && error && "name" in error && typeof error.name === "string") {
    if (error.name) return error.name;
  }
  return "Error";
}

export function describeStorageFailure(key: string, error: unknown): StorageFailureRecord {
  const status = typeof error === "object" && error ? httpStatus(error) : null;
  return { key, errorName: safeErrorName(error), httpStatus: status };
}

export function unresolvedStorageRecord(key: string, error: unknown): UnresolvedStorageRecord {
  const failure = describeStorageFailure(key, error);
  return {
    key: failure.key,
    outcome: "uncertain",
    reconciliationRequired: true,
    cleanupRequired: true,
    errorName: failure.errorName,
    httpStatus: failure.httpStatus,
  };
}

/** True only for S3 responses that mean this object key is absent. */
export function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error) || typeof error.name !== "string") {
    return false;
  }
  if (!MISSING_OBJECT_NAMES.has(error.name)) return false;
  const status = httpStatus(error);
  return status === null || status === 404;
}

/** Upload outcome that may have been stored even though the call failed. */
export function isAmbiguousStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = httpStatus(error);
  if (status !== null && [500, 502, 503, 504].includes(status)) return true;
  if ("name" in error && typeof error.name === "string" && AMBIGUOUS_NAMES.has(error.name)) {
    return true;
  }
  if ("code" in error && typeof error.code === "string" && AMBIGUOUS_CODES.has(error.code)) {
    return true;
  }
  return false;
}
