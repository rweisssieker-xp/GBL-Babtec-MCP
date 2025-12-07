/**
 * Test Data Manager for Integration Tests
 * 
 * This utility helps manage test data in the Babtec test environment:
 * - Create test fixtures
 * - Clean up test data after tests
 * - Track created entities for cleanup
 */

import type { BabtecConnector } from '../../src/connectors/babtec-connector.js';
import logger from '../../src/utils/logger.js';

export interface TestEntity {
  type: 'testplan' | 'lot' | 'complaint' | 'action' | 'audit';
  id: string;
  createdAt: Date;
}

export class TestDataManager {
  private createdEntities: TestEntity[] = [];
  private connector: BabtecConnector;

  constructor(connector: BabtecConnector) {
    this.connector = connector;
  }

  async createTestPlan(data: {
    partNumber: string;
    name: string;
  }): Promise<string> {
    const client = this.connector.getClient();
    // Create test plan via API
    // This is a placeholder - actual implementation depends on Babtec API
    const result = await client.post<{ id: string }>('/api/testplans', {
      partNumber: data.partNumber,
      name: data.name,
      test: true, // Mark as test data
    });

    this.createdEntities.push({
      type: 'testplan',
      id: result.id,
      createdAt: new Date(),
    });

    logger.info('Test plan created', { id: result.id });
    return result.id;
  }

  async createTestLot(data: {
    partNumber: string;
    lotNumber: string;
  }): Promise<string> {
    const client = this.connector.getClient();
    const result = await client.post<{ id: string }>('/api/lots', {
      partNumber: data.partNumber,
      lotNumber: data.lotNumber,
      test: true,
    });

    this.createdEntities.push({
      type: 'lot',
      id: result.id,
      createdAt: new Date(),
    });

    logger.info('Test lot created', { id: result.id });
    return result.id;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up test data', { count: this.createdEntities.length });

    const client = this.connector.getClient();

    for (const entity of this.createdEntities) {
      try {
        switch (entity.type) {
          case 'testplan':
            await client.delete(`/api/testplans/${entity.id}`);
            break;
          case 'lot':
            await client.delete(`/api/lots/${entity.id}`);
            break;
          case 'complaint':
            await client.delete(`/api/claims/${entity.id}`);
            break;
          case 'action':
            await client.delete(`/api/actions/${entity.id}`);
            break;
          case 'audit':
            await client.delete(`/api/audits/${entity.id}`);
            break;
        }
        logger.debug('Test entity deleted', { type: entity.type, id: entity.id });
      } catch (error) {
        logger.warn('Failed to delete test entity', {
          type: entity.type,
          id: entity.id,
          error,
        });
      }
    }

    this.createdEntities = [];
    logger.info('Test data cleanup completed');
  }

  trackEntity(type: TestEntity['type'], id: string): void {
    this.createdEntities.push({
      type,
      id,
      createdAt: new Date(),
    });
  }
}

