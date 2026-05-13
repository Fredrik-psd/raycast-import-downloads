# Import Downloads Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Commands
- **Import Downloads** moves the latest batch of files from the downloads folder into the selected (or front-window) Finder folder.
- **Pick Downloads to Import** opens a checkbox list of recent downloads with sizes and ages.
- **Open Latest Download** reveals the most recently downloaded file in Finder.
- **Undo Last Import** moves the most recently imported files back to where they came from.

### Behaviour
- Browser temp files (`*.crdownload`, `*.download`, `*.part`, `*.partial`, `*.filepart`, `*.aria2`) are skipped so in-progress downloads can't be moved.
- Batch detection is anchored to the most recent file — every file within the batch-gap window is part of the batch.

### Preferences
- Customise the downloads folder, batch gap, conflict policy (abort/skip/rename), optional date subfolder, and optional Finder tag.
