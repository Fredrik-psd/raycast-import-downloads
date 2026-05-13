# Import Downloads

A Raycast extension that moves your most recent downloads into a Finder folder in one step.

## What it does

Run the **Import Downloads** command and it will:

1. Pick a destination folder — either the folder selected in Finder, or the folder of the front Finder window if nothing is selected.
2. Find the most recently downloaded files in `~/Downloads`. Files created within a one-minute gap of each other are treated as a single "batch".
3. Move the entire batch into the destination folder.

If a file in the batch would overwrite something with the same name in the destination, the command aborts without moving anything.

## Usage

1. In Finder, either select a folder or open a Finder window pointing at the folder you want to import into.
2. Run **Import Downloads** from Raycast.

A success HUD shows how many files were moved.
