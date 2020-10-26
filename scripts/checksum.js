/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const str1 = fs.readFileSync(path.join(__dirname, "..", "dist", "index.js"), {
  encoding: "utf8",
});

const str2 = fs.readFileSync(path.join(__dirname, "..", "_dist", "index.js"), {
  encoding: "utf8",
});

function hash(str) {
  const md5 = crypto.createHash("md5");
  return md5.update(str).digest("hex");
}

const hash1 = hash(str1);
const hash2 = hash(str2);

process.stdout.write(`checksum: ${hash1} === ${hash2}\n`);

if (hash1 !== hash2) {
  process.stderr
    .write(`The dist/index.js file is inconsistent with CI generation, please run the command
  'npm run build' to generate it\n`);
  process.exit(1);
} else {
  process.exit(0);
}
