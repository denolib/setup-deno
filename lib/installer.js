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
            // download, extract, cache
            toolPath = yield acquireDeno(version);
        }
        //
        // prepend the tools path. instructs the agent to prepend for future tasks
        core.addPath(toolPath);
    });
}
exports.getDeno = getDeno;
function acquireDeno(version) {
    return __awaiter(this, void 0, void 0, function* () {
        //
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        //
        let platform;
        let extension;
        let denoBinPath;
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
        let downloadPath;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (err) {
            throw err;
        }
        //
        // Extract
        //
        let extPath;
        if (extension == "zip") {
            extPath = yield tc.extractZip(downloadPath, denoBinPath);
        }
        else {
            extPath = yield tc.extractTar(downloadPath, denoBinPath);
        }
        //
        // Install into the local tool cache - deno extracts a file that matches the fileName downloaded
        //
        let tool = path.join(denoBinPath, `deno_${platform}_x64`);
        return yield tc.cacheFile(tool, `deno`, "deno", version);
    });
}
