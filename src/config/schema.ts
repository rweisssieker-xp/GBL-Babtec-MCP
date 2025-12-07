import { z } from 'zod';

const endpointSchema = z.object({
  name: z.string(),
  type: z.enum(['babtecq-rest', 'babtecq-soap', 'babtecqube-rest']),
  baseUrl: z.string().url(),
  apiVersion: z.string().optional(),
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().min(0).max(5).default(3),
});

const credentialsSchema = z.object({
  type: z.enum(['basic', 'bearer', 'api-key', 'soap-wsse']),
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  apiKey: z.string().optional(),
  apiKeyHeader: z.string().optional(),
});

const roleSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string()),
});

export const configSchema = z.object({
  server: z.object({
    name: z.string().default('babtec-mcp-server'),
    port: z.number().int().positive().optional(),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
  babtec: z.object({
    endpoints: z.array(endpointSchema).min(1),
    defaultEndpoint: z.string(),
    credentials: credentialsSchema,
    versionNegotiation: z.object({
      enabled: z.boolean().default(true),
      supportedVersions: z.array(z.string()).default([]),
      fallbackVersion: z.string().optional(),
    }),
  }),
  roles: z.array(roleSchema).default([
    {
      name: 'MCP_Read',
      permissions: ['read:*'],
    },
    {
      name: 'MCP_QM_Write',
      permissions: ['read:*', 'write:actions', 'write:complaints', 'write:lots'],
    },
    {
      name: 'MCP_Production_Write',
      permissions: ['read:*', 'write:lots'],
    },
    {
      name: 'MCP_Audit_Write',
      permissions: ['read:*', 'write:audits'],
    },
    {
      name: 'MCP_Admin',
      permissions: ['read:*', 'write:*', 'read:audit'],
    },
  ]),
  audit: z.object({
    enabled: z.boolean().default(true),
    logPath: z.string().default('./audit-logs'),
    retentionDays: z.number().int().positive().default(365),
  }),
  security: z.object({
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      maxRequests: z.number().int().positive().default(100),
      windowMs: z.number().int().positive().default(60000),
    }),
    circuitBreaker: z.object({
      enabled: z.boolean().default(true),
      failureThreshold: z.number().int().positive().default(5),
      resetTimeout: z.number().int().positive().default(60000),
    }),
  }),
});

export type Config = z.infer<typeof configSchema>;
export type Endpoint = z.infer<typeof endpointSchema>;
export type Credentials = z.infer<typeof credentialsSchema>;
export type Role = z.infer<typeof roleSchema>;

