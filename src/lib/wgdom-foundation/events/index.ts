/**
 * FND-05a+05b — publiczny barrel Foundation Event
 * (model + create + validate + serialize). Root export = FND-05c.
 */

export type {
  EventId,
  EventType,
  EventSourceType,
  EventSource,
  EventSubject,
  EventMetaValue,
  EventMetadata,
  EventRecordV1,
  CreateEventInput,
} from "./types";
export {
  EVENT_SPEC_VERSION,
  EVENT_SCHEMA_VERSION,
  EVENT_PAYLOAD_MAX_BYTES,
  EVENT_TYPE_MAX_LENGTH,
  EVENT_SUBJECT_TYPE_MAX,
  EVENT_SOURCE_ID_MAX,
  EVENT_SOURCE_LABEL_MAX,
  EVENT_SUBJECT_ID_MAX,
  EVENT_META_MAX_KEYS,
  EVENT_META_KEY_MAX_LENGTH,
  EVENT_META_STRING_MAX_LENGTH,
  EVENT_SOURCE_TYPES,
  EVENT_TYPE_RE,
  EVENT_SUBJECT_TYPE_RE,
} from "./types";

export {
  FND_EVENT_INVALID,
  FND_EVENT_PAYLOAD_INVALID,
  FND_EVENT_ID_INVALID,
  BUILTIN_EVENT_CODES,
} from "./codes";

export { createEvent } from "./create";

export {
  isEvent,
  assertEvent,
  validateEvent,
  validateSource,
  validateEventType,
  validateSubject,
  validateEventId,
  normalizePayload,
  deepFreeze,
  isIsoUtcZ,
} from "./validate";

export type { SerializedEventV1 } from "./serialize";
export { serializeEvent, deserializeEvent } from "./serialize";
