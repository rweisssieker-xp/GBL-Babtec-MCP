import type { ToolHandler } from '../server/mcp-server.js';
import { BabtecConnector } from '../connectors/babtec-connector.js';
import { AuditLogger } from '../middleware/audit.js';
import { HealthChecker } from '../server/health-check.js';
import { AuditQuery } from '../middleware/audit-query.js';
import { createInspectionPlanTools } from './inspection-plans.js';
import { createInspectionLotTools } from './inspection-lots.js';
import { createComplaintTools } from './complaints.js';
import { createActionTools } from './actions.js';
import { createAuditTools } from './audits.js';
import { createHealthTool } from './health.js';
import { createAuditQueryTool } from './audit-query.js';

export function registerAllTools(
  server: { registerTool: (tool: ToolHandler) => void },
  connector: BabtecConnector,
  auditLogger: AuditLogger,
  healthChecker: HealthChecker,
  auditQuery: AuditQuery
): void {
  const allTools: ToolHandler[] = [
    ...createInspectionPlanTools(connector, auditLogger),
    ...createInspectionLotTools(connector, auditLogger),
    ...createComplaintTools(connector, auditLogger),
    ...createActionTools(connector, auditLogger),
    ...createAuditTools(connector, auditLogger),
    createHealthTool(healthChecker),
    createAuditQueryTool(auditQuery),
  ];

  for (const tool of allTools) {
    server.registerTool(tool);
  }
}

