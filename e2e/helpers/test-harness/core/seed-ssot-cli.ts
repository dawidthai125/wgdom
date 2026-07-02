import { buildPayrollHarnessSeed } from "./seed-ssot";

const encoded = process.argv[2] || "";
const opts = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
process.stdout.write(JSON.stringify(buildPayrollHarnessSeed(opts)));
