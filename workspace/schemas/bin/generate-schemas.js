import generate from "../src/json-schema.js";

const outdir = process.argv[2];

if (outdir === undefined) {
  console.error("Missing output directory.");
  console.error("Usage: generate-schemas.js <output directory>");
  process.exit(1);
}

generate({ outdir });
