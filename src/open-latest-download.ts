import { open, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { listDownloadFolder } from "./lib/downloads";
import { getPreferences } from "./lib/preferences";

const execFileAsync = promisify(execFile);

export default async function command() {
  try {
    const preferences = getPreferences();
    const items = await listDownloadFolder(preferences.downloadsFolder);

    if (items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No downloads found",
        message: preferences.downloadsFolder,
      });
      return;
    }

    const latest = items[0];

    // Reveal in Finder rather than opening the file directly — safer and
    // matches what Cmd-L on a Finder download item does.
    await execFileAsync("open", ["-R", latest.path]);

    // Fallback: if `open -R` ever fails on a future macOS, this branch is
    // unreachable, but the helper is friendlier than throwing.
    await showHUD(`Revealed "${latest.name}" in Finder`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open latest download",
      message,
    });

    // Best-effort fallback: try to open the downloads folder itself.
    try {
      await open(getPreferences().downloadsFolder);
    } catch {
      // give up
    }
  }
}
