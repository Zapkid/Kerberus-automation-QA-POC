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

export interface ResolveExtensionsOptions {
  /**
   * Whether Pocket Universe should be loaded alongside MetaMask. Defaults to
   * true. Set to false to get a "bare MetaMask" context - used by baseline
   * tests that need to prove behavior *without* the extension present.
   */
  includePocketUniverse?: boolean;
}

/** Resolves the on-disk directories for every extension that must be loaded before a test starts. */
export function resolveExtensions(options: ResolveExtensionsOptions = {}): ExtensionDescriptor[] {
  const includePocketUniverse = options.includePocketUniverse ?? true;

  assertUnpackedExtension(
    METAMASK_DIR,
    'MetaMask',
    'Run "npm run prepare:extensions" to download and unpack it automatically.',
  );

  const extensions: ExtensionDescriptor[] = [{ name: 'metamask', dir: METAMASK_DIR }];

  if (includePocketUniverse) {
    assertUnpackedExtension(
      env.pocketUniverse.path,
      'Pocket Universe',
      'Pocket Universe cannot be auto-downloaded (closed-source, Chrome Web Store only). ' +
        'See extensions/pocket-universe/README.md for how to obtain the unpacked extension folder.',
    );
    extensions.push({ name: 'pocket-universe', dir: env.pocketUniverse.path });
  }

  return extensions;
}

/** Comma-separated extension paths, as consumed by Chromium's --load-extension flag. */
export function extensionLoadArgs(extensions: ExtensionDescriptor[]): string[] {
  const joined = extensions.map((e) => e.dir).join(',');
  return [`--disable-extensions-except=${joined}`, `--load-extension=${joined}`];
}
