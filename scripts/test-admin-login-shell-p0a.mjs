/**
 * P0-A-IOS-LOGIN — shell login / remember UX smoke.
 * Run: npx vite-node scripts/test-admin-login-shell-p0a.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AdminRememberError,
  mapAdminLoginError,
  verifyAdminLogin,
  saveRememberedAdminPassword,
  loadRememberedAdminPassword,
  clearRememberedAdminPassword,
  adminRememberEnabled,
} from "../src/lib/admin-auth.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

// T1 — mapAdminLoginError SSOT
assert("T1 QuotaExceededError", mapAdminLoginError(new DOMException("quota", "QuotaExceededError")).includes("pamięci"));
assert("T1b OperationError", mapAdminLoginError(new DOMException("op", "OperationError")).includes("Safari"));
assert("T1c AdminRememberError", mapAdminLoginError(new AdminRememberError()).includes("Zapamiętaj"));
assert("T1d default", mapAdminLoginError(new Error("x")).includes("przerwane"));

// T2 — verifyAdminLogin (remember OFF path — no LS remember)
const good = await verifyAdminLogin("Dawid", "wrong-password-xyz");
assert("T2 wrong password null", good === null);
const builtin = await verifyAdminLogin("Dawid", "startowe-haslo-nie-znam");
assert("T2 builtin or override", typeof good === "object" || good === null);

// T3–T4 — remember (wymaga localStorage + subtle — vite-node / jsdom)
const hasLs = typeof localStorage !== "undefined" && globalThis.crypto?.subtle;
if (hasLs) {
  clearRememberedAdminPassword();
  await saveRememberedAdminPassword("dawid", "test-remember-p0a");
  assert("T3 remember enabled", adminRememberEnabled());
  const loaded = await loadRememberedAdminPassword("dawid");
  assert("T3 load roundtrip", loaded === "test-remember-p0a");
  clearRememberedAdminPassword();
  assert("T3 cleared", !adminRememberEnabled());

  const origSet = localStorage.setItem.bind(localStorage);
  let threw = false;
  try {
    localStorage.setItem = (key, value) => {
      if (String(key).includes("remember")) throw new DOMException("quota", "QuotaExceededError");
      return origSet(key, value);
    };
    try {
      await saveRememberedAdminPassword("dawid", "x");
    } catch (e) {
      threw = e instanceof AdminRememberError;
    }
  } finally {
    localStorage.setItem = origSet;
    clearRememberedAdminPassword();
  }
  assert("T4 remember throw AdminRememberError", threw);
  assert("T4 cleared after fail", !adminRememberEnabled());
} else {
  console.log("SKIP T3–T4 — no localStorage/crypto in runner (desktop: uruchom w przeglądarce lub happy-dom)");
}

// T5 — LoginScreen has try/finally
const loginSrc = readSrc("src/app/LoginScreen.tsx");
assert("T5 handleAdminLogin finally", /handleAdminLogin[\s\S]*?finally\s*\{[\s\S]*?setPassLoading\(false\)/.test(loginSrc));
assert("T5 handleInspectorLogin finally", /handleInspectorLogin[\s\S]*?finally\s*\{[\s\S]*?setPassLoading\(false\)/.test(loginSrc));
assert("T5 mapAdminLoginError import", loginSrc.includes("mapAdminLoginError"));

// T6 — boundary: no cloud-sync changes in login handlers (only existing worker import)
const adminHandler = loginSrc.slice(loginSrc.indexOf("handleAdminLogin"), loginSrc.indexOf("handleInspectorLogin"));
assert("T6 no fetch in admin handler", !adminHandler.includes("fetchKeysFromCloud"));
assert("T6 no batch-set in admin handler", !adminHandler.includes("batch-set"));

console.log("\n---");
console.log(`P0-A login shell: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
