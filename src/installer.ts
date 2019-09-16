// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env["RUNNER_TEMPDIRECTORY"] || "";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { exec, execSync } from "child_process";

let osPlat: string = os.platform();

if (!tempDirectory) {
  let baseLocation;
  if (process.platform === "win32") {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env["USERPROFILE"] || "C:\\";
  } else {
    if (process.platform === "darwin") {
      baseLocation = "/Users";
    } else {
      baseLocation = "/home";
    }
  }
  tempDirectory = path.join(baseLocation, "actions", "temp");
}

//
// Node versions interface
// see https://nodejs.org/dist/index.json
//
interface INodeVersion {
  version: string;
  files: string[];
}

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

  const denoBin = denoBinPath();
  fs.copyFileSync(path.join(toolPath, "deno"), path.join(denoBin, "deno"));

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
      return path.join(process.env.HOME || "", ".deno", "bin");
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
  if (extension == "zip") {
    extPath = await tc.extractZip(downloadPath, fs.mkdtempSync("deno"));
  } else if (extension == "gz") {
    fs.renameSync(downloadPath, `${downloadPath}.gz`);
    execSync(`gzip -d ${downloadPath}.gz`);
    extPath = fs.mkdtempSync("deno");
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
  return await tc.cacheFile(tool, "deno", "deno", version);
}
