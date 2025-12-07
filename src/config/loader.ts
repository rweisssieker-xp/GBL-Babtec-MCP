import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { configSchema, type Config } from './schema.js';
import logger from '../utils/logger.js';

dotenv.config();

const CONFIG_PATHS = [
  join(process.cwd(), 'config.yaml'),
  join(process.cwd(), 'config.yml'),
  join(process.cwd(), 'config', 'config.yaml'),
  join(homedir(), '.babtec-mcp', 'config.yaml'),
  join(homedir(), '.babtec-mcp', 'config.yml'),
];

export function loadConfig(): Config {
  let configData: unknown = {};

  // Try to load from file
  for (const configPath of CONFIG_PATHS) {
    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      configData = yaml.load(fileContent);
      logger.info(`Loaded config from ${configPath}`);
      break;
    } catch (error) {
      // File doesn't exist, continue
    }
  }

  // Override with environment variables
  const envOverrides: Record<string, unknown> = {};

  if (process.env.BABTEC_ENDPOINT_URL) {
    envOverrides.babtec = {
      endpoints: [
        {
          name: 'default',
          type: process.env.BABTEC_ENDPOINT_TYPE || 'babtecq-rest',
          baseUrl: process.env.BABTEC_ENDPOINT_URL,
          apiVersion: process.env.BABTEC_API_VERSION,
        },
      ],
      defaultEndpoint: 'default',
      credentials: {
        type: (process.env.BABTEC_AUTH_TYPE as 'basic' | 'bearer' | 'api-key') || 'basic',
        username: process.env.BABTEC_USERNAME,
        password: process.env.BABTEC_PASSWORD,
        token: process.env.BABTEC_TOKEN,
        apiKey: process.env.BABTEC_API_KEY,
        apiKeyHeader: process.env.BABTEC_API_KEY_HEADER,
      },
    };
  }

  if (process.env.LOG_LEVEL) {
    envOverrides.server = {
      ...(envOverrides.server || {}),
      logLevel: process.env.LOG_LEVEL,
    };
  }

  // Merge config data with env overrides
  const configDataObj = configData as Record<string, unknown>;
  const mergedConfig: Record<string, unknown> = {
    ...configDataObj,
    ...envOverrides,
    babtec: {
      ...((configDataObj.babtec as Record<string, unknown>) || {}),
      ...(envOverrides.babtec || {}),
    },
    server: {
      ...((configDataObj.server as Record<string, unknown>) || {}),
      ...(envOverrides.server || {}),
    },
  };

  // Validate and parse
  try {
    const validated = configSchema.parse(mergedConfig);
    logger.info('Configuration loaded and validated successfully');
    return validated;
  } catch (error) {
    logger.error('Configuration validation failed', { error });
    throw new Error(`Invalid configuration: ${error}`);
  }
}

