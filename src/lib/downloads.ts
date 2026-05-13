import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type DownloadItem = {
  path: string;
  name: string;
  createdAt: number;
  isDirectory: boolean;
  sizeBytes: number;
};

// Browser temp/partial-download extensions that shouldn't be included.
const IN_PROGRESS_SUFFIXES = [
  ".crdownload", // Chromium / Chrome / Edge / Arc
  ".download", // Safari
  ".part", // Firefox
  ".partial",
  ".filepart",
  ".aria2", // aria2 partial file
];

function isInProgressFile(name: string): boolean {
  const lower = name.toLowerCase();
  return IN_PROGRESS_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

export async function listDownloadFolder(
  folderPath: string,
): Promise<DownloadItem[]> {
  let entries: string[];
  try {
    entries = await readdir(folderPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Couldn't read "${folderPath}": ${message}`);
  }

  const items: DownloadItem[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) {
      continue; // .DS_Store and other hidden entries
    }
    if (isInProgressFile(entry)) {
      continue; // Skip downloads still in progress
    }

    const itemPath = path.join(folderPath, entry);

    let stats;
    try {
      stats = await stat(itemPath);
    } catch {
      continue; // Race: file disappeared between readdir and stat
    }

    items.push({
      path: itemPath,
      name: entry,
      createdAt: stats.birthtimeMs || stats.mtimeMs,
      isDirectory: stats.isDirectory(),
      sizeBytes: stats.size,
    });
  }

  // Newest first.
  items.sort((first, second) => second.createdAt - first.createdAt);

  return items;
}

// Anchor batch detection to the most recent item — every item within
// `batchGapMs` of the newest one is included. This is more predictable
// than walking pairwise gaps.
export function selectLatestBatch(
  items: DownloadItem[],
  batchGapMs: number,
): DownloadItem[] {
  if (items.length === 0) {
    return [];
  }

  const anchor = items[0].createdAt;
  const batch = items.filter((item) => anchor - item.createdAt <= batchGapMs);

  // Return oldest first so the move log is in download order.
  return batch.sort((first, second) => first.createdAt - second.createdAt);
}
