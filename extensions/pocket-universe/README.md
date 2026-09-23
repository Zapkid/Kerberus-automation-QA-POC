# Pocket Universe extension setup

Pocket Universe is closed-source and only distributed through the Chrome Web
Store, so it cannot be downloaded/unpacked automatically the way MetaMask is
(see `scripts/download-extensions.ts`). To make it available to the test
suite, obtain the unpacked extension directory once and drop it here:

## Option A - extract from an installed Chrome profile

1. Install Pocket Universe from the Chrome Web Store in a normal Chrome
   browser: https://chromewebstore.google.com/detail/pocket-universe
2. Open `chrome://extensions`, enable **Developer mode**.
3. Find "Pocket Universe" and copy its **ID**.
4. Locate the unpacked source Chrome keeps for it, typically:
   - Linux: `~/.config/google-chrome/Default/Extensions/<ID>/<version>/`
   - macOS: `~/Library/Application Support/Google/Chrome/Default/Extensions/<ID>/<version>/`
   - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\<ID>\<version>\`
5. Copy the **contents** of that `<version>` folder (it must contain
   `manifest.json` at the top level) into this directory
   (`extensions/pocket-universe/`).

## Option B - CRX extraction

1. Download the `.crx` file for the extension (e.g. via a CRX downloader
   pointed at the Chrome Web Store listing).
2. Unzip/extract it (a `.crx` is a zip with a small header) into this
   directory so that `extensions/pocket-universe/manifest.json` exists.

## Verifying

After setup, `extensions/pocket-universe/manifest.json` must exist. The test
fixtures (`src/fixtures/extensions.ts`) validate this at startup and fail
fast with a clear error if it's missing.

This directory is gitignored - every environment/CI runner that needs to run
tests must provision it independently (e.g. via a private artifact/secret
store), since the extension is not redistributable.
