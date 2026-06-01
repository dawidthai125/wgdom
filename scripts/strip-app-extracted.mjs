import fs from "fs";

const path = "src/app/App.tsx";
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
const keep = [
  ...lines.slice(0, 5619),
  ...lines.slice(6107, 7363),
  ...lines.slice(7560),
];
fs.writeFileSync(path, keep.join("\n"));
console.log("removed", lines.length - keep.length, "lines");
