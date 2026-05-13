import {
  getSelectedFinderItems,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { readdir, rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const BATCH_GAP_THRESHOLD_MS = 60 * 1000;
const downloadsPath = path.join(homedir(), "Downloads");
const execFileAsync = promisify(execFile);

type DownloadItem = {
  path: string;
  name: string;
  createdAt: number;
};

type PlannedMove = {
  source: string;
  destination: string;
  name: string;
};

export default async function command() {
  try {
    const destinationFolderPath = await getDestinationFolderPath();
    const downloadedBatch = await getLatestDownloadedBatch();
    const moves = await planMoves(downloadedBatch, destinationFolderPath);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Importing ${formatCount(moves.length, "file")}...`,
    });

    for (const move of moves) {
      await rename(move.source, move.destination);
    }

    toast.style = Toast.Style.Success;
    toast.title = `Imported ${formatCount(moves.length, "file")}`;
    toast.message = path.basename(destinationFolderPath);

    await showHUD(toast.title);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't import downloads",
      message,
    });
  }
}

async function getDestinationFolderPath() {
  const selectedItems = await getSelectedFinderItems();

  if (selectedItems.length === 1) {
    const selectedPath = selectedItems[0].path;
    const selectedStats = await stat(selectedPath);

    if (selectedStats.isDirectory()) {
      return selectedPath;
    }
  }

  if (selectedItems.length > 1) {
    throw new Error("Select one Finder folder.");
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

async function getLatestDownloadedBatch() {
  const entries = await readdir(downloadsPath);
  const items: DownloadItem[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) {
      continue;
    }

    const itemPath = path.join(downloadsPath, entry);
    const itemStats = await stat(itemPath);

    if (!itemStats.isFile()) {
      continue;
    }

    items.push({
      path: itemPath,
      name: entry,
      createdAt: itemStats.birthtimeMs,
    });
  }

  if (items.length === 0) {
    throw new Error("No files found in Downloads.");
  }

  items.sort((first, second) => second.createdAt - first.createdAt);

  const batch = [items[0]];

  for (let index = 1; index < items.length; index++) {
    const previous = items[index - 1];
    const current = items[index];
    const gap = previous.createdAt - current.createdAt;

    if (gap > BATCH_GAP_THRESHOLD_MS) {
      break;
    }

    batch.push(current);
  }

  return batch.sort((first, second) => first.createdAt - second.createdAt);
}

async function planMoves(items: DownloadItem[], destinationFolderPath: string) {
  const plannedMoves: PlannedMove[] = [];

  for (const item of items) {
    const destination = path.join(destinationFolderPath, item.name);

    if (await pathExists(destination)) {
      throw new Error(`"${item.name}" already exists in the selected folder.`);
    }

    plannedMoves.push({
      source: item.path,
      destination,
      name: item.name,
    });
  }

  return plannedMoves;
}

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function formatCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
