import type { Config } from '../config/schema.js';
import { BabtecClient } from './babtec-client.js';
import logger from '../utils/logger.js';

export class BabtecConnector {
  private clients: Map<string, BabtecClient> = new Map();
  private config: Config;
  private defaultClient?: BabtecClient;

  constructor(config: Config) {
    this.config = config;

    // Initialize clients for all endpoints
    for (const endpoint of config.babtec.endpoints) {
      try {
        const client = new BabtecClient(config, endpoint.name);
        this.clients.set(endpoint.name, client);

        if (endpoint.name === config.babtec.defaultEndpoint) {
          this.defaultClient = client;
        }

        // Detect version on initialization
        client.detectVersion().catch((error) => {
          logger.warn('Version detection failed during initialization', {
            endpoint: endpoint.name,
            error,
          });
        });
      } catch (error) {
        logger.error('Failed to initialize client', {
          endpoint: endpoint.name,
          error,
        });
      }
    }

    if (!this.defaultClient) {
      throw new Error('Default endpoint client not initialized');
    }
  }

  getClient(endpointName?: string): BabtecClient {
    if (endpointName) {
      const client = this.clients.get(endpointName);
      if (!client) {
        logger.warn('Requested endpoint not found, using default', {
          requested: endpointName,
          default: this.config.babtec.defaultEndpoint,
        });
        return this.defaultClient!;
      }
      return client;
    }

    return this.defaultClient!;
  }

  async negotiateVersion(endpointName?: string): Promise<string> {
    const client = this.getClient(endpointName);
    const supportedVersions =
      this.config.babtec.versionNegotiation.supportedVersions;

    if (this.config.babtec.versionNegotiation.enabled) {
      return client.negotiateVersion(supportedVersions);
    }

    return client.detectVersion();
  }

  async fallbackToSecondary(endpointName: string): Promise<BabtecClient> {
    // If primary endpoint fails, try secondary
    const primary = this.clients.get(endpointName);
    if (primary && primary.getCircuitState() === 'open') {
      // Find alternative endpoint
      for (const [name, client] of this.clients.entries()) {
        if (name !== endpointName && client.getCircuitState() !== 'open') {
          logger.info('Falling back to secondary endpoint', {
            from: endpointName,
            to: name,
          });
          return client;
        }
      }
    }

    return primary || this.defaultClient!;
  }
}

