// @ts-nocheck
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const axios = require("axios").default;

const writeFile = promisify(fs.writeFile);
const releaseFilePath = path.join(__dirname, "..", "docs", "release.json");
const githubAPIURL = "https://api.github.com/repos/denoland/deno/git/refs/tags";

async function main() {
  const { data: tags } = await axios.get(githubAPIURL);

  const tagNames = tags
    .map(v => {
      return { name: v.ref.replace(/^refs\/tags\//, "") };
    })
    .filter(v => {
      return /^v\d+\.\d+\.\d+$/.test(v.name);
    })
    .reverse();

  await writeFile(releaseFilePath, JSON.stringify(tagNames, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
