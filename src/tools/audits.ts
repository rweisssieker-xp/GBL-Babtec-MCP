import { z } from 'zod';
import type { ToolHandler } from '../server/mcp-server.js';
import { BabtecConnector } from '../connectors/babtec-connector.js';
import { validateInput, validateRequired } from '../middleware/validation.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuditLogger } from '../middleware/audit.js';
import { NotFoundError } from '../utils/errors.js';
import { retry, isRetryableError } from '../utils/retry.js';
import logger from '../utils/logger.js';

const createAuditFindingSchema = z.object({
  auditId: z.string(),
  finding: z.string(),
  severity: z.enum(['minor', 'major', 'critical']),
  description: z.string().optional(),
  evidence: z.string().optional(),
});

const updateAuditFindingSchema = z.object({
  findingId: z.string(),
  finding: z.string().optional(),
  severity: z.enum(['minor', 'major', 'critical']).optional(),
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']).optional(),
  description: z.string().optional(),
  evidence: z.string().optional(),
});

const getAuditStatusSchema = z.object({
  auditId: z.string(),
});

export function createAuditTools(
  connector: BabtecConnector,
  auditLogger: AuditLogger
): ToolHandler[] {
  return [
    {
      name: 'babtec_create_audit_finding',
      description: 'Create audit finding (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          auditId: { type: 'string', description: 'Audit ID' },
          finding: { type: 'string', description: 'Finding description' },
          severity: {
            type: 'string',
            enum: ['minor', 'major', 'critical'],
            description: 'Severity level',
          },
          description: { type: 'string', description: 'Detailed description' },
          evidence: { type: 'string', description: 'Evidence or reference' },
        },
        required: ['auditId', 'finding', 'severity'],
      },
      handler: async (args, context) => {
        requirePermission('write:audits')(context);
        const params = validateInput(createAuditFindingSchema, args);
        const auditId = validateRequired(params.auditId, 'auditId');
        const finding = validateRequired(params.finding, 'finding');
        const severity = validateRequired(params.severity, 'severity');

        const client = connector.getClient();

        const auditFinding = await retry(
          () =>
            client.post<{ id: string; [key: string]: unknown }>(
              `/api/audits/${auditId}/findings`,
              {
                finding,
                severity,
                description: params.description,
                evidence: params.evidence,
              }
            ),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        await auditLogger.logWriteOperation(
          'babtec_create_audit_finding',
          context,
          'audit',
          auditId,
          undefined,
          auditFinding,
          'success'
        );

        return { success: true, findingId: auditFinding.id, finding: auditFinding };
      },
    },
    {
      name: 'babtec_update_audit_finding',
      description: 'Update audit finding (Write operation)',
      inputSchema: {
        type: 'object',
        properties: {
          findingId: { type: 'string', description: 'Finding ID' },
          finding: { type: 'string', description: 'Finding description' },
          severity: {
            type: 'string',
            enum: ['minor', 'major', 'critical'],
            description: 'Severity level',
          },
          status: {
            type: 'string',
            enum: ['open', 'in-progress', 'resolved', 'closed'],
            description: 'Status',
          },
          description: { type: 'string', description: 'Detailed description' },
          evidence: { type: 'string', description: 'Evidence or reference' },
        },
        required: ['findingId'],
      },
      handler: async (args, context) => {
        requirePermission('write:audits')(context);
        const params = validateInput(updateAuditFindingSchema, args);
        const findingId = validateRequired(params.findingId, 'findingId');

        const client = connector.getClient();

        // Get current state for audit
        let before: unknown;
        try {
          before = await client.get(`/api/audits/findings/${findingId}`);
        } catch (error) {
          logger.warn('Could not fetch before state for audit', { findingId, error });
        }

        const updateData: Record<string, unknown> = {};
        if (params.finding !== undefined) updateData.finding = params.finding;
        if (params.severity !== undefined) updateData.severity = params.severity;
        if (params.status !== undefined) updateData.status = params.status;
        if (params.description !== undefined) updateData.description = params.description;
        if (params.evidence !== undefined) updateData.evidence = params.evidence;

        const after = await retry(
          () => client.put<unknown>(`/api/audits/findings/${findingId}`, updateData),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        await auditLogger.logWriteOperation(
          'babtec_update_audit_finding',
          context,
          'audit',
          findingId,
          before,
          after,
          'success'
        );

        return { success: true, findingId, finding: after };
      },
    },
    {
      name: 'babtec_get_audit_status',
      description: 'Get audit status and findings',
      inputSchema: {
        type: 'object',
        properties: {
          auditId: { type: 'string', description: 'Audit ID' },
        },
        required: ['auditId'],
      },
      handler: async (args, context) => {
        requirePermission('read:audits')(context);
        const params = validateInput(getAuditStatusSchema, args);
        const auditId = validateRequired(params.auditId, 'auditId');

        const client = connector.getClient();
        const audit = await retry(
          () => client.get<unknown>(`/api/audits/${auditId}/status`),
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: isRetryableError,
          }
        );

        if (!audit) {
          throw new NotFoundError('Audit', auditId);
        }

        await auditLogger.logReadOperation(
          'babtec_get_audit_status',
          context,
          'audit',
          auditId
        );

        return audit;
      },
    },
  ];
}

