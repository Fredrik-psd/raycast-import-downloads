import { showHUD, showToast, Toast } from "@raycast/api";
import { formatCount, undoLastImport } from "./lib/import-engine";

export default async function command() {
  try {
    const result = await undoLastImport();

    if (result.restoredCount === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing was restored",
        message:
          result.missingCount > 0
            ? `${result.missingCount} file(s) couldn't be moved back — they were renamed, deleted, or the source path is occupied.`
            : undefined,
      });
      return;
    }

    const suffix =
      result.missingCount > 0
        ? ` (${formatCount(result.missingCount, "skipped")})`
        : "";

    await showHUD(
      `Restored ${formatCount(result.restoredCount, "file")}${suffix}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't undo import",
      message,
    });
  }
}
