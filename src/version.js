// App version — sourced from package.json at build time via Vite's `define`.
// Bump package.json "version" (semantic: MAJOR.MINOR.PATCH) and record the
// change in CHANGELOG.md when tagging a release.
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
