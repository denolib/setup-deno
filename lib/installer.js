"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env["RUNNER_TEMPDIRECTORY"] || "";
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
let osPlat = os.platform();
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === "win32") {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env["USERPROFILE"] || "C:\\";
    }
    else {
        if (process.platform === "darwin") {
            baseLocation = "/Users";
        }
        else {
            baseLocation = "/home";
        }
    }
    tempDirectory = path.join(baseLocation, "actions", "temp");
}
function getDeno(version) {
    return __awaiter(this, void 0, void 0, function* () {
        // check cache
        let toolPath;
        toolPath = tc.find("deno", version);
        // If not found in cache, download
        if (!toolPath) {
            core.debug(`Downloading deno at version ${version}`);
            // download, extract, cache
            toolPath = yield acquireDeno(version);
            core.debug(`Deno downloaded to ${toolPath}`);
        }
        else {
            core.debug(`Cached deno found at ${toolPath}`);
        }
        const denoBin = denoBinPath();
        fs.copyFileSync(path.join(toolPath, "deno"), path.join(denoBin, "deno"));
        fs.chmodSync(path.join(denoBin, "deno"), 0o755);
        //
        // prepend the tools path. instructs the agent to prepend for future tasks
        core.addPath(denoBin);
    });
}
exports.getDeno = getDeno;
function denoBinPath() {
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
function acquireDeno(version) {
    return __awaiter(this, void 0, void 0, function* () {
        //
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        //
        let platform;
        let extension;
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
        core.debug(`Trying to install for platform ${platform} with extension ${extension}`);
        let toolName = `deno_${platform}_x64`;
        let downloadUrl = `https://github.com/denoland/deno/releases/download/${version}/${toolName}.${extension}`;
        let downloadPath;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (err) {
            throw err;
        }
        core.debug(`Downloaded ${downloadUrl} to ${downloadPath}`);
        //
        // Extract
        //
        let extPath;
        if (extension == "zip") {
            extPath = yield tc.extractZip(downloadPath, fs.mkdtempSync("deno"));
        }
        else if (extension == "gz") {
            fs.renameSync(downloadPath, `${downloadPath}.gz`);
            child_process_1.execSync(`gzip -d ${downloadPath}.gz`);
            extPath = fs.mkdtempSync("deno");
            fs.renameSync(downloadPath, path.join(extPath, toolName));
        }
        else {
            throw "Unknown extension";
        }
        core.debug(`Extracted archive to ${extPath}`);
        //
        // Install into the local tool cache - deno extracts a file that matches the fileName downloaded
        //
        let tool = path.join(extPath, toolName);
        core.debug(`Cache file ${tool} into toolcache`);
        return yield tc.cacheFile(tool, "deno", "deno", version);
    });
}
