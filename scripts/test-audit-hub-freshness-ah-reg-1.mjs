/**
 * AH-REG-1 — Audit Hub freshness (security notify + AUX pull on sync)
 * Run: npx vite-node scripts/test-audit-hub-freshness-ah-reg-1.mjs
 */
import { readFileSync } from "fs";
import {
  SECURITY_AUDIT_LOG_CHANGED_EVENT,
  notifySecurityAuditLogChanged,
} from "../src/lib/security-audit-log.ts";

if (typeof globalThis.window === "undefined") {
  const listeners = new Map();
  globalThis.window = globalThis;
  globalThis.CustomEvent = class CustomEvent {
    constructor(type) {
      this.type = type;
    }
  };
  globalThis.window.addEventListener = (type, fn) => {
    const list = listeners.get(type) ?? [];
    list.push(fn);
    listeners.set(type, list);
  };
  globalThis.window.removeEventListener = (type, fn) => {
    const list = (listeners.get(type) ?? []).filter((f) => f !== fn);
    listeners.set(type, list);
  };
  globalThis.window.dispatchEvent = (ev) => {
    for (const fn of listeners.get(ev.type) ?? []) fn(ev);
    return true;
  };
}

let pass = 0;

function assert(label, ok) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${label}`);
  pass++;
}

// T1 — notify dispatches custom event
{
  let fired = false;
  const handler = () => { fired = true; };
  window.addEventListener(SECURITY_AUDIT_LOG_CHANGED_EVENT, handler);
  notifySecurityAuditLogChanged();
  window.removeEventListener(SECURITY_AUDIT_LOG_CHANGED_EVENT, handler);
  assert("T1 notify dispatches event", fired);
}

// T2 — recordSecurityAudit calls notify after LS write
{
  const src = readFileSync("src/lib/security-audit-log.ts", "utf8");
  assert("T2 recordSecurityAudit calls notify", src.includes("notifySecurityAuditLogChanged()"));
  assert("T2 exports SECURITY_AUDIT_LOG_CHANGED_EVENT", src.includes("SECURITY_AUDIT_LOG_CHANGED_EVENT"));
}

// T3–T5 — App.tsx wiring
{
  const app = readFileSync("src/app/App.tsx", "utf8");
  assert("T3 App listener on SECURITY_AUDIT_LOG_CHANGED_EVENT", app.includes(`addEventListener(SECURITY_AUDIT_LOG_CHANGED_EVENT`));
  assert("T4 refreshAuditHubAuxFromCloud defined", app.includes("const refreshAuditHubAuxFromCloud = useCallback"));
  assert("T4 pullSecurityAuditLogFromCloud in helper", /refreshAuditHubAuxFromCloud[\s\S]*pullSecurityAuditLogFromCloud/.test(app));
  assert("T4 pullWmDrukAuditLogFromCloud in helper", /refreshAuditHubAuxFromCloud[\s\S]*pullWmDrukAuditLogFromCloud/.test(app));
  assert("T5 pullFromCloudAndMerge uses helper", /pullFromCloudAndMerge[\s\S]*refreshAuditHubAuxFromCloud/.test(app));
  assert("T5 runCloudSync uses helper", /runCloudSync[\s\S]*refreshAuditHubAuxFromCloud/.test(app));
  assert("T5 no duplicate pullSecurity in pullFromCloudAndMerge body", !/pullFromCloudAndMerge[\s\S]*pullSecurityAuditLogFromCloud/.test(app));
}

console.log(`\nAH-REG-1 freshness: ${pass} PASS`);
if (process.exitCode) process.exit(process.exitCode);
