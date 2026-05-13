import { LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { rename, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { DownloadItem } from "./downloads";
import type { ConflictPolicy } from "./preferences";

const execFileAsync = promisify(execFile);

export type PlannedMove = {
  source: string;
  destination: string;
  name: string;
  skipped?: boolean;
};

export type ImportSummary = {
  movedCount: number;
  skippedCount: number;
  destinationFolderPath: string;
};

const UNDO_KEY = "last-import";

type UndoEntry = {
  moves: { source: string; destination: string }[];
  timestamp: number;
};

export async function planMoves(
  items: DownloadItem[],
  destinationFolderPath: string,
  conflictPolicy: ConflictPolicy,
): Promise<PlannedMove[]> {
  const plannedMoves: PlannedMove[] = [];
  const reservedDestinations = new Set<string>();

  for (const item of items) {
    let destination = path.join(destinationFolderPath, item.name);

    if (
      reservedDestinations.has(destination) ||
      (await pathExists(destination))
    ) {
      if (conflictPolicy === "abort") {
        throw new Error(
          `"${item.name}" already exists in the destination folder. ` +
            `Change the conflict policy in preferences, or move the existing file first.`,
        );
      }

      if (conflictPolicy === "skip") {
        plannedMoves.push({
          source: item.path,
          destination,
          name: item.name,
          skipped: true,
        });
        continue;
      }

      // rename policy
      destination = await findFreeName(destination, reservedDestinations);
    }

    plannedMoves.push({
      source: item.path,
      destination,
      name: path.basename(destination),
    });
    reservedDestinations.add(destination);
  }

  return plannedMoves;
}

async function findFreeName(
  basePath: string,
  reserved: Set<string>,
): Promise<string> {
  const directory = path.dirname(basePath);
  const extension = path.extname(basePath);
  const stem = path.basename(basePath, extension);

  for (let counter = 1; counter < 10_000; counter++) {
    const candidate = path.join(directory, `${stem} (${counter})${extension}`);
    if (reserved.has(candidate)) {
      continue;
    }
    if (!(await pathExists(candidate))) {
      return candidate;
    }
  }

  throw new Error(
    `Couldn't find a free name for "${path.basename(basePath)}".`,
  );
}

export async function executeMoves(
  plannedMoves: PlannedMove[],
  destinationFolderPath: string,
  finderTag: string,
): Promise<ImportSummary> {
  const executed: { source: string; destination: string }[] = [];
  let skipped = 0;

  for (const move of plannedMoves) {
    if (move.skipped) {
      skipped += 1;
      continue;
    }
    await rename(move.source, move.destination);
    executed.push({ source: move.source, destination: move.destination });
  }

  if (finderTag.length > 0 && executed.length > 0) {
    await applyFinderTag(
      executed.map((move) => move.destination),
      finderTag,
    );
  }

  if (executed.length > 0) {
    const entry: UndoEntry = { moves: executed, timestamp: Date.now() };
    await LocalStorage.setItem(UNDO_KEY, JSON.stringify(entry));
  }

  return {
    movedCount: executed.length,
    skippedCount: skipped,
    destinationFolderPath,
  };
}

async function applyFinderTag(filePaths: string[], tag: string) {
  // Use AppleScript to set Finder tags. This is the most reliable way without
  // shelling out to xattr and writing the binary plist by hand.
  const escapedTag = escapeForAppleScript(tag);
  const escapedPaths = filePaths.map(escapeForAppleScript);

  const setStatements = escapedPaths
    .map(
      (escapedPath) =>
        `set the tags of (POSIX file "${escapedPath}" as alias) to {"${escapedTag}"}`,
    )
    .join("\n        ");

  const script = `
    tell application "Finder"
      try
        ${setStatements}
      end try
    end tell
  `;

  try {
    await execFileAsync("osascript", ["-e", script]);
  } catch {
    // Tagging is best-effort — don't fail the whole import if it doesn't work.
  }
}

function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function pathExists(targetPath: string): Promise<boolean> {
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

export async function readUndoEntry(): Promise<UndoEntry | undefined> {
  const raw = await LocalStorage.getItem<string>(UNDO_KEY);
  if (typeof raw !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(raw) as UndoEntry;
  } catch {
    return undefined;
  }
}

export async function clearUndoEntry(): Promise<void> {
  await LocalStorage.removeItem(UNDO_KEY);
}

export async function undoLastImport(): Promise<{
  restoredCount: number;
  missingCount: number;
}> {
  const entry = await readUndoEntry();
  if (entry === undefined) {
    throw new Error("No recent import to undo.");
  }

  let restored = 0;
  let missing = 0;

  // Undo in reverse so any renames are applied in correct order.
  for (const move of [...entry.moves].reverse()) {
    if (!(await pathExists(move.destination))) {
      missing += 1;
      continue;
    }
    if (await pathExists(move.source)) {
      // Source is occupied now — skip rather than overwrite.
      missing += 1;
      continue;
    }
    await rename(move.destination, move.source);
    restored += 1;
  }

  await clearUndoEntry();
  return { restoredCount: restored, missingCount: missing };
}

export function formatCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
