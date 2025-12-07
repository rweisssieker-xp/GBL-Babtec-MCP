#!/usr/bin/env node

import { loadConfig } from './config/loader.js';
import { BabtecMCPServer } from './server/mcp-server.js';
import { BabtecConnector } from './connectors/babtec-connector.js';
import { AuditLogger } from './middleware/audit.js';
import { HealthChecker } from './server/health-check.js';
import { AuditQuery } from './middleware/audit-query.js';
import { RateLimiter } from './middleware/rate-limiter.js';
import { registerAllTools } from './tools/index.js';
import logger from './utils/logger.js';

async function main() {
  try {
    logger.info('Starting Babtec MCP Server...');
    
    const config = loadConfig();
    logger.info('Configuration loaded', { 
      serverName: config.server.name,
      endpoints: config.babtec.endpoints.length 
    });

    // Initialize connector
    const connector = new BabtecConnector(config);
    logger.info('Babtec connector initialized');

    // Initialize audit logger
    const auditLogger = new AuditLogger(
      config.audit.logPath,
      config.audit.enabled
    );
    logger.info('Audit logger initialized', {
      enabled: config.audit.enabled,
      logPath: config.audit.logPath,
    });

    // Initialize health checker
    const healthChecker = new HealthChecker(connector, auditLogger, config);
    logger.info('Health checker initialized');

    // Initialize audit query
    const auditQuery = new AuditQuery(config.audit.logPath);
    logger.info('Audit query initialized');

    // Initialize rate limiter (for future use in middleware)
    const rateLimiter = new RateLimiter(
      config.security.rateLimiting.maxRequests,
      config.security.rateLimiting.windowMs,
      config.security.rateLimiting.enabled
    );
    logger.info('Rate limiter initialized', {
      enabled: config.security.rateLimiting.enabled,
      maxRequests: config.security.rateLimiting.maxRequests,
    });
    // Rate limiter will be integrated into tool handlers in future enhancement
    void rateLimiter;

    // Create MCP server
    const server = new BabtecMCPServer(config);
    
    // Register all tools
    registerAllTools(server, connector, auditLogger, healthChecker, auditQuery);
    logger.info('All MCP tools registered');
    
    // Start server
    await server.start();
    
    logger.info('Babtec MCP Server started successfully');
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error', { error });
  process.exit(1);
});

