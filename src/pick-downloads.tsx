import {
  Action,
  ActionPanel,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";
import {
  ensureDateSubfolder,
  resolveDestinationFolder,
} from "./lib/destination";
import { listDownloadFolder } from "./lib/downloads";
import type { DownloadItem } from "./lib/downloads";
import { executeMoves, formatCount, planMoves } from "./lib/import-engine";
import { getPreferences } from "./lib/preferences";

const MAX_ITEMS_SHOWN = 50;

export default function Command() {
  const [items, setItems] = useState<DownloadItem[] | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | undefined>(undefined);
  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const preferences = getPreferences();
        const allItems = await listDownloadFolder(preferences.downloadsFolder);
        const trimmed = allItems.slice(0, MAX_ITEMS_SHOWN);
        setItems(trimmed);
        // Pre-select everything inside the batch window.
        const anchor = trimmed[0]?.createdAt ?? 0;
        const preselected = new Set(
          trimmed
            .filter((item) => anchor - item.createdAt <= preferences.batchGapMs)
            .map((item) => item.path),
        );
        setSelected(preselected);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        setItems([]);
      }
    })();
  }, []);

  function toggle(itemPath: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(itemPath)) {
        next.delete(itemPath);
      } else {
        next.add(itemPath);
      }
      return next;
    });
  }

  async function runImport() {
    if (items === undefined || selected.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one file",
      });
      return;
    }

    try {
      const preferences = getPreferences();
      const destinationParent = await resolveDestinationFolder();
      const destinationFolder = preferences.dateSubfolder
        ? await ensureDateSubfolder(destinationParent, new Date())
        : destinationParent;

      const picked = items.filter((item) => selected.has(item.path));
      // Move oldest first to match download order.
      picked.sort((first, second) => first.createdAt - second.createdAt);

      const plannedMoves = await planMoves(
        picked,
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
      pop();
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't import downloads",
        message: caught instanceof Error ? caught.message : String(caught),
      });
    }
  }

  if (error !== undefined) {
    return (
      <List>
        <List.EmptyView title="Couldn't read Downloads" description={error} />
      </List>
    );
  }

  return (
    <List
      isLoading={items === undefined}
      searchBarPlaceholder="Filter downloads"
      navigationTitle={`Pick Downloads (${selected.size} selected)`}
    >
      {items?.map((item) => {
        const isSelected = selected.has(item.path);
        return (
          <List.Item
            key={item.path}
            title={item.name}
            subtitle={formatRelativeTime(item.createdAt)}
            accessories={[
              { text: formatBytes(item.sizeBytes) },
              { icon: isSelected ? Icon.CheckCircle : Icon.Circle },
            ]}
            icon={item.isDirectory ? Icon.Folder : Icon.Document}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect" : "Select"}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(item.path)}
                />
                <Action
                  title={`Import ${formatCount(selected.size, "Selected File")}`}
                  icon={Icon.ArrowDown}
                  onAction={runImport}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action
                  title="Select All"
                  icon={Icon.Checkmark}
                  onAction={() =>
                    setSelected(
                      new Set(items?.map((entry) => entry.path) ?? []),
                    )
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
                <Action
                  title="Deselect All"
                  icon={Icon.XMarkCircle}
                  onAction={() => setSelected(new Set())}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function formatRelativeTime(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
