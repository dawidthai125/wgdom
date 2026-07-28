/**
 * FND-04a — createAuditRecord (FOUNDATION-23).
 */

import { createDigest } from "../digest/create";
import { createError } from "../errors/create";
import { createId } from "../id/create";
import { FND_AUDIT_INVALID, FND_AUDIT_PAYLOAD_INVALID } from "./codes";
import type { AuditRecordV1, CreateAuditRecordInput } from "./types";
import { AUDIT_SCHEMA_VERSION } from "./types";
import {
  deepFreeze,
  isIsoUtcZ,
  normalizeAndCheckMeta,
  normalizePayload,
  validateAction,
  validateActor,
  validateAuditId,
  validateTarget,
} from "./validate";

export async function createAuditRecord(
  input: CreateAuditRecordInput,
): Promise<AuditRecordV1> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "createAuditRecord input must be an object",
      category: "validation",
    });
  }

  const actor = validateActor(input.actor);
  const action = validateAction(input.action);
  const target = validateTarget(input.target);

  let at: string;
  if (input.at === undefined) {
    at = new Date().toISOString();
  } else {
    if (!isIsoUtcZ(input.at)) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Audit at must be ISO-8601 UTC ending with Z",
        category: "validation",
      });
    }
    at = input.at;
  }

  const id =
    input.id === undefined
      ? createId("foundation")
      : (validateAuditId(input.id) as AuditRecordV1["id"]);

  const withDigest = input.withPayloadDigest === true;

  let payload: unknown | undefined;
  if (input.payload !== undefined) {
    payload = normalizePayload(input.payload);
  } else if (withDigest) {
    throw createError({
      code: FND_AUDIT_PAYLOAD_INVALID,
      message: "withPayloadDigest requires payload",
      category: "validation",
    });
  }

  const meta =
    input.meta !== undefined ? normalizeAndCheckMeta(input.meta) : undefined;

  let payloadDigest: AuditRecordV1["payloadDigest"];
  if (withDigest) {
    payloadDigest = await createDigest(payload);
  }

  const record: AuditRecordV1 = {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    id,
    at,
    actor,
    action,
    target,
  };

  if (payload !== undefined) record.payload = payload;
  if (meta !== undefined) record.meta = meta;
  if (payloadDigest !== undefined) record.payloadDigest = payloadDigest;

  return deepFreeze(record);
}
