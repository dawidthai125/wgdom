import fs from "fs";
const lines = fs.readFileSync("src/app/App.tsx", "utf8").split(/\r?\n/);
const keep = [...lines.slice(0, 971), ...lines.slice(1296)];
fs.writeFileSync("src/app/App.tsx", keep.join("\n"));
console.log("removed", lines.length - keep.length, "lines");
