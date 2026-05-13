import { getSelectedFinderItems } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function resolveDestinationFolder(): Promise<string> {
  const selectedItems = await getSelectedFinderItems();

  if (selectedItems.length === 1) {
    const selectedPath = selectedItems[0].path;
    const selectedStats = await stat(selectedPath);

    if (selectedStats.isDirectory()) {
      return selectedPath;
    }
  }

  if (selectedItems.length > 1) {
    throw new Error("Select one Finder folder, or none for the front window.");
  }

  return getFrontFinderFolderPath();
}

async function getFrontFinderFolderPath() {
  const script = `
    tell application "Finder"
      if not (exists front Finder window) then error "Open a Finder folder."
      POSIX path of (target of front Finder window as alias)
    end tell
  `;
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout.trim().replace(/\/$/, "");
}

export async function ensureDateSubfolder(
  parentPath: string,
  date: Date,
): Promise<string> {
  const dateString = date.toISOString().slice(0, 10);
  const subfolderPath = path.join(parentPath, dateString);
  await mkdir(subfolderPath, { recursive: true });
  return subfolderPath;
}
