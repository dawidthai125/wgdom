/**
 * FND-05a — createEvent (FOUNDATION-31).
 */

import { createDigest } from "../digest/create";
import { createError } from "../errors/create";
import { createId } from "../id/create";
import { FND_EVENT_INVALID, FND_EVENT_PAYLOAD_INVALID } from "./codes";
import type { EventRecordV1, CreateEventInput } from "./types";
import { EVENT_SCHEMA_VERSION } from "./types";
import {
  deepFreeze,
  isIsoUtcZ,
  normalizeAndCheckMeta,
  normalizePayload,
  validateEventId,
  validateEventType,
  validateSource,
  validateSubject,
} from "./validate";

export async function createEvent(input: CreateEventInput): Promise<EventRecordV1> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "createEvent input must be an object",
      category: "validation",
    });
  }

  const type = validateEventType(input.type);
  const source = validateSource(input.source);
  const subject = validateSubject(input.subject);

  let at: string;
  if (input.at === undefined) {
    at = new Date().toISOString();
  } else {
    if (!isIsoUtcZ(input.at)) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Event at must be ISO-8601 UTC ending with Z",
        category: "validation",
      });
    }
    at = input.at;
  }

  const id =
    input.id === undefined
      ? createId("event")
      : (validateEventId(input.id) as EventRecordV1["id"]);

  const withDigest = input.withPayloadDigest === true;

  let payload: unknown | undefined;
  if (input.payload !== undefined) {
    payload = normalizePayload(input.payload);
  } else if (withDigest) {
    throw createError({
      code: FND_EVENT_PAYLOAD_INVALID,
      message: "withPayloadDigest requires payload",
      category: "validation",
    });
  }

  const meta = input.meta !== undefined ? normalizeAndCheckMeta(input.meta) : undefined;

  let payloadDigest: EventRecordV1["payloadDigest"];
  if (withDigest) {
    payloadDigest = await createDigest(payload);
  }

  const record: EventRecordV1 = {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id,
    at,
    type,
    source,
    subject,
  };

  if (payload !== undefined) record.payload = payload;
  if (meta !== undefined) record.meta = meta;
  if (payloadDigest !== undefined) record.payloadDigest = payloadDigest;

  return deepFreeze(record);
}
