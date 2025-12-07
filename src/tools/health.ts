import type { ToolHandler } from '../server/mcp-server.js';
import { HealthChecker } from '../server/health-check.js';

export function createHealthTool(healthChecker: HealthChecker): ToolHandler {
  return {
    name: 'babtec_health_check',
    description: 'Get health status of MCP server and Babtec connections',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, _context) => {
      // Health check doesn't require permissions - it's a system tool
      const status = await healthChecker.getHealthStatus();
      return status;
    },
  };
}

