import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageHygieneService {
  private readonly logger = new Logger(StorageHygieneService.name);

  public cleanupTransientScratchFiles(jobId?: string): { filesRemoved: number; bytesFreed: number } {
    const scratchDirs = [
      path.join(process.cwd(), 'scratch'),
      path.join(process.cwd(), 'apps', 'api', 'scratch'),
    ];

    let filesRemoved = 0;
    let bytesFreed = 0;

    for (const dir of scratchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (!stat.isFile()) continue;

          // Delete files matching jobId or temporary files older than 1 hour
          const isJobFile = jobId && file.includes(jobId);
          const isTempFile = file.startsWith('temp_') || file.startsWith('healed_') || file.startsWith('master_');
          const isOld = Date.now() - stat.mtimeMs > 3600000; // 1 hour

          if (isJobFile || (isTempFile && isOld)) {
            bytesFreed += stat.size;
            fs.unlinkSync(filePath);
            filesRemoved++;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Storage hygiene cleanup warning for directory ${dir}: ${err.message}`);
      }
    }

    if (filesRemoved > 0) {
      this.logger.log(`Storage Hygiene Cleanup: Removed ${filesRemoved} transient scratch files (${bytesFreed} bytes freed)`);
    }

    return { filesRemoved, bytesFreed };
  }
}
