/**
 * Downloads and unpacks the MetaMask browser extension so it can be loaded
 * into a Chromium persistent context via --load-extension.
 *
 * MetaMask ships signed release zips of the unpacked Chrome build on GitHub,
 * so this can be fetched programmatically. Pocket Universe is closed-source
 * and distributed only via the Chrome Web Store, so it cannot be fetched
 * this way - see extensions/pocket-universe/README.md for manual setup.
 */
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { env } from '../src/config/env';

const METAMASK_DIR = path.resolve(process.cwd(), 'extensions/metamask');
const DOWNLOAD_URL = (version: string) =>
  `https://github.com/MetaMask/metamask-extension/releases/download/v${version}/metamask-chrome-${version}.zip`;

async function download(url: string, destFile: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destFile, buffer);
}

async function main(): Promise<void> {
  const version = env.metamask.version;
  const manifestPath = path.join(METAMASK_DIR, 'manifest.json');

  if (fs.existsSync(manifestPath)) {
    console.log(`MetaMask already present at ${METAMASK_DIR}, skipping download.`);
    return;
  }

  fs.mkdirSync(METAMASK_DIR, { recursive: true });
  const zipPath = path.join(process.cwd(), `.metamask-${version}.zip`);

  console.log(`Downloading MetaMask v${version}...`);
  await download(DOWNLOAD_URL(version), zipPath);

  console.log('Unpacking...');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(METAMASK_DIR, true);
  fs.unlinkSync(zipPath);

  if (!fs.existsSync(manifestPath)) {
    throw new Error('Unpacked MetaMask but manifest.json was not found - unexpected zip layout.');
  }

  console.log(`MetaMask extension ready at ${METAMASK_DIR}`);
  console.log('');
  console.log('Pocket Universe cannot be auto-downloaded (closed-source, Chrome Web Store only).');
  console.log('See extensions/pocket-universe/README.md for manual setup instructions.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
