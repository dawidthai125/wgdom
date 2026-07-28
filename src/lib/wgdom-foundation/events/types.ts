/**
 * FND-05a — Foundation Event: typy i limity (FOUNDATION-31/32).
 * Serialize = FND-05b.
 */

import type { DigestV1 } from "../digest/types";
import type { EventId as BrandedEventId } from "../id/types";

/** EventId = PublicId event (`evt_` + ULID). */
export type EventId = BrandedEventId;

/** EventType: UPPER_SNAKE string (policy FOUNDATION-31). */
export type EventType = string;

export type EventSourceType = "system" | "user" | "service" | "domain";

export type EventSource = {
  type: EventSourceType;
  id?: string;
  label?: string;
};

export type EventSubject = {
  type: string;
  id?: string;
};

/** Meta jak FND-03 / FND-04. */
export type EventMetaValue = string | number | boolean | null;
export type EventMetadata = Record<string, EventMetaValue>;

export type EventRecordV1 = {
  schemaVersion: 1;
  id: EventId;
  at: string;
  type: EventType;
  source: EventSource;
  subject: EventSubject;
  payload?: unknown;
  meta?: EventMetadata;
  payloadDigest?: DigestV1;
};

export type CreateEventInput = {
  type: string;
  source: EventSource;
  subject: EventSubject;
  payload?: unknown;
  meta?: EventMetadata;
  at?: string;
  id?: string;
  withPayloadDigest?: boolean;
};

export const EVENT_SPEC_VERSION = 1 as const;
export const EVENT_SCHEMA_VERSION = 1 as const;

export const EVENT_PAYLOAD_MAX_BYTES = 16_384;
export const EVENT_TYPE_MAX_LENGTH = 64;
export const EVENT_SUBJECT_TYPE_MAX = 64;
export const EVENT_SOURCE_ID_MAX = 128;
export const EVENT_SOURCE_LABEL_MAX = 128;
export const EVENT_SUBJECT_ID_MAX = 128;

export const EVENT_META_MAX_KEYS = 32;
export const EVENT_META_KEY_MAX_LENGTH = 64;
export const EVENT_META_STRING_MAX_LENGTH = 512;

export const EVENT_SOURCE_TYPES: readonly EventSourceType[] = [
  "system",
  "user",
  "service",
  "domain",
] as const;

/** EventType: UPPER_SNAKE, max EVENT_TYPE_MAX_LENGTH. */
export const EVENT_TYPE_RE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

/** Subject.type: lowercase snake-ish. */
export const EVENT_SUBJECT_TYPE_RE = /^[a-z][a-z0-9_]*$/;
