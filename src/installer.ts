import type { Version, Arch, Platform } from "./types";

import * as os from "os";
import * as path from "path";

// On load grab temp directory and cache directory and remove them from env (currently don't want to expose this)
let tempDirectory: string = process.env["RUNNER_TEMP"] || "";
let cacheRoot: string = process.env["RUNNER_TOOL_CACHE"] || "";
// If directories not found, place them in common temp locations
if (!tempDirectory || !cacheRoot) {
  let baseLocation: string;
  if (process.platform === "win32") {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env["USERPROFILE"] || "C:\\";
  } else {
    if (process.platform === "darwin") {
      baseLocation = process.env["HOME"] || "/Users";
    } else {
      baseLocation = process.env["HOME"] || "/home";
    }
  }
  if (!tempDirectory) {
    tempDirectory = path.join(baseLocation, "actions", "temp");
  }
  if (!cacheRoot) {
    cacheRoot = path.join(baseLocation, "actions", "cache");
  }
  process.env["RUNNER_TEMP"] = tempDirectory;
  process.env["RUNNER_TOOL_CACHE"] = cacheRoot;
}

import * as fs from "fs";
import * as semver from "semver";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as uuidV4 from "uuid";
import { HttpClient } from "@actions/http-client";

function getDenoArch(version: Version): Arch {
  return version === "nightly"
    ? "x86_64"
    : semver.lte(version, "0.38.0")
    ? "x64"
    : "x86_64";
}

function getDenoPlatform(version: Version): Platform {
  const platform = os.platform();
  const isLessThenV35 =
    version === "nightly" ? false : semver.lte(version, "0.38.0");

  let rtv: Platform | null = null;
  if (platform === "darwin") rtv = isLessThenV35 ? "osx" : "apple-darwin";
  else if (platform === "win32")
    rtv = isLessThenV35 ? "win" : "pc-windows-msvc";
  else if (platform === "linux")
    rtv = isLessThenV35 ? "linux" : "unknown-linux-gnu";
  if (!rtv) throw new Error(`Unexpected OS ${platform}`);
  return rtv;
}

export async function getDeno(version: Version): Promise<void> {
  let toolPath = tc.find("deno", version);

  if (toolPath) {
    core.debug(`Found in cache @ ${toolPath}`);
  } else {
    // If not found in cache, download
    core.debug(`Downloading deno at version ${version}`);
    toolPath = await acquireDeno(version);
  }

  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);
  // set `deno install` root
  core.addPath(
    process.env.DENO_INSTALL_ROOT || path.join(os.homedir(), ".deno", "bin")
  );
}

// Get a clear version
// eg.
// 1.x -> 1.1.2
// 1.1.x -> 1.1.2
// 0.x -> 0.43.0
// nightly -> nightly
export async function clearVersion(version: Version): Promise<string> {
  if (version === "nightly") {
    return version;
  }
  const c = semver.clean(version) || "";
  if (semver.valid(c)) {
    version = c;
  } else {
    // query deno tags for a matching version
    version = await queryLatestMatch(version);
    if (!version) {
      throw new Error(`Unable to find Deno version ${version}`);
    }
  }
  return version;
}

async function queryLatestMatch(versionSpec: Version): Promise<string> {
  if (versionSpec === "nightly") {
    return versionSpec;
  }
  function cmp(a: string, b: string): 1 | -1 {
    if (semver.gt(a, b)) return 1;
    return -1;
  }
  let version = "";
  const versions = (await getAvailableVersions()).sort(cmp);
  core.debug(`found Deno versions '${JSON.stringify(versions, null, 2)}'`);
  for (let i = versions.length - 1; i >= 0; --i) {
    if (semver.satisfies(versions[i], versionSpec)) {
      version = versions[i];
      break;
    }
  }

  if (version) {
    core.debug(`matched: ${version}`);
  } else {
    core.debug(`match not found`);
  }

  return version;
}

export async function getAvailableVersions(): Promise<string[]> {
  // a temporary workaround until a Release API is provided. (#11)
  const httpc = new HttpClient("setup-deno");
  const body = await (
    await httpc.get(
      "https://raw.githubusercontent.com/denoland/deno/master/Releases.md"
    )
  ).readBody();
  const matches = body.matchAll(/### (v?\d+\.\d+\.\d+)/g);

  return [...matches]
    .map((m) => m[1])
    .filter((v) => v && v !== "v0.0.0")
    .map((version) => (version.startsWith("v") ? version : "v" + version));
}

export function getDownloadUrl(version: Version): string {
  // The old release file only keep to Deno v0.38.0
  const platform = getDenoPlatform(version);
  const arch = getDenoArch(version);
  let filename: string;
  if (version === "nightly") {
    filename = `deno-nightly-${arch}-${platform}.zip`;
    return `https://github.com/maximousblk/deno_nightly/releases/download/latest/${filename}`;
  } else if (semver.lte(version, "0.38.0")) {
    const extName = process.platform === "win32" ? "zip" : "gz";
    filename = `deno_${platform}_${arch}.${extName}`;
  } else {
    filename = `deno-${arch}-${platform}.zip`;
  }

  version = version.replace(/^v/, "");

  return `https://github.com/denoland/deno/releases/download/v${version}/${filename}`;
}

export async function extractDenoArchive(
  version: Version,
  archiveFilepath: string
): Promise<string> {
  let extPath = "";

  if (version === "nightly") {
    extPath = await tc.extractZip(archiveFilepath);
  } else if (semver.lte(version, "0.38.0")) {
    if (process.platform === "win32") {
      extPath = await tc.extractZip(archiveFilepath);
    } else {
      extPath = path.join(archiveFilepath, "..", uuidV4());
      const gzFile = path.join(extPath, "deno.gz");
      await io.mv(archiveFilepath, gzFile);
      const gzPzth = await io.which("gzip");
      await exec.exec(gzPzth, ["-d", gzFile]);
      fs.chmodSync(path.join(extPath, "deno"), "755");
    }
  } else {
    extPath = await tc.extractZip(archiveFilepath);
  }

  return extPath;
}

export async function acquireDeno(version: string): Promise<string> {
  core.debug(`acquire Deno '${version}'`);
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //

  version = await clearVersion(version);

  core.debug(`resolve Deno '${version}'`);

  const downloadUrl = getDownloadUrl(version);

  core.debug(`download Deno from '${downloadUrl}'`);

  const downloadPath = await tc.downloadTool(downloadUrl);

  //
  // Extract
  //
  let extPath = await extractDenoArchive(version, downloadPath);

  core.debug(`deno file path '${extPath}'`);

  if (version === "nightly") {
    const newPath = path.join(path.dirname(extPath), "deno");
    core.debug(`move deno file from '${extPath}' to '${newPath}'`);
    fs.renameSync(extPath, newPath);
    extPath = newPath;
  }

  //
  // Install into the local tool cache - deno extracts a file that matches the fileName downloaded
  //
  const toolPath = await tc.cacheDir(extPath, "deno", version);
  return toolPath;
}
