import * as io from "@actions/io";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const toolDir = path.join(
  __dirname,
  "runner",
  path.join(
    Math.random()
      .toString(36)
      .substring(7)
  ),
  "tools"
);
const tempDir = path.join(
  __dirname,
  "runner",
  path.join(
    Math.random()
      .toString(36)
      .substring(7)
  ),
  "temp"
);

process.env["RUNNER_TOOL_CACHE"] = toolDir;
process.env["RUNNER_TEMP"] = tempDir;
import * as semver from "semver";
import * as installer from "../src/installer";

const EXTENSION = process.platform == "win32" ? ".exe" : "";

describe("installer tests", () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  it("Acquires version of deno if no matching version is installed", async () => {
    await installer.getDeno("0.20.0");
    const denoDir = path.join(toolDir, "deno", "0.20.0", os.arch());
    console.log(`${denoDir}.complete`);
    expect(fs.existsSync(`${denoDir}.complete`)).toBe(true);
    expect(fs.existsSync(path.join(denoDir, `deno${EXTENSION}`))).toBe(true);
  }, 100000);

  it("Throws if no location contains correct deno version", async () => {
    let thrown = false;
    try {
      await installer.getDeno("1000");
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

  it("Acquires version of deno with uncleaned version", async () => {
    await installer.getDeno("v0.21.0");
    const denoDir = path.join(toolDir, "deno", "0.21.0", os.arch());

    expect(fs.existsSync(`${denoDir}.complete`)).toBe(true);
    expect(fs.existsSync(path.join(denoDir, `deno${EXTENSION}`))).toBe(true);
  }, 100000);

  it("Uses version of deno installed in cache", async () => {
    const denoDir = path.join(toolDir, "deno", "250.0.0", os.arch());
    await io.mkdirP(denoDir);
    fs.writeFileSync(`${denoDir}.complete`, "hello");
    // This will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getDeno("250.0.0");
    return;
  });

  it("Doesnt use version of deno that was only partially installed in cache", async () => {
    const denoDir: string = path.join(toolDir, "deno", "251.0.0", os.arch());
    await io.mkdirP(denoDir);
    let thrown = false;
    try {
      // This will throw if it doesn't find it in the cache (because no such version exists)
      await installer.getDeno("251.0.0");
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
    return;
  });

  it("Resolves semantic versions of deno installed in cache", async () => {
    const deno: string = path.join(toolDir, "deno", "252.0.0", os.arch());
    await io.mkdirP(deno);
    fs.writeFileSync(`${deno}.complete`, "hello");
    // These will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getDeno("v252.0.0");
    await installer.getDeno("252.0.0");
    await installer.getDeno("v252.0.x");
    await installer.getDeno("252.0.x");
    await installer.getDeno("v252.0");
    await installer.getDeno("252.0");
  });

  it("Should be valid versions of deno", async () => {
    const versions = await installer.getAvailableVersions();

    // the number of versions is increasing
    expect(versions.length).toBeGreaterThanOrEqual(62);

    for (const v of versions) {
      expect(semver.valid(v)).not.toBeNull();
    }
  });
});
