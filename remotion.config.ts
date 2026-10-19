// Settings for the Remotion preview and renderer.
// Docs: https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(false); // never overwrite an old render (v1, v2, ...)
// Files for staticFile() come straight from the episode folders, e.g.
// staticFile("ep01-pompeii-part1/voice/voice.wav"). No copying into public/ needed.
Config.setPublicDir("./episodes");
