import { z } from 'zod';
import type { ToolHandler } from '../server/mcp-server.js';
import { BabtecConnector } from '../connectors/babtec-connector.js';
import { validateInput, validateRequired } from '../middleware/validation.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuditLogger } from '../middleware/audit.js';
import { NotFoundError } from '../utils/errors.js';
import { retry, isRetryableError } from '../utils/retry.js';

const searchTestplanSchema = z.object({
  query: z.string().optional(),
  partNumber: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

const getTestplanSchema = z.object({
  testplanId: z.string(),
});

export function createInspectionPlanTools(
  connector: BabtecConnector,
  auditLogger: AuditLogger
): ToolHandler[] {
  return [
    {
      name: 'babtec_search_testplan',
      description: 'Search for inspection plans (Prüfpläne) in Babtec',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          partNumber: { type: 'string', description: 'Part number filter' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'draft'],
            description: 'Status filter',
          },
          limit: { type: 'number', description: 'Max results (1-100)', default: 20 },
          offset: { type: 'number', description: 'Pagination offset', default: 0 },
        },
      },
      handler: async (args, context) => {
        requirePermission('read:testplans')(context);
        const params = validateInput(searchTestplanSchema, args);

        const client = connector.getClient();
        const results = await retry(
          () =>
            client.get<{
              items: unknown[];
              total: number;
              limit: number;
              offset: number;
            }>('/api/testplans', {
              query: params.query,
              partNumber: params.partNumber,
              status: params.status,
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
          'babtec_search_testplan',
          context,
          'testplan',
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
      name: 'babtec_get_testplan',
      description: 'Get inspection plan details with all characteristics',
      inputSchema: {
        type: 'object',
        properties: {
          testplanId: { type: 'string', description: 'Inspection plan ID' },
        },
        required: ['testplanId'],
      },
      handler: async (args, context) => {
        requirePermission('read:testplans')(context);
        const params = validateInput(getTestplanSchema, args);
        const testplanId = validateRequired(params.testplanId, 'testplanId');

        const client = connector.getClient();
        const testplan = await retry(
          () => client.get<unknown>(`/api/testplans/${testplanId}`),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        if (!testplan) {
          throw new NotFoundError('Inspection plan', testplanId);
        }

        await auditLogger.logReadOperation(
          'babtec_get_testplan',
          context,
          'testplan',
          testplanId
        );

        return testplan;
      },
    },
  ];
}

