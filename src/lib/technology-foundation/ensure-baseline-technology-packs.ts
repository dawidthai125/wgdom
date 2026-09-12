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
import { seedScreedEconomyWetCementV1 } from "./screed-economy-wet-cement-v1";

/**
 * Ensures baseline ACTIVE packs are registered (ETICS, paving, painting,
 * priming, electrical cable, screed). Safe to call repeatedly.
 */
export function ensureBaselineTechnologyPacksRegistered(): void {
  seedB0Fixtures();
  seedScreedEconomyWetCementV1();
}
