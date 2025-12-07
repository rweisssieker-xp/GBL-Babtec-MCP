import { z } from 'zod';
import type { ToolHandler } from '../server/mcp-server.js';
import { BabtecConnector } from '../connectors/babtec-connector.js';
import { validateInput, validateRequired } from '../middleware/validation.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuditLogger } from '../middleware/audit.js';
import { retry, isRetryableError } from '../utils/retry.js';
import logger from '../utils/logger.js';

const createActionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

const updateActionSchema = z.object({
  actionId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'in-progress', 'completed', 'cancelled']).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
});

const closeActionSchema = z.object({
  actionId: z.string(),
  resolution: z.string().optional(),
});

const getActionListSchema = z.object({
  status: z.enum(['open', 'in-progress', 'completed', 'cancelled']).optional(),
  assignee: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export function createActionTools(
  connector: BabtecConnector,
  auditLogger: AuditLogger
): ToolHandler[] {
  return [
    {
      name: 'babtec_create_action',
      description: 'Create new quality action (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Action title' },
          description: { type: 'string', description: 'Action description' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority level',
          },
          assignee: { type: 'string', description: 'Assignee user ID' },
          dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
          relatedEntityType: {
            type: 'string',
            description: 'Related entity type (e.g., complaint, lot)',
          },
          relatedEntityId: { type: 'string', description: 'Related entity ID' },
        },
        required: ['title'],
      },
      handler: async (args, context) => {
        requirePermission('write:actions')(context);
        const params = validateInput(createActionSchema, args);
        const title = validateRequired(params.title, 'title');

        const client = connector.getClient();

        const action = await retry(
          () =>
            client.post<{ id: string; [key: string]: unknown }>('/api/actions', {
              title,
              description: params.description,
              priority: params.priority || 'medium',
              assignee: params.assignee,
              dueDate: params.dueDate,
              relatedEntityType: params.relatedEntityType,
              relatedEntityId: params.relatedEntityId,
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
          'babtec_create_action',
          context,
          'action',
          action.id,
          undefined,
          action,
          'success'
        );

        return { success: true, actionId: action.id, action };
      },
    },
    {
      name: 'babtec_update_action',
      description: 'Update existing action (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          actionId: { type: 'string', description: 'Action ID' },
          title: { type: 'string', description: 'Action title' },
          description: { type: 'string', description: 'Action description' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority level',
          },
          status: {
            type: 'string',
            enum: ['open', 'in-progress', 'completed', 'cancelled'],
            description: 'Status',
          },
          assignee: { type: 'string', description: 'Assignee user ID' },
          dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
        },
        required: ['actionId'],
      },
      handler: async (args, context) => {
        requirePermission('write:actions')(context);
        const params = validateInput(updateActionSchema, args);
        const actionId = validateRequired(params.actionId, 'actionId');

        const client = connector.getClient();

        // Get current state for audit
        let before: unknown;
        try {
          before = await client.get(`/api/actions/${actionId}`);
        } catch (error) {
          logger.warn('Could not fetch before state for audit', { actionId, error });
        }

        const updateData: Record<string, unknown> = {};
        if (params.title !== undefined) updateData.title = params.title;
        if (params.description !== undefined) updateData.description = params.description;
        if (params.priority !== undefined) updateData.priority = params.priority;
        if (params.status !== undefined) updateData.status = params.status;
        if (params.assignee !== undefined) updateData.assignee = params.assignee;
        if (params.dueDate !== undefined) updateData.dueDate = params.dueDate;

        const after = await retry(
          () => client.put<unknown>(`/api/actions/${actionId}`, updateData),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        await auditLogger.logWriteOperation(
          'babtec_update_action',
          context,
          'action',
          actionId,
          before,
          after,
          'success'
        );

        return { success: true, actionId, action: after };
      },
    },
    {
      name: 'babtec_close_action',
      description: 'Close action (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          actionId: { type: 'string', description: 'Action ID' },
          resolution: { type: 'string', description: 'Resolution notes' },
        },
        required: ['actionId'],
      },
      handler: async (args, context) => {
        requirePermission('write:actions')(context);
        const params = validateInput(closeActionSchema, args);
        const actionId = validateRequired(params.actionId, 'actionId');

        const client = connector.getClient();

        // Get current state for audit
        let before: unknown;
        try {
          before = await client.get(`/api/actions/${actionId}`);
        } catch (error) {
          logger.warn('Could not fetch before state for audit', { actionId, error });
        }

        const after = await retry(
          () =>
            client.put<unknown>(`/api/actions/${actionId}/close`, {
              resolution: params.resolution,
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
          'babtec_close_action',
          context,
          'action',
          actionId,
          before,
          after,
          'success'
        );

        return { success: true, actionId, action: after };
      },
    },
    {
      name: 'babtec_get_action_list',
      description: 'List actions with filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'in-progress', 'completed', 'cancelled'],
            description: 'Status filter',
          },
          assignee: { type: 'string', description: 'Assignee filter' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority filter',
          },
          limit: { type: 'number', description: 'Max results (1-100)', default: 20 },
          offset: { type: 'number', description: 'Pagination offset', default: 0 },
        },
      },
      handler: async (args, context) => {
        requirePermission('read:actions')(context);
        const params = validateInput(getActionListSchema, args);

        const client = connector.getClient();
        const results = await retry(
          () =>
            client.get<{
              items: unknown[];
              total: number;
              limit: number;
              offset: number;
            }>('/api/actions', {
              status: params.status,
              assignee: params.assignee,
              priority: params.priority,
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
          'babtec_get_action_list',
          context,
          'action',
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
  ];
}

