# Import Downloads

A Raycast extension that moves recent downloads into a Finder folder.

## Commands

- **Import Downloads** — fastest path. Detects the latest batch of files in `~/Downloads` (anything within the batch-gap window of the most recent file) and moves it into the destination folder.
- **Pick Downloads to Import** — opens a checkbox list of recent downloads with file sizes and ages so you can choose exactly which to import.
- **Open Latest Download** — reveals the most recently downloaded file in Finder.
- **Undo Last Import** — moves the most recently imported files back to where they came from.

## Choosing the destination

- If a single folder is selected in Finder → that's the destination.
- Otherwise the destination is the folder shown in the front Finder window.

## Preferences

- **Downloads Folder** — where to look for files. Defaults to `~/Downloads`.
- **Batch Gap (seconds)** — files downloaded within this many seconds of the most recent are part of the batch. Defaults to 60.
- **On Filename Conflict** — abort the whole import, skip the conflicting file, or auto-rename with `(1)`, `(2)`, …
- **Date Subfolder** — when on, files are moved into a `YYYY-MM-DD` subfolder inside the destination.
- **Finder Tag** — when set, imported files are tagged in Finder with the given colour or label.

## In-progress download safety

Browser temp files (`*.crdownload`, `*.download`, `*.part`, `*.partial`, `*.filepart`, `*.aria2`) are ignored so a file that's still being downloaded can't be moved by mistake.
