export {
  MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY,
  MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION,
  type MaterialSourceEvidenceObservation,
  type MaterialSourceEvidenceStore,
} from "@/lib/material-source-evidence/types";

export {
  emptyMaterialSourceEvidenceStore,
  normalizeMaterialSourceEvidenceStore,
  loadMaterialSourceEvidenceStoreLocal,
  saveMaterialSourceEvidenceStoreLocal,
  clearMaterialSourceEvidenceStoreForTests,
  mergeMaterialSourceEvidenceStore,
  mergeMaterialSourceEvidenceDataKey,
  observationFromMekRecord,
  upsertMaterialSourceEvidenceObservation,
  listDurableMaterialSourceEvidence,
} from "@/lib/material-source-evidence/store";
