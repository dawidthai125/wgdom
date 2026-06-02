/**
 * Snapshot + fix override Szymon (tylko usuwa klucz szymon z kw-admin-passwords).
 * node scripts/fix-szymon-password.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
const headers = {
  Authorization: `Bearer ${anon}`,
  apikey: anon,
  "Content-Type": "application/json",
};

async function getPasswords() {
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys: ["kw-admin-passwords"] }),
  });
  const { values } = await res.json();
  return values[0];
}

const before = await getPasswords();
const snapshotPath = resolve(root, "before-fix-szymon.json");
writeFileSync(
  snapshotPath,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      purpose: "snapshot przed usunięciem override szymon z kw-admin-passwords",
      "kw-admin-passwords": before,
    },
    null,
    2,
  ),
  "utf8",
);
console.log("Snapshot:", snapshotPath);
console.log("PRZED:", JSON.stringify(before, null, 2));

const after = { ...before };
delete after.szymon;

const setRes = await fetch(`${base}/batch-set`, {
  method: "POST",
  headers,
  body: JSON.stringify({ keys: ["kw-admin-passwords"], values: [after] }),
});
const setBody = await setRes.text();
console.log("batch-set:", setRes.status, setBody);

const verify = await getPasswords();
console.log("PO:", JSON.stringify(verify, null, 2));
console.log("szymon removed:", verify?.szymon === undefined);
console.log("dawid unchanged:", verify?.dawid === before?.dawid);
console.log("pawel unchanged:", verify?.pawel === before?.pawel);
