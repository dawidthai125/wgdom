import { readFileSync } from "fs";

const file = process.argv[2] || "src/app/PayrollView.tsx";
const jobs = readFileSync(file, "utf8");
const domain = readFileSync("src/app/app-domain.ts", "utf8");
const exported = [...domain.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
const impMatch = jobs.match(/import \{([\s\S]*?)\} from "@\/app\/app-domain"/);
const imported = new Set(
  (impMatch?.[1] || "")
    .split(/[\s,]+/)
    .map((s) => s.replace(/^type /, "").trim())
    .filter(Boolean),
);
const missing = exported.filter((n) => jobs.includes(n) && !imported.has(n));
console.log(missing.join(", "));
