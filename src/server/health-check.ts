import type { BabtecConnector } from '../connectors/babtec-connector.js';
import type { AuditLogger } from '../middleware/audit.js';
import type { Config } from '../config/schema.js';
import logger from '../utils/logger.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  server: {
    uptime: number;
    version: string;
  };
  babtec: {
    endpoints: Array<{
      name: string;
      status: 'connected' | 'degraded' | 'disconnected';
      circuitBreaker: 'closed' | 'open' | 'half-open';
      version?: string;
    }>;
  };
  audit: {
    enabled: boolean;
    logPath: string;
    status: 'operational' | 'error';
  };
  tools: {
    registered: number;
    status: 'operational';
  };
}

export class HealthChecker {
  private connector: BabtecConnector;
  private config: Config;
  private startTime: number;

  constructor(
    connector: BabtecConnector,
    _auditLogger: AuditLogger,
    config: Config
  ) {
    this.connector = connector;
    this.config = config;
    this.startTime = Date.now();
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const endpointStatuses = await this.checkEndpoints();
    const auditStatus = this.checkAuditLogging();

    // Determine overall status
    const hasUnhealthy = endpointStatuses.some(
      (ep) => ep.status === 'disconnected'
    );
    const hasDegraded = endpointStatuses.some(
      (ep) => ep.status === 'degraded'
    );

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded || auditStatus.status === 'error') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      server: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: '1.0.0',
      },
      babtec: {
        endpoints: endpointStatuses,
      },
      audit: auditStatus,
      tools: {
        registered: 16, // All 16 tools
        status: 'operational',
      },
    };
  }

  private async checkEndpoints(): Promise<
    Array<{
      name: string;
      status: 'connected' | 'degraded' | 'disconnected';
      circuitBreaker: 'closed' | 'open' | 'half-open';
      version?: string;
    }>
  > {
    const statuses = [];

    for (const endpoint of this.config.babtec.endpoints) {
      try {
        const client = this.connector.getClient(endpoint.name);
        const circuitState = client.getCircuitState();
        const version = client.getDetectedVersion();

        let status: 'connected' | 'degraded' | 'disconnected' = 'connected';
        if (circuitState === 'open') {
          status = 'disconnected';
        } else if (circuitState === 'half-open') {
          status = 'degraded';
        }

        statuses.push({
          name: endpoint.name,
          status,
          circuitBreaker: circuitState,
          version,
        });
      } catch (error) {
        logger.warn('Health check failed for endpoint', {
          endpoint: endpoint.name,
          error,
        });
        statuses.push({
          name: endpoint.name,
          status: 'disconnected' as const,
          circuitBreaker: 'open' as const,
        });
      }
    }

    return statuses;
  }

  private checkAuditLogging(): {
    enabled: boolean;
    logPath: string;
    status: 'operational' | 'error';
  } {
    return {
      enabled: this.config.audit.enabled,
      logPath: this.config.audit.logPath,
      status: 'operational', // Could check if log directory is writable
    };
  }
}

