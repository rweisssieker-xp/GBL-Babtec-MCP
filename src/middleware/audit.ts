import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { ToolContext } from '../server/mcp-server.js';
import logger from '../utils/logger.js';

export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  userRoles?: string[];
  tool: string;
  operation: 'read' | 'write';
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  result: 'success' | 'failure';
  error?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private logPath: string;
  private enabled: boolean;

  constructor(logPath: string, enabled: boolean = true) {
    this.logPath = logPath;
    this.enabled = enabled;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Ensure log directory exists
      await mkdir(this.logPath, { recursive: true });

      // Create log file name with date
      const date = new Date().toISOString().split('T')[0];
      const logFile = join(this.logPath, `audit-${date}.jsonl`);

      // Append log entry as JSONL
      const logLine = JSON.stringify(entry) + '\n';
      await writeFile(logFile, logLine, { flag: 'a' });

      logger.debug('Audit log entry written', { tool: entry.tool, operation: entry.operation });
    } catch (error) {
      logger.error('Failed to write audit log', { error, entry });
      // Don't throw - audit logging failure shouldn't break operations
      // but we should alert administrators
    }
  }

  async logWriteOperation(
    tool: string,
    context: ToolContext,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
    result: 'success' | 'failure' = 'success',
    error?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userRoles: context.userRoles,
      tool,
      operation: 'write',
      entityType,
      entityId,
      before,
      after,
      result,
      error,
    });
  }

  async logReadOperation(
    tool: string,
    context: ToolContext,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Only log read operations if configured (GDPR compliance)
    // For now, we log all read operations for audit trail
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userRoles: context.userRoles,
      tool,
      operation: 'read',
      entityType,
      entityId,
      result: 'success',
      metadata,
    });
  }
}

