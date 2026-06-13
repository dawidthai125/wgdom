/**
 * Creates scripts/fixtures/test.7z for P2-H.3 tests.
 */
import SevenZip from "7z-wasm";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "fixtures");
mkdirSync(fixtureDir, { recursive: true });

const sevenZip = await SevenZip({ noInitialRun: true });
const work = "/wg7z";
try {
  sevenZip.FS.mkdir(work);
} catch {
  /* exists */
}
sevenZip.FS.writeFile(`${work}/sample.ath`, "ATH test content for WGDOM P2-H.3 fixture");
sevenZip.FS.writeFile(`${work}/sample.pdf`, "%PDF-1.4\n% minimal pdf fixture\n");
sevenZip.FS.writeFile(
  `${work}/sample.xlsx`,
  "PK\x03\x04xlsx placeholder — real xlsx not required for filename detection",
);
sevenZip.FS.chdir(work);
sevenZip.callMain(["a", "-t7z", "test.7z", "sample.ath", "sample.xlsx", "sample.pdf"]);

const bytes = sevenZip.FS.readFile(`${work}/test.7z`);
writeFileSync(join(fixtureDir, "test.7z"), Buffer.from(bytes));
console.log("Created", join(fixtureDir, "test.7z"), "size", bytes.length);

// Verify list + extract (fresh instance)
const lines = [];
const sz2 = await SevenZip({
  noInitialRun: true,
  print: (s) => {
    const t = s.trim();
    if (t) lines.push(t);
  },
});
const work2 = "/wg7z2";
sz2.FS.mkdir(work2);
sz2.FS.writeFile(`${work2}/archive.7z`, bytes);
sz2.FS.chdir(work2);
sz2.callMain(["l", "-ba", "archive.7z"]);
console.log("List -ba:", lines);

const sz3 = await SevenZip({ noInitialRun: true });
const work3 = "/wg7z3";
sz3.FS.mkdir(work3);
sz3.FS.writeFile(`${work3}/archive.7z`, bytes);
sz3.FS.chdir(work3);
sz3.callMain(["x", "archive.7z", "-y"]);
console.log("Extracted:", sz3.FS.readdir(work3).filter((n) => n !== "archive.7z"));
const ath = sz3.FS.readFile(`${work3}/sample.ath`);
console.log("ATH:", new TextDecoder().decode(ath));
