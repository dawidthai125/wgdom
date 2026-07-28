/**
 * FND-04a+04b — publiczny barrel Foundation Audit
 * (model + create + validate + serialize). Root export = FND-04c.
 */

export type {
  AuditId,
  AuditActorType,
  AuditActor,
  AuditTarget,
  AuditMetaValue,
  AuditMetadata,
  AuditRecordV1,
  CreateAuditRecordInput,
} from "./types";
export {
  AUDIT_SPEC_VERSION,
  AUDIT_SCHEMA_VERSION,
  AUDIT_PAYLOAD_MAX_BYTES,
  AUDIT_ACTION_MAX_LENGTH,
  AUDIT_TARGET_TYPE_MAX,
  AUDIT_ACTOR_ID_MAX,
  AUDIT_ACTOR_LABEL_MAX,
  AUDIT_TARGET_ID_MAX,
  AUDIT_META_MAX_KEYS,
  AUDIT_META_KEY_MAX_LENGTH,
  AUDIT_META_STRING_MAX_LENGTH,
  AUDIT_ACTOR_TYPES,
  AUDIT_ACTION_RE,
  AUDIT_TARGET_TYPE_RE,
} from "./types";

export {
  FND_AUDIT_INVALID,
  FND_AUDIT_PAYLOAD_INVALID,
  FND_AUDIT_ID_INVALID,
  BUILTIN_AUDIT_CODES,
} from "./codes";

export { createAuditRecord } from "./create";

export {
  isAuditRecord,
  assertAuditRecord,
  validateAuditRecord,
  validateActor,
  validateAction,
  validateTarget,
  validateAuditId,
  normalizePayload,
  deepFreeze,
  isIsoUtcZ,
} from "./validate";

export type { SerializedAuditV1 } from "./serialize";
export { serializeAudit, deserializeAudit } from "./serialize";
