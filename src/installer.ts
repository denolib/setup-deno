// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env["RUNNER_TEMPDIRECTORY"] || "";

import * as os from "os";
import * as path from "path";
import * as semver from "semver";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as restm from "typed-rest-client/RestClient";

type Platform = "win" | "linux" | "osx";

if (!tempDirectory) {
  let baseLocation;
  if (process.platform == "win32") {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env["USERPROFILE"] || "C:\\";
  } else {
    if (process.platform == "darwin") {
      baseLocation = "/Users";
    } else {
      baseLocation = "/home";
    }
  }
  tempDirectory = path.join(baseLocation, "actions", "cache");
}

const osArch = os.arch();
function osPlat() {
  const platform = os.platform();
  let rtv: Platform | null = null;
  if (platform == "darwin") rtv = "osx";
  else if (platform == "linux") rtv = "linux";
  else if (platform == "win32") rtv = "win";
  if (!rtv) throw new Error(`Unexpected OS ${osPlat}`);
  return rtv as Platform;
}

export async function getDeno(version: string) {
  version = await clearVersion(version);

  // check cache
  let toolPath: string;
  toolPath = tc.find("deno", version);

  // If not found in cache, download
  if (!toolPath) {
    toolPath = await acquireDeno(version);
  }

  //
  // a tool installer initimately knows details about the layout of that tool
  // for example, deno binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  //
  if (osPlat() != "win") {
    toolPath = path.join(toolPath, "bin");
  }

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);
}

async function clearVersion(version: string) {
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

async function queryLatestMatch(versionSpec: string) {
  function cmp(a: string, b: string) {
    if (semver.gt(a, b)) return 1;
    return -1;
  }
  let version = "";
  const versions = (await getAvailableVersions()).sort(cmp);
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

async function getAvailableVersions() {
  const rest = new restm.RestClient("setup-deno");
  const data =
    (
      await rest.get<{ name: string }[]>(
        "https://api.github.com/repos/denoland/deno/tags"
      )
    ).result || [];
  return data.map(v => v.name);
}

async function acquireDeno(version: string): Promise<string> {
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //
  const c = semver.clean(version);
  if (c) {
    version = c;
  } else {
    throw new Error(`Unable to find Deno version ${version}`);
  }
  const fileName = `deno_${osPlat()}_${osArch}`;
  const urlFileName = osPlat() == "win" ? `${fileName}.zip` : `${fileName}.gz`;
  const downloadUrl = `https://github.com/denoland/deno/releases/download/v${version}/${urlFileName}`;
  let downloadPath: string;
  downloadPath = await tc.downloadTool(downloadUrl);

  //
  // Extract
  //
  let extPath = "";
  if (osPlat() == "win") {
    extPath = await tc.extractZip(downloadPath);
  } else {
    const gzip = await io.which("gzip");
    await exec.exec(gzip, ["-dk", downloadPath]);
  }

  //
  // Install into the local tool cache - deno extracts a file that matches the fileName downloaded
  //
  let toolRoot = path.join(extPath, fileName);
  return await tc.cacheDir(toolRoot, "deno", version);
}
