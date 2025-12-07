import { describe, it, expect, beforeAll } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { BabtecConnector } from '../../src/connectors/babtec-connector.js';

describe('Babtec Connector Integration', () => {
  let connector: BabtecConnector;

  beforeAll(() => {
    const config = loadConfig();
    connector = new BabtecConnector(config);
  });

  it('should initialize connector', () => {
    expect(connector).toBeDefined();
  });

  it('should get default client', () => {
    const client = connector.getClient();
    expect(client).toBeDefined();
  });

  it('should detect API version', async () => {
    const client = connector.getClient();
    const version = await client.detectVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  }, 30000);

  it('should negotiate version', async () => {
    const version = await connector.negotiateVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  }, 30000);
});

