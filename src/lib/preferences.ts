import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import path from "node:path";

export type ConflictPolicy = "abort" | "skip" | "rename";

export type Preferences = {
  downloadsFolder: string;
  batchGapMs: number;
  conflictPolicy: ConflictPolicy;
  dateSubfolder: boolean;
  finderTag: string;
};

type RawPreferences = {
  downloadsFolder?: string;
  batchGapSeconds?: string;
  conflictPolicy?: ConflictPolicy;
  dateSubfolder?: boolean;
  finderTag?: string;
};

const DEFAULT_DOWNLOADS_FOLDER = path.join(homedir(), "Downloads");
const DEFAULT_BATCH_GAP_SECONDS = 60;

export function getPreferences(): Preferences {
  const raw = getPreferenceValues<RawPreferences>();

  const downloadsFolder =
    raw.downloadsFolder && raw.downloadsFolder.length > 0
      ? raw.downloadsFolder
      : DEFAULT_DOWNLOADS_FOLDER;

  const batchGapSeconds = parsePositiveNumber(
    raw.batchGapSeconds,
    DEFAULT_BATCH_GAP_SECONDS,
  );

  return {
    downloadsFolder,
    batchGapMs: batchGapSeconds * 1000,
    conflictPolicy: raw.conflictPolicy ?? "abort",
    dateSubfolder: raw.dateSubfolder ?? false,
    finderTag: (raw.finderTag ?? "").trim(),
  };
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
