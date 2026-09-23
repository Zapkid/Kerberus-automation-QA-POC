import * as fs from 'fs';
import * as path from 'path';
import { env } from '@config/env';

export interface ExtensionDescriptor {
  name: string;
  /** Absolute path to the unpacked extension directory (contains manifest.json). */
  dir: string;
}

const METAMASK_DIR = path.resolve(process.cwd(), 'extensions/metamask');

function assertUnpackedExtension(dir: string, humanName: string, howTo: string): void {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `${humanName} extension not found at "${dir}" (missing manifest.json).\n${howTo}`,
    );
  }
}

/** Resolves the on-disk directories for every extension that must be loaded before a test starts. */
export function resolveExtensions(): ExtensionDescriptor[] {
  assertUnpackedExtension(
    METAMASK_DIR,
    'MetaMask',
    'Run "npm run prepare:extensions" to download and unpack it automatically.',
  );
  assertUnpackedExtension(
    env.pocketUniverse.path,
    'Pocket Universe',
    'Pocket Universe cannot be auto-downloaded (closed-source, Chrome Web Store only). ' +
      'See extensions/pocket-universe/README.md for how to obtain the unpacked extension folder.',
  );

  return [
    { name: 'metamask', dir: METAMASK_DIR },
    { name: 'pocket-universe', dir: env.pocketUniverse.path },
  ];
}

/** Comma-separated extension paths, as consumed by Chromium's --load-extension flag. */
export function extensionLoadArgs(extensions: ExtensionDescriptor[]): string[] {
  const joined = extensions.map((e) => e.dir).join(',');
  return [`--disable-extensions-except=${joined}`, `--load-extension=${joined}`];
}
