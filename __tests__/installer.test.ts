import io = require("@actions/io");
import fs = require("fs");
import os = require("os");
import path = require("path");

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
import * as installer from "../src/installer";

const IS_WINDOWS = process.platform === "win32";

describe("installer tests", () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  it("Acquires version of deno if no matching version is installed", async () => {
    await installer.getDeno("0.24.0");
    const denoDir = path.join(toolDir, "deno", "0.24.0", os.arch());

    expect(fs.existsSync(`${denoDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(denoDir, "deno.exe"))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(denoDir, "bin", "deno"))).toBe(true);
    }
  }, 100000);

  if (IS_WINDOWS) {
    it("Falls back to backup location if first one doesnt contain correct version", async () => {
      await installer.getDeno("5.10.1");
      const denoDir = path.join(toolDir, "deno", "5.10.1", os.arch());

      expect(fs.existsSync(`${denoDir}.complete`)).toBe(true);
      expect(fs.existsSync(path.join(denoDir, "deno.exe"))).toBe(true);
    }, 100000);

    it("Falls back to third location if second one doesnt contain correct version", async () => {
      await installer.getDeno("0.12.18");
      const denoDir = path.join(toolDir, "deno", "0.12.18", os.arch());

      expect(fs.existsSync(`${denoDir}.complete`)).toBe(true);
      expect(fs.existsSync(path.join(denoDir, "deno.exe"))).toBe(true);
    }, 100000);
  }

  it("Throws if no location contains correct deno version", async () => {
    let thrown = false;
    try {
      await installer.getDeno("1000");
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

  it("Acquires version of deno with long paths", async () => {
    await installer.getDeno("v0.24.0");
    const denoDir = path.join(toolDir, "deno", "v0.24.0", os.arch());

    expect(fs.existsSync(`${denoDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(denoDir, "deno.exe"))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(denoDir, "bin", "deno"))).toBe(true);
    }
  }, 100000);

  it("Uses version of deno installed in cache", async () => {
    const denoDir: string = path.join(toolDir, "deno", "250.0.0", os.arch());
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
    const denoDir: string = path.join(toolDir, "deno", "252.0.0", os.arch());
    await io.mkdirP(denoDir);
    fs.writeFileSync(`${denoDir}.complete`, "hello");
    // These will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getDeno("252.0.0");
    await installer.getDeno("252");
    await installer.getDeno("252.0");
  });
});
