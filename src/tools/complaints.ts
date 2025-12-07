import { z } from 'zod';
import type { ToolHandler } from '../server/mcp-server.js';
import { BabtecConnector } from '../connectors/babtec-connector.js';
import { validateInput, validateRequired } from '../middleware/validation.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuditLogger } from '../middleware/audit.js';
import { NotFoundError } from '../utils/errors.js';
import { retry, isRetryableError } from '../utils/retry.js';
import logger from '../utils/logger.js';

const searchClaimSchema = z.object({
  claimNumber: z.string().optional(),
  supplier: z.string().optional(),
  status: z.enum(['open', 'in-progress', 'closed', 'escalated']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

const getClaimSchema = z.object({
  claimId: z.string(),
});

const updateClaimStepSchema = z.object({
  claimId: z.string(),
  step: z.enum(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']),
  data: z.record(z.unknown()),
});

const addClaimDocumentSchema = z.object({
  claimId: z.string(),
  documentName: z.string(),
  documentType: z.string(),
  documentContent: z.string(), // Base64 encoded
  mimeType: z.string().optional(),
});

export function createComplaintTools(
  connector: BabtecConnector,
  auditLogger: AuditLogger
): ToolHandler[] {
  return [
    {
      name: 'babtec_search_claim',
      description: 'Search for complaints/claims (Reklamationen) in Babtec',
      inputSchema: {
        type: 'object',
        properties: {
          claimNumber: { type: 'string', description: 'Claim number filter' },
          supplier: { type: 'string', description: 'Supplier filter' },
          status: {
            type: 'string',
            enum: ['open', 'in-progress', 'closed', 'escalated'],
            description: 'Status filter',
          },
          dateFrom: { type: 'string', description: 'Start date (ISO 8601)' },
          dateTo: { type: 'string', description: 'End date (ISO 8601)' },
          limit: { type: 'number', description: 'Max results (1-100)', default: 20 },
          offset: { type: 'number', description: 'Pagination offset', default: 0 },
        },
      },
      handler: async (args, context) => {
        requirePermission('read:complaints')(context);
        const params = validateInput(searchClaimSchema, args);

        const client = connector.getClient();
        const results = await retry(
          () =>
            client.get<{
              items: unknown[];
              total: number;
              limit: number;
              offset: number;
            }>('/api/claims', {
              claimNumber: params.claimNumber,
              supplier: params.supplier,
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
          'babtec_search_claim',
          context,
          'complaint',
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
      name: 'babtec_get_claim',
      description: 'Get complaint details with 8D status',
      inputSchema: {
        type: 'object',
        properties: {
          claimId: { type: 'string', description: 'Claim ID' },
        },
        required: ['claimId'],
      },
      handler: async (args, context) => {
        requirePermission('read:complaints')(context);
        const params = validateInput(getClaimSchema, args);
        const claimId = validateRequired(params.claimId, 'claimId');

        const client = connector.getClient();
        const claim = await retry(
          () => client.get<unknown>(`/api/claims/${claimId}`),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        if (!claim) {
          throw new NotFoundError('Complaint', claimId);
        }

        await auditLogger.logReadOperation('babtec_get_claim', context, 'complaint', claimId);

        return claim;
      },
    },
    {
      name: 'babtec_update_claim_step',
      description: 'Update 8D step for a complaint (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          claimId: { type: 'string', description: 'Claim ID' },
          step: {
            type: 'string',
            enum: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
            description: '8D step',
          },
          data: {
            type: 'object',
            description: 'Step data (structure depends on step)',
          },
        },
        required: ['claimId', 'step', 'data'],
      },
      handler: async (args, context) => {
        requirePermission('write:complaints')(context);
        const params = validateInput(updateClaimStepSchema, args);
        const claimId = validateRequired(params.claimId, 'claimId');
        const step = validateRequired(params.step, 'step');

        const client = connector.getClient();

        // Get current state for audit
        let before: unknown;
        try {
          before = await client.get(`/api/claims/${claimId}`);
        } catch (error) {
          logger.warn('Could not fetch before state for audit', { claimId, error });
        }

        const after = await retry(
          () =>
            client.put<unknown>(`/api/claims/${claimId}/steps/${step}`, params.data),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        await auditLogger.logWriteOperation(
          'babtec_update_claim_step',
          context,
          'complaint',
          claimId,
          before,
          after,
          'success'
        );

        return { success: true, claimId, step, data: after };
      },
    },
    {
      name: 'babtec_add_claim_document',
      description: 'Attach document to complaint (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          claimId: { type: 'string', description: 'Claim ID' },
          documentName: { type: 'string', description: 'Document name' },
          documentType: { type: 'string', description: 'Document type' },
          documentContent: {
            type: 'string',
            description: 'Document content (Base64 encoded)',
          },
          mimeType: { type: 'string', description: 'MIME type (optional)' },
        },
        required: ['claimId', 'documentName', 'documentType', 'documentContent'],
      },
      handler: async (args, context) => {
        requirePermission('write:complaints')(context);
        const params = validateInput(addClaimDocumentSchema, args);
        const claimId = validateRequired(params.claimId, 'claimId');

        const client = connector.getClient();

        const document = await retry(
          () =>
            client.post<unknown>(`/api/claims/${claimId}/documents`, {
              name: params.documentName,
              type: params.documentType,
              content: params.documentContent,
              mimeType: params.mimeType,
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
          'babtec_add_claim_document',
          context,
          'complaint',
          claimId,
          undefined,
          document,
          'success'
        );

        return { success: true, claimId, document };
      },
    },
  ];
}

