import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import { recoverLegacyBackup } from './appearance-recovery-browser.mjs';
export { recoverLegacyBackup } from './appearance-recovery-browser.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [, , input, output] = process.argv;
    if (!input || !output || resolve(input) === resolve(output))
      throw new Error(
        'Usage: node scripts/appearance-recovery.mjs canonical-backup.json recovered-v2.json',
      );
    const result = recoverLegacyBackup(JSON.parse(await readFile(input, 'utf8')));
    // Refuse to overwrite either the original backup or an existing destination.
    await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(`Wrote a separate legacy v2 backup: ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
