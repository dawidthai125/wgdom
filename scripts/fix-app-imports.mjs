import { readFileSync, writeFileSync } from "fs";

const domain = readFileSync("src/app/app-domain.ts", "utf8");
let app = readFileSync("src/app/App.tsx", "utf8");

const exports = [...domain.matchAll(/^export (?:type |interface |const |function )(\w+)/gm)].map((m) => m[1]);
const used = exports.filter((n) => {
  const re = new RegExp(`\\b${n}\\b`);
  return re.test(app);
});

const typeNames = new Set(
  [...domain.matchAll(/^export type (\w+)/gm), ...domain.matchAll(/^export interface (\w+)/gm)].map((m) => m[1]),
);
const types = used.filter((n) => typeNames.has(n));
const values = used.filter((n) => !typeNames.has(n));

const lines = [];
if (types.length) lines.push(`import type { ${types.join(", ")} } from "@/app/app-domain";`);
if (values.length) lines.push(`import { ${values.join(", ")} } from "@/app/app-domain";`);

app = app.replace('import * as domain from "@/app/app-domain";\n', lines.join("\n") + "\n");

// Remove duplicate Shared UI (keep backup helpers)
const sharedStart = app.indexOf("// ─── Shared UI");
const backupKey = app.indexOf("const KW_LAST_BACKUP_WEEK_KEY");
if (sharedStart >= 0 && backupKey > sharedStart) {
  app = app.slice(0, sharedStart) + app.slice(backupKey);
}

// Remove duplicate job email block
const emailStart = app.indexOf("// ─── Email z roboty");
const scheduleStart = app.indexOf("// ─── Grafik tygodniowy");
if (emailStart >= 0 && scheduleStart > emailStart) {
  app = app.slice(0, emailStart) + app.slice(scheduleStart);
}

writeFileSync("src/app/App.tsx", app);
console.log("Fixed imports:", types.length, "types,", values.length, "values");
console.log("Removed duplicate UI + job email blocks");
