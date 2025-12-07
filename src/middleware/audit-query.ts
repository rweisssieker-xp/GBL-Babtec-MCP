import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type { AuditLogEntry } from './audit.js';
import logger from '../utils/logger.js';

export interface AuditQueryOptions {
  startDate?: string;
  endDate?: string;
  userId?: string;
  tool?: string;
  operation?: 'read' | 'write';
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export class AuditQuery {
  constructor(private logPath: string) {}

  async query(options: AuditQueryOptions = {}): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    const {
      startDate,
      endDate,
      userId,
      tool,
      operation,
      entityType,
      entityId,
      limit = 100,
      offset = 0,
    } = options;

    const entries: AuditLogEntry[] = [];
    let total = 0;

    try {
      // Get all audit log files
      const files = await readdir(this.logPath);
      const logFiles = files.filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'));

      // Parse date range
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      // Read and filter entries
      for (const file of logFiles) {
        const filePath = join(this.logPath, file);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry: AuditLogEntry = JSON.parse(line);

            // Apply filters
            if (start && new Date(entry.timestamp) < start) continue;
            if (end && new Date(entry.timestamp) > end) continue;
            if (userId && entry.userId !== userId) continue;
            if (tool && entry.tool !== tool) continue;
            if (operation && entry.operation !== operation) continue;
            if (entityType && entry.entityType !== entityType) continue;
            if (entityId && entry.entityId !== entityId) continue;

            total++;
            if (entries.length < limit && total > offset) {
              entries.push(entry);
            }
          } catch (error) {
            logger.warn('Failed to parse audit log entry', { file, error });
          }
        }
      }

      // Sort by timestamp descending
      entries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return { entries, total };
    } catch (error) {
      logger.error('Audit query failed', { error });
      throw new Error(`Failed to query audit logs: ${error}`);
    }
  }
}

