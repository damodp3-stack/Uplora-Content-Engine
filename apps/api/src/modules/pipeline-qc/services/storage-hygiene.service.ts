import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageHygieneOptions {
  jobId?: string;
  dryRun?: boolean;
  maxAgeMs?: number; // default 3600000 (1 hour)
  protectedStorageKeys?: string[]; // Keys of AVAILABLE database assets
}

export interface StorageHygieneResult {
  filesExamined: number;
  filesRemoved: number;
  bytesFreed: number;
  dryRun: boolean;
  purgedFiles: string[];
}

@Injectable()
export class StorageHygieneService {
  private readonly logger = new Logger(StorageHygieneService.name);

  public cleanupTransientScratchFiles(options?: StorageHygieneOptions): StorageHygieneResult {
    const scratchDirs = [
      path.join(process.cwd(), 'scratch'),
      path.join(process.cwd(), 'apps', 'api', 'scratch'),
    ];

    const dryRun = options?.dryRun ?? false;
    const maxAgeMs = options?.maxAgeMs ?? 3600000;
    const protectedKeys = new Set(options?.protectedStorageKeys || []);

    let filesExamined = 0;
    let filesRemoved = 0;
    let bytesFreed = 0;
    const purgedFiles: string[] = [];

    for (const dir of scratchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (!stat.isFile()) continue;
          filesExamined++;

          // Safety check: Never delete AVAILABLE / database-protected asset paths
          if (protectedKeys.has(file) || protectedKeys.has(filePath)) {
            continue;
          }

          const isJobFile = options?.jobId && file.includes(options.jobId);
          const isTempFile = file.startsWith('temp_') || file.startsWith('healed_') || file.startsWith('test_frame_');
          const isOld = Date.now() - stat.mtimeMs > maxAgeMs;

          if (isJobFile || (isTempFile && isOld)) {
            bytesFreed += stat.size;
            purgedFiles.push(filePath);
            filesRemoved++;

            if (!dryRun) {
              fs.unlinkSync(filePath);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Storage hygiene cleanup warning for directory ${dir}: ${err.message}`);
      }
    }

    this.logger.log(
      `Storage Hygiene Scan [DryRun=${dryRun}]: Examined ${filesExamined} files, Identified ${filesRemoved} files to purge (${bytesFreed} bytes)`,
    );

    return {
      filesExamined,
      filesRemoved,
      bytesFreed,
      dryRun,
      purgedFiles,
    };
  }
}
