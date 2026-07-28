/**
 * FND-04a — Foundation Audit: typy i limity (FOUNDATION-23/24).
 * Serialize = FND-04b.
 */

import type { DigestV1 } from "../digest/types";
import type { FoundationId } from "../id/types";

/** AuditId = Foundation PublicId (`fnd_` + ULID). */
export type AuditId = FoundationId;

export type AuditActorType = "system" | "user" | "service";

export type AuditActor = {
  type: AuditActorType;
  id?: string;
  label?: string;
};

export type AuditTarget = {
  type: string;
  id?: string;
};

/** Meta jak FND-03 ErrorMetadata. */
export type AuditMetaValue = string | number | boolean | null;
export type AuditMetadata = Record<string, AuditMetaValue>;

export type AuditRecordV1 = {
  schemaVersion: 1;
  id: AuditId;
  at: string;
  actor: AuditActor;
  action: string;
  target: AuditTarget;
  payload?: unknown;
  meta?: AuditMetadata;
  payloadDigest?: DigestV1;
};

export type CreateAuditRecordInput = {
  actor: AuditActor;
  action: string;
  target: AuditTarget;
  payload?: unknown;
  meta?: AuditMetadata;
  at?: string;
  id?: string;
  withPayloadDigest?: boolean;
};

export const AUDIT_SPEC_VERSION = 1 as const;
export const AUDIT_SCHEMA_VERSION = 1 as const;

export const AUDIT_PAYLOAD_MAX_BYTES = 16_384;
export const AUDIT_ACTION_MAX_LENGTH = 64;
export const AUDIT_TARGET_TYPE_MAX = 64;
export const AUDIT_ACTOR_ID_MAX = 128;
export const AUDIT_ACTOR_LABEL_MAX = 128;
export const AUDIT_TARGET_ID_MAX = 128;

export const AUDIT_META_MAX_KEYS = 32;
export const AUDIT_META_KEY_MAX_LENGTH = 64;
export const AUDIT_META_STRING_MAX_LENGTH = 512;

export const AUDIT_ACTOR_TYPES: readonly AuditActorType[] = [
  "system",
  "user",
  "service",
] as const;

/** Action: UPPER_SNAKE, max AUDIT_ACTION_MAX_LENGTH. */
export const AUDIT_ACTION_RE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

/** Target.type: lowercase snake-ish. */
export const AUDIT_TARGET_TYPE_RE = /^[a-z][a-z0-9_]*$/;
