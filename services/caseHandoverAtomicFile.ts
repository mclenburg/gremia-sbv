import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { OWNER_ONLY_FILE_MODE, restrictFileToOwner } from './secureFilePermissions.js';

/** Writes only the encrypted transport envelope into the target directory. */
export async function writeCaseHandoverFile(targetPath: string, serializedEnvelope: string,
  options: { replaceExisting?: boolean } = {}): Promise<void> {
  const directory = path.dirname(targetPath);
  await fs.promises.mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(targetPath)}.${randomUUID()}.tmp`);
  let file: fs.promises.FileHandle | undefined;
  try {
    file = await fs.promises.open(temporaryPath, 'wx', OWNER_ONLY_FILE_MODE);
    await file.writeFile(serializedEnvelope, 'utf8');
    await file.sync();
    await file.close();
    file = undefined;
    await restrictFileToOwner(temporaryPath);
    if (options.replaceExisting === false) {
      await fs.promises.link(temporaryPath, targetPath);
      await fs.promises.rm(temporaryPath).catch(() => undefined);
    } else {
      await fs.promises.rename(temporaryPath, targetPath);
    }
  } catch (error) {
    await file?.close().catch(() => undefined);
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
