import { applyHarnessCleanup } from "./cleanup-ssot";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const payload = JSON.parse(input || "{}");
  process.stdout.write(JSON.stringify(applyHarnessCleanup(payload)));
});
