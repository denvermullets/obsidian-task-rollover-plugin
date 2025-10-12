import { readFileSync } from "fs";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
console.log(manifest.version);