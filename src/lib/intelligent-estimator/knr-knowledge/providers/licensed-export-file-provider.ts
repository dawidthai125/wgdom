/**
 * IK-KNR KL-5 — L1 LicensedExportFileProvider (local file only · no HTTP).
 *
 * Provider acquires raw evidence — NEVER sets VERIFIED.
 */

import type { KnrSourceLevel } from "../types";
import type { KnrIdentityV2Partial } from "../knr-identity-v2";
import type { KnrRawEvidence } from "../knr-provenance-types";
import { KNR_EXPORT_PARSER_VERSION } from "../knr-export-parser";
import {
  KNR_LICENSED_EXPORT_ORIGIN,
  KNR_NORMA_DEFAULT_LICENCE_ID,
} from "../knr-legal-gate-runtime";
import type { KnrAcquisitionRequest, KnrSourceProvider } from "./knr-source-provider";

export const LICENSED_EXPORT_FILE_PROVIDER_ID = "licensed-export-file-v1" as const;

export type LicensedExportAcquireInput = {
  bytes: Uint8Array;
  sourceFilename: string;
  capturedAt: string;
  licenceId?: string;
  refId: string;
};

/**
 * L1 provider — file import path only.
 * `acquire()` requires pre-stored refId (pipeline stores evidence first).
 */
export class LicensedExportFileProvider implements KnrSourceProvider {
  readonly level: KnrSourceLevel = "L1";
  readonly originId = KNR_LICENSED_EXPORT_ORIGIN;
  readonly providerId = LICENSED_EXPORT_FILE_PROVIDER_ID;

  private readonly pending: Map<string, LicensedExportAcquireInput> = new Map();

  registerFile(input: LicensedExportAcquireInput): void {
    this.pending.set(input.refId, input);
  }

  canHandle(partial: KnrIdentityV2Partial): boolean {
    return !partial.family || partial.family === "KNR";
  }

  async acquire(request: KnrAcquisitionRequest): Promise<KnrRawEvidence> {
    const refId = request.identityKeyV2;
    const file = this.pending.get(refId);
    if (!file) {
      throw new Error("LicensedExportFileProvider: brak zarejestrowanego pliku dla refId.");
    }
    return {
      format: "ATH",
      parserVersion: KNR_EXPORT_PARSER_VERSION,
      sourceFilename: file.sourceFilename,
      capturedAt: file.capturedAt,
      payloadRef: {
        refId: file.refId,
        kind: "export_file",
        sourceFilename: file.sourceFilename,
      },
      originId: this.originId,
      licenceId: file.licenceId ?? KNR_NORMA_DEFAULT_LICENCE_ID,
    };
  }

  /** Provider output is never VERIFIED — explicit guard for harness. */
  static providerCannotSetVerified(): true {
    return true;
  }
}

export const KNR_KL5_L1_PROVIDER_IMPLEMENTED = true as const;
