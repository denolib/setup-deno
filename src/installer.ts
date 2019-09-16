import * as os from "os";
import * as fs from "fs";
import * as path from "path";
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory =
  process.env["RUNNER_TEMPDIRECTORY"] ||
  fs.mkdtempSync(path.join(os.tmpdir(), "deno"));
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { execSync } from "child_process";

export async function getDeno(version: string) {
  // check cache
  let toolPath: string;
  toolPath = tc.find("deno", version);

  // If not found in cache, download
  if (!toolPath) {
    core.debug(`Downloading deno at version ${version}`);
    // download, extract, cache
    toolPath = await acquireDeno(version);
    core.debug(`Deno downloaded to ${toolPath}`);
  } else {
    core.debug(`Cached deno found at ${toolPath}`);
  }

  let denoBinaryName = "deno";
  if (os.platform() == "win32") {
    denoBinaryName += ".exe";
  }
  const denoBin = denoBinPath();
  if (!fs.existsSync(denoBin)) {
    fs.mkdirSync(denoBin, {
      recursive: true
    });
  }
  fs.copyFileSync(
    path.join(toolPath, denoBinaryName),
    path.join(denoBin, denoBinaryName)
  );
  fs.chmodSync(path.join(denoBin, denoBinaryName), 0o755);

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(denoBin);
}

function denoBinPath(): string {
  switch (os.platform()) {
    case "darwin":
      return path.join(process.env.HOME || "", ".deno", "bin");
    case "linux":
      return path.join(process.env.HOME || "", ".deno", "bin");
    case "win32":
      return path.join(process.env.USERPROFILE || "", ".deno", "bin");
    default:
      throw "Invalid platform";
  }
}

async function acquireDeno(version: string): Promise<string> {
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //
  let platform: "osx" | "linux" | "win";
  let extension: "gz" | "zip";
  let executableExtension = "";

  switch (os.platform()) {
    case "darwin":
      platform = "osx";
      extension = "gz";
      break;
    case "linux":
      platform = "linux";
      extension = "gz";
      break;
    case "win32":
      platform = "win";
      extension = "zip";
      executableExtension = ".exe";
      break;
    default:
      throw "Invalid platform";
  }

  core.debug(
    `Trying to install for platform ${platform} with extension ${extension}`
  );

  let toolName = `deno_${platform}_x64`;
  let downloadUrl = `https://github.com/denoland/deno/releases/download/${version}/${toolName}.${extension}`;
  let downloadPath: string;

  try {
    downloadPath = await tc.downloadTool(downloadUrl);
  } catch (err) {
    throw err;
  }

  core.debug(`Downloaded ${downloadUrl} to ${downloadPath}`);

  //
  // Extract
  //
  let extPath: string;
  if (!fs.existsSync(tempDirectory)) {
    fs.mkdirSync(tempDirectory, {
      recursive: true
    });
  }
  if (extension == "zip") {
    extPath = await tc.extractZip(downloadPath, tempDirectory);
    extPath = tempDirectory;
    toolName = "deno" + executableExtension;
  } else if (extension == "gz") {
    fs.renameSync(downloadPath, `${downloadPath}.gz`);
    execSync(`gzip -d ${downloadPath}.gz`);
    extPath = tempDirectory;
    fs.renameSync(downloadPath, path.join(extPath, toolName));
  } else {
    throw "Unknown extension";
  }
  core.debug(`Extracted archive to ${extPath}`);

  //
  // Install into the local tool cache - deno extracts a file that matches the fileName downloaded
  //
  let tool = path.join(extPath, toolName);
  core.debug(`Cache file ${tool} into toolcache`);
  return await tc.cacheFile(
    tool,
    "deno" + executableExtension,
    "deno",
    version
  );
}
