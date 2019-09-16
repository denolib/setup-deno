// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env["RUNNER_TEMPDIRECTORY"] || "";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as os from "os";
import * as path from "path";

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
    // download, extract, cache
    toolPath = await acquireDeno(version);
  }

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);
}

async function acquireDeno(version: string): Promise<string> {
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //
  let platform: "osx" | "linux" | "win";
  let extension: "gz" | "zip";
  let denoBinPath: string;

  switch (os.platform()) {
    case "darwin":
      platform = "osx";
      extension = "gz";
      denoBinPath = `${process.env.HOME}/.deno/bin`;
      break;
    case "linux":
      platform = "linux";
      extension = "gz";
      denoBinPath = `${process.env.HOME}/.deno/bin`;
      break;
    case "win32":
      platform = "win";
      extension = "zip";
      denoBinPath = `${process.env.HOME}\\.deno\\bin`;
      break;
    default:
      throw "Invalid platform";
  }

  let downloadUrl = `https://github.com/denoland/deno/releases/download/${version}/deno_${platform}_x64.${extension}`;

  let downloadPath: string;

  try {
    downloadPath = await tc.downloadTool(downloadUrl);
  } catch (err) {
    throw err;
  }

  //
  // Extract
  //
  let extPath: string;
  if (extension == "zip") {
    extPath = await tc.extractZip(downloadPath, denoBinPath);
  } else {
    extPath = await tc.extractTar(downloadPath, denoBinPath);
  }

  //
  // Install into the local tool cache - deno extracts a file that matches the fileName downloaded
  //
  let tool = path.join(denoBinPath, `deno_${platform}_x64`);
  return await tc.cacheFile(tool, `deno`, "deno", version);
}
