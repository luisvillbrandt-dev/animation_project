// Runs a Python script with the project's own Python environment (.venv), on Windows and Mac.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const python = process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python";

if (!existsSync(python)) {
  console.error(
    "The Python environment is missing. Create it once with:\n" +
      "  py -3.12 -m venv .venv            (Mac: python3.12 -m venv .venv)\n" +
      "  " + python + " -m pip install -r scripts/requirements.txt",
  );
  process.exit(1);
}

const result = spawnSync(python, process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 1);
