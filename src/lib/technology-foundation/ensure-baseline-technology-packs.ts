/**
 * Canonical TechnologyPack registry init for production consumers.
 *
 * REUSE: existing seedB0Fixtures + seedScreedEconomyWetCementV1
 * (same set as Execution Expert ensureFixtures) — NOT a second seed catalog.
 *
 * Idempotent (seeds use getPack / getOrRegisterPack). Call when packs are
 * not injected by the caller. Tests that need an empty registry must pass
 * packs: [] explicitly (or clear registries and inject empty packs).
 */

import { seedB0Fixtures } from "./fixtures";
import { seedGypsumSkimCeiling081505V1 } from "./gypsum-skim-ceiling-0815-05-v1";
import { seedPaintingKnr202150501V1 } from "./painting-knr-2-02-1505-01-v1";
import { seedPaintingKnr401120402V1 } from "./painting-knr-4-01-1204-02-v1";
import { hydratePackRegistryFromDurable } from "./pack-registry";
import { seedScreedEconomyWetCementV1 } from "./screed-economy-wet-cement-v1";

/**
 * Ensures baseline ACTIVE packs are registered (ETICS, paving, painting,
 * priming, electrical cable, screed, gypsum skim 0815-05, KNR paint leaves).
 * Safe to call repeatedly. Also hydrates durable cloud/LS packs (cold start).
 */
export function ensureBaselineTechnologyPacksRegistered(): void {
  seedB0Fixtures();
  seedScreedEconomyWetCementV1();
  seedGypsumSkimCeiling081505V1();
  seedPaintingKnr401120402V1();
  seedPaintingKnr202150501V1();
  hydratePackRegistryFromDurable();
}
