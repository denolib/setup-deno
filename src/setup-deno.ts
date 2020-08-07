import * as core from "@actions/core";
import * as installer from "./installer";

async function run(): Promise<void> {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    let version = core.getInput("version");
    if (!version) {
      version = core.getInput("deno-version");
    }
    if (version) {
      // TODO: installer doesn't support proxy
      await installer.getDeno(version);
    } else {
      throw new Error("No version specified.");
    }
  } catch (e) {
    const err = e as Error;
    core.setFailed(err.stack || err.message);
  }
}

run();
