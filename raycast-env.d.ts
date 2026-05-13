/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Downloads Folder - Folder to import files from. Defaults to ~/Downloads. */
  "downloadsFolder": string,
  /** Batch Gap (seconds) - Files downloaded within this many seconds of the most recent are part of the batch. */
  "batchGapSeconds": string,
  /** On Filename Conflict - What to do when a file with the same name already exists in the destination. */
  "conflictPolicy": "abort" | "skip" | "rename",
  /** Date Subfolder - If on, the import creates a dated subfolder in the destination and moves files there. */
  "dateSubfolder": boolean,
  /** Finder Tag - Optional Finder tag colour or name to apply to imported files (e.g. "Blue", "Receipt"). Leave empty to skip. */
  "finderTag": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `import` command */
  export type Import = ExtensionPreferences & {}
  /** Preferences accessible in the `pick-downloads` command */
  export type PickDownloads = ExtensionPreferences & {}
  /** Preferences accessible in the `open-latest-download` command */
  export type OpenLatestDownload = ExtensionPreferences & {}
  /** Preferences accessible in the `undo-import` command */
  export type UndoImport = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `import` command */
  export type Import = {}
  /** Arguments passed to the `pick-downloads` command */
  export type PickDownloads = {}
  /** Arguments passed to the `open-latest-download` command */
  export type OpenLatestDownload = {}
  /** Arguments passed to the `undo-import` command */
  export type UndoImport = {}
}

