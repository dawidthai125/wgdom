/**
 * Publiczne factory ID (FOUNDATION-03 / FND-01b).
 * Do not use for legacy KV entities — tylko nowe artefakty lejka / foundation.
 */

import { PREFIX } from "./prefixes";
import type { IdType } from "./types";
import { createUlid, type CreateUlidOptions } from "./ulid";
import { isValidId } from "./validate";

export type CreateIdOptions = CreateUlidOptions;

/**
 * PublicId = `${PREFIX[type]}${ulid}`.
 */
export function createId(type: IdType, options?: CreateIdOptions): string {
  const prefix = PREFIX[type];
  if (!prefix) {
    throw new Error(`Unknown IdType: ${String(type)}`);
  }
  const id = `${prefix}${createUlid(options)}`;
  if (!isValidId(id, type)) {
    throw new Error("createId produced invalid PublicId");
  }
  return id;
}
