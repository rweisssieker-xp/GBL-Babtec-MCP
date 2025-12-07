# Babtec MCP Server - Configuration Reference

**Version:** 1.0.0  
**Last Updated:** 2025-01-27

## Table of Contents

1. [Overview](#overview)
2. [Configuration File Format](#configuration-file-format)
3. [Server Configuration](#server-configuration)
4. [Babtec Configuration](#babtec-configuration)
5. [Roles and Permissions](#roles-and-permissions)
6. [Audit Configuration](#audit-configuration)
7. [Security Configuration](#security-configuration)
8. [Environment Variables](#environment-variables)
9. [Configuration Examples](#configuration-examples)

## Overview

The Babtec MCP Server uses YAML configuration files or environment variables. Configuration is loaded in this order:

1. `config.yaml` in current directory
2. `~/.babtec-mcp/config.yaml`
3. Environment variables

## Configuration File Format

Configuration files use YAML format:

```yaml
server:
  # Server settings

babtec:
  # Babtec API settings

roles:
  # Role definitions

audit:
  # Audit logging settings

security:
  # Security settings
```

## Server Configuration

### `server.name`

**Type**: `string`  
**Default**: `babtec-mcp-server`  
**Description**: Server name used in MCP protocol

**Example:**
```yaml
server:
  name: babtec-mcp-server
```

### `server.logLevel`

**Type**: `enum` (`error`, `warn`, `info`, `debug`)  
**Default**: `info`  
**Description**: Logging level

**Example:**
```yaml
server:
  logLevel: debug
```

**Levels:**
- `error`: Only error messages
- `warn`: Warnings and errors
- `info`: Informational messages, warnings, and errors
- `debug`: All messages including debug information

## Babtec Configuration

### `babtec.endpoints`

**Type**: `array` of endpoint objects  
**Required**: Yes  
**Description**: List of Babtec API endpoints

**Endpoint Object:**
```yaml
babtec:
  endpoints:
    - name: string              # Unique endpoint name
      type: enum                # babtecq-rest | babtecq-soap | babtecqube-rest
      baseUrl: string           # Base URL (must be valid URL)
      apiVersion: string        # Optional API version
      timeout: number           # Request timeout in ms (default: 30000)
      retries: number          # Max retries (0-5, default: 3)
```

**Example:**
```yaml
babtec:
  endpoints:
    - name: babtecq-rest
      type: babtecq-rest
      baseUrl: https://babtec.example.com/api
      apiVersion: v1
      timeout: 30000
      retries: 3
    - name: babtecqube-rest
      type: babtecqube-rest
      baseUrl: https://babtecqube.example.com/api
      apiVersion: v2
      timeout: 30000
      retries: 3
```

### `babtec.defaultEndpoint`

**Type**: `string`  
**Required**: Yes  
**Description**: Name of default endpoint to use

**Example:**
```yaml
babtec:
  defaultEndpoint: babtecq-rest
```

**Note**: Must match one of the endpoint names in `babtec.endpoints`.

### `babtec.credentials`

**Type**: credentials object  
**Required**: Yes  
**Description**: Authentication credentials

**Credentials Object:**
```yaml
babtec:
  credentials:
    type: enum                  # basic | bearer | api-key | soap-wsse
    username: string           # For basic auth
    password: string           # For basic auth
    token: string              # For bearer auth
    apiKey: string             # For api-key auth
    apiKeyHeader: string       # Header name for api-key (default: X-API-Key)
```

**Basic Authentication:**
```yaml
babtec:
  credentials:
    type: basic
    username: ${BABTEC_USERNAME}
    password: ${BABTEC_PASSWORD}
```

**Bearer Token:**
```yaml
babtec:
  credentials:
    type: bearer
    token: ${BABTEC_TOKEN}
```

**API Key:**
```yaml
babtec:
  credentials:
    type: api-key
    apiKey: ${BABTEC_API_KEY}
    apiKeyHeader: X-API-Key
```

**Security Note**: Always use environment variables for credentials. Never commit credentials to version control.

### `babtec.versionNegotiation`

**Type**: version negotiation object  
**Default**: Enabled with empty supported versions  
**Description**: API version negotiation settings

**Version Negotiation Object:**
```yaml
babtec:
  versionNegotiation:
    enabled: boolean           # Enable version negotiation (default: true)
    supportedVersions: array   # List of supported versions
    fallbackVersion: string    # Fallback version if negotiation fails
```

**Example:**
```yaml
babtec:
  versionNegotiation:
    enabled: true
    supportedVersions:
      - v1
      - v2
    fallbackVersion: v1
```

**How it works:**
1. Server detects API version on connection
2. Checks if detected version is in `supportedVersions`
3. Uses detected version if supported
4. Falls back to `fallbackVersion` if negotiation fails

## Roles and Permissions

### `roles`

**Type**: `array` of role objects  
**Default**: Predefined roles (see below)  
**Description**: Role definitions with permissions

**Role Object:**
```yaml
roles:
  - name: string               # Role name
    permissions: array         # List of permissions
```

**Permission Format:**
- `read:*` - Read all entities
- `read:testplans` - Read inspection plans
- `read:lots` - Read inspection lots
- `read:complaints` - Read complaints
- `read:actions` - Read actions
- `read:audits` - Read audits
- `read:audit` - Read audit logs (admin only)
- `write:*` - Write all entities
- `write:actions` - Write actions
- `write:complaints` - Write complaints
- `write:lots` - Write lots
- `write:audits` - Write audits

**Default Roles:**
```yaml
roles:
  - name: MCP_Read
    permissions:
      - read:*
  
  - name: MCP_QM_Write
    permissions:
      - read:*
      - write:actions
      - write:complaints
      - write:lots
  
  - name: MCP_Production_Write
    permissions:
      - read:*
      - write:lots
  
  - name: MCP_Audit_Write
    permissions:
      - read:*
      - write:audits
  
  - name: MCP_Admin
    permissions:
      - read:*
      - write:*
      - read:audit
```

**Custom Roles:**
```yaml
roles:
  - name: CustomRole
    permissions:
      - read:testplans
      - read:lots
      - write:lots
```

## Audit Configuration

### `audit.enabled`

**Type**: `boolean`  
**Default**: `true`  
**Description**: Enable audit logging

**Example:**
```yaml
audit:
  enabled: true
```

### `audit.logPath`

**Type**: `string`  
**Default**: `./audit-logs`  
**Description**: Directory path for audit logs

**Example:**
```yaml
audit:
  logPath: /var/log/babtec-mcp/audit
```

**Note**: Directory is created automatically if it doesn't exist.

### `audit.retentionDays`

**Type**: `number` (positive integer)  
**Default**: `365`  
**Description**: Number of days to retain audit logs

**Example:**
```yaml
audit:
  retentionDays: 730  # 2 years
```

**Note**: This is informational only. Actual cleanup must be implemented separately (cron job, etc.).

## Security Configuration

### `security.rateLimiting`

**Type**: rate limiting object  
**Description**: Rate limiting settings

**Rate Limiting Object:**
```yaml
security:
  rateLimiting:
    enabled: boolean           # Enable rate limiting (default: true)
    maxRequests: number        # Max requests per window (default: 100)
    windowMs: number           # Time window in milliseconds (default: 60000)
```

**Example:**
```yaml
security:
  rateLimiting:
    enabled: true
    maxRequests: 200
    windowMs: 60000  # 1 minute
```

**How it works:**
- Limits requests per time window
- Returns `RATE_LIMIT_ERROR` when exceeded
- Window resets after `windowMs` milliseconds

### `security.circuitBreaker`

**Type**: circuit breaker object  
**Description**: Circuit breaker settings

**Circuit Breaker Object:**
```yaml
security:
  circuitBreaker:
    enabled: boolean           # Enable circuit breaker (default: true)
    failureThreshold: number   # Failures before opening (default: 5)
    resetTimeout: number       # Timeout before retry in ms (default: 60000)
```

**Example:**
```yaml
security:
  circuitBreaker:
    enabled: true
    failureThreshold: 10
    resetTimeout: 30000  # 30 seconds
```

**How it works:**
1. Circuit starts in "closed" state (normal operation)
2. After `failureThreshold` failures, circuit opens
3. Requests fail fast when circuit is open
4. After `resetTimeout`, circuit attempts "half-open" state
5. If successful, circuit closes; if not, opens again

## Environment Variables

You can override configuration with environment variables:

### Server Variables

- `LOG_LEVEL`: Log level (`error`, `warn`, `info`, `debug`)

### Babtec Variables

- `BABTEC_ENDPOINT_URL`: Base URL for default endpoint
- `BABTEC_USERNAME`: Username for basic auth
- `BABTEC_PASSWORD`: Password for basic auth
- `BABTEC_TOKEN`: Token for bearer auth
- `BABTEC_API_KEY`: API key for api-key auth

### Example

```bash
export LOG_LEVEL=debug
export BABTEC_ENDPOINT_URL=https://babtec.example.com/api
export BABTEC_USERNAME=service-account
export BABTEC_PASSWORD=secure-password
```

## Configuration Examples

### Minimal Configuration

```yaml
server:
  name: babtec-mcp-server
  logLevel: info

babtec:
  endpoints:
    - name: babtecq-rest
      type: babtecq-rest
      baseUrl: https://babtec.example.com/api
  defaultEndpoint: babtecq-rest
  credentials:
    type: basic
    username: ${BABTEC_USERNAME}
    password: ${BABTEC_PASSWORD}
```

### Production Configuration

```yaml
server:
  name: babtec-mcp-server
  logLevel: warn

babtec:
  endpoints:
    - name: babtecq-rest
      type: babtecq-rest
      baseUrl: https://babtec.example.com/api
      apiVersion: v2
      timeout: 30000
      retries: 3
    - name: babtecqube-rest
      type: babtecqube-rest
      baseUrl: https://babtecqube.example.com/api
      apiVersion: v2
      timeout: 30000
      retries: 3
  defaultEndpoint: babtecq-rest
  credentials:
    type: bearer
    token: ${BABTEC_TOKEN}
  versionNegotiation:
    enabled: true
    supportedVersions:
      - v1
      - v2
    fallbackVersion: v1

roles:
  - name: MCP_Read
    permissions:
      - read:*
  - name: MCP_QM_Write
    permissions:
      - read:*
      - write:actions
      - write:complaints
      - write:lots
  - name: MCP_Admin
    permissions:
      - read:*
      - write:*
      - read:audit

audit:
  enabled: true
  logPath: /var/log/babtec-mcp/audit
  retentionDays: 730

security:
  rateLimiting:
    enabled: true
    maxRequests: 200
    windowMs: 60000
  circuitBreaker:
    enabled: true
    failureThreshold: 10
    resetTimeout: 60000
```

### Development Configuration

```yaml
server:
  name: babtec-mcp-server-dev
  logLevel: debug

babtec:
  endpoints:
    - name: babtecq-rest-test
      type: babtecq-rest
      baseUrl: https://babtec-test.example.com/api
      apiVersion: v1
      timeout: 10000
      retries: 1
  defaultEndpoint: babtecq-rest-test
  credentials:
    type: basic
    username: ${BABTEC_TEST_USERNAME}
    password: ${BABTEC_TEST_PASSWORD}

audit:
  enabled: true
  logPath: ./audit-logs
  retentionDays: 30

security:
  rateLimiting:
    enabled: false  # Disable for development
  circuitBreaker:
    enabled: true
    failureThreshold: 3
    resetTimeout: 10000
```

### Multi-Endpoint Configuration

```yaml
babtec:
  endpoints:
    - name: babtecq-primary
      type: babtecq-rest
      baseUrl: https://babtec-primary.example.com/api
      apiVersion: v2
    - name: babtecq-secondary
      type: babtecq-rest
      baseUrl: https://babtec-secondary.example.com/api
      apiVersion: v1
    - name: babtecqube
      type: babtecqube-rest
      baseUrl: https://babtecqube.example.com/api
      apiVersion: v2
  defaultEndpoint: babtecq-primary
  credentials:
    type: bearer
    token: ${BABTEC_TOKEN}
```

---

**Additional Resources:**
- [Administrator Manual](ADMINISTRATOR-MANUAL.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Example Configuration](../config.example.yaml)
