import { showHUD, showToast, Toast } from "@raycast/api";
import path from "node:path";
import {
  ensureDateSubfolder,
  resolveDestinationFolder,
} from "./lib/destination";
import { listDownloadFolder, selectLatestBatch } from "./lib/downloads";
import { executeMoves, formatCount, planMoves } from "./lib/import-engine";
import { getPreferences } from "./lib/preferences";

export default async function command() {
  try {
    const preferences = getPreferences();
    const destinationParent = await resolveDestinationFolder();
    const destinationFolder = preferences.dateSubfolder
      ? await ensureDateSubfolder(destinationParent, new Date())
      : destinationParent;

    const items = await listDownloadFolder(preferences.downloadsFolder);
    const batch = selectLatestBatch(items, preferences.batchGapMs);

    if (batch.length === 0) {
      throw new Error(
        items.length === 0
          ? `No files found in "${preferences.downloadsFolder}".`
          : "No recent downloads found in the batch window.",
      );
    }

    const plannedMoves = await planMoves(
      batch,
      destinationFolder,
      preferences.conflictPolicy,
    );

    const moveCount = plannedMoves.filter((move) => !move.skipped).length;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Importing ${formatCount(moveCount, "file")}…`,
    });

    const summary = await executeMoves(
      plannedMoves,
      destinationFolder,
      preferences.finderTag,
    );

    const skippedSuffix =
      summary.skippedCount > 0
        ? ` (skipped ${formatCount(summary.skippedCount, "conflict")})`
        : "";

    toast.style = Toast.Style.Success;
    toast.title = `Imported ${formatCount(summary.movedCount, "file")}${skippedSuffix}`;
    toast.message = path.basename(summary.destinationFolderPath);

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
