import { z } from 'zod';
import type { ToolHandler } from '../server/mcp-server.js';
import { AuditQuery } from '../middleware/audit-query.js';
import { validateInput } from '../middleware/validation.js';
import { requirePermission } from '../middleware/rbac.js';

const auditQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  tool: z.string().optional(),
  operation: z.enum(['read', 'write']).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export function createAuditQueryTool(
  auditQuery: AuditQuery
): ToolHandler {
  return {
    name: 'babtec_query_audit_logs',
    description: 'Query audit logs with filters (requires admin permissions)',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO 8601)' },
        endDate: { type: 'string', description: 'End date (ISO 8601)' },
        userId: { type: 'string', description: 'Filter by user ID' },
        tool: { type: 'string', description: 'Filter by tool name' },
        operation: {
          type: 'string',
          enum: ['read', 'write'],
          description: 'Filter by operation type',
        },
        entityType: { type: 'string', description: 'Filter by entity type' },
        entityId: { type: 'string', description: 'Filter by entity ID' },
        limit: {
          type: 'number',
          description: 'Max results (1-1000)',
          default: 100,
        },
        offset: { type: 'number', description: 'Pagination offset', default: 0 },
      },
    },
    handler: async (args, context) => {
      // Audit query requires admin permissions
      requirePermission('read:audit')(context);
      const params = validateInput(auditQuerySchema, args);

      const result = await auditQuery.query({
        startDate: params.startDate,
        endDate: params.endDate,
        userId: params.userId,
        tool: params.tool,
        operation: params.operation,
        entityType: params.entityType,
        entityId: params.entityId,
        limit: params.limit,
        offset: params.offset,
      });

      return result;
    },
  };
}

