import { z } from 'zod';
import type { ToolHandler } from '../server/mcp-server.js';
import { BabtecConnector } from '../connectors/babtec-connector.js';
import { validateInput, validateRequired } from '../middleware/validation.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuditLogger } from '../middleware/audit.js';
import { NotFoundError } from '../utils/errors.js';
import { retry, isRetryableError } from '../utils/retry.js';
import logger from '../utils/logger.js';

const searchLotSchema = z.object({
  lotNumber: z.string().optional(),
  partNumber: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'rejected']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

const getLotResultsSchema = z.object({
  lotId: z.string(),
});

const setLotStatusSchema = z.object({
  lotId: z.string(),
  status: z.enum(['pending', 'in-progress', 'completed', 'rejected']),
  comment: z.string().optional(),
});

export function createInspectionLotTools(
  connector: BabtecConnector,
  auditLogger: AuditLogger
): ToolHandler[] {
  return [
    {
      name: 'babtec_search_lot',
      description: 'Search for inspection lots (Prüflose) in Babtec',
      inputSchema: {
        type: 'object',
        properties: {
          lotNumber: { type: 'string', description: 'Lot number filter' },
          partNumber: { type: 'string', description: 'Part number filter' },
          status: {
            type: 'string',
            enum: ['pending', 'in-progress', 'completed', 'rejected'],
            description: 'Status filter',
          },
          dateFrom: { type: 'string', description: 'Start date (ISO 8601)' },
          dateTo: { type: 'string', description: 'End date (ISO 8601)' },
          limit: { type: 'number', description: 'Max results (1-100)', default: 20 },
          offset: { type: 'number', description: 'Pagination offset', default: 0 },
        },
      },
      handler: async (args, context) => {
        requirePermission('read:lots')(context);
        const params = validateInput(searchLotSchema, args);

        const client = connector.getClient();
        const results = await retry(
          () =>
            client.get<{
              items: unknown[];
              total: number;
              limit: number;
              offset: number;
            }>('/api/lots', {
              lotNumber: params.lotNumber,
              partNumber: params.partNumber,
              status: params.status,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo,
              limit: params.limit,
              offset: params.offset,
            }),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        await auditLogger.logReadOperation(
          'babtec_search_lot',
          context,
          'lot',
          undefined,
          { count: results.items.length, total: results.total }
        );

        return {
          items: results.items,
          total: results.total,
          limit: results.limit,
          offset: results.offset,
        };
      },
    },
    {
      name: 'babtec_get_lot_results',
      description: 'Get inspection results for a lot with all measurements',
      inputSchema: {
        type: 'object',
        properties: {
          lotId: { type: 'string', description: 'Lot ID' },
        },
        required: ['lotId'],
      },
      handler: async (args, context) => {
        requirePermission('read:lots')(context);
        const params = validateInput(getLotResultsSchema, args);
        const lotId = validateRequired(params.lotId, 'lotId');

        const client = connector.getClient();
        const results = await retry(
          () => client.get<unknown>(`/api/lots/${lotId}/results`),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        if (!results) {
          throw new NotFoundError('Lot', lotId);
        }

        await auditLogger.logReadOperation('babtec_get_lot_results', context, 'lot', lotId);

        return results;
      },
    },
    {
      name: 'babtec_set_lot_status',
      description: 'Set inspection status for a lot (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          lotId: { type: 'string', description: 'Lot ID' },
          status: {
            type: 'string',
            enum: ['pending', 'in-progress', 'completed', 'rejected'],
            description: 'New status',
          },
          comment: { type: 'string', description: 'Optional comment' },
        },
        required: ['lotId', 'status'],
      },
      handler: async (args, context) => {
        requirePermission('write:lots')(context);
        const params = validateInput(setLotStatusSchema, args);
        const lotId = validateRequired(params.lotId, 'lotId');
        const status = validateRequired(params.status, 'status');

        const client = connector.getClient();

        // Get current state for audit
        let before: unknown;
        try {
          before = await client.get(`/api/lots/${lotId}`);
        } catch (error) {
          logger.warn('Could not fetch before state for audit', { lotId, error });
        }

        const after = await retry(
          () =>
            client.put<unknown>(`/api/lots/${lotId}/status`, {
              status,
              comment: params.comment,
            }),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        await auditLogger.logWriteOperation(
          'babtec_set_lot_status',
          context,
          'lot',
          lotId,
          before,
          after,
          'success'
        );

        return { success: true, lotId, status: after };
      },
    },
  ];
}

