/**
 * Publiczny barrel Foundation Error — FND-03 COMPLETE (03a+03b+03c).
 */

export type {
  ErrorCategory,
  ErrorSeverity,
  ErrorMetaValue,
  ErrorMetadata,
  CreateErrorInput,
} from "./types";
export {
  ERROR_SCHEMA_VERSION,
  ERROR_CAUSE_MAX_DEPTH,
  ERROR_META_MAX_KEYS,
  ERROR_META_KEY_MAX_LENGTH,
  ERROR_META_STRING_MAX_LENGTH,
  ERROR_CATEGORIES,
  ERROR_SEVERITIES,
} from "./types";

export {
  ERROR_CODE_RE,
  FND_ERROR_INVALID,
  FND_ERROR_META_INVALID,
  FND_ERROR_CAUSE_CYCLE,
  FND_ERROR_SERIALIZE_FAILED,
  BUILTIN_ERROR_CODES,
  isErrorCode,
} from "./codes";

export { FoundationError, createError, throwError } from "./create";

export {
  isFoundationError,
  assertFoundationError,
  getErrorCode,
} from "./validate";

export type {
  SerializeOptions,
  SerializedFoundationErrorV1,
  SerializedForeignCauseV1,
} from "./serialize";
export { serializeError, deserializeError, errorToJSON } from "./serialize";
