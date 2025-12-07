# Babtec MCP Server - Administrator Manual

**Version:** 1.0.0  
**Last Updated:** 2025-01-27

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Security](#security)
6. [Monitoring](#monitoring)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Backup and Recovery](#backup-and-recovery)
10. [Upgrades](#upgrades)

## Introduction

This manual provides administrators with the information needed to install, configure, deploy, and maintain the Babtec MCP Server in production environments.

### System Requirements

- **Node.js**: 18.0.0 or higher (LTS recommended)
- **Operating System**: Linux, Windows, or macOS
- **Memory**: Minimum 512 MB, recommended 1 GB
- **Disk Space**: 100 MB for application, additional space for logs
- **Network**: Access to Babtec API endpoints

### Architecture Overview

The server runs as a standalone Node.js process that:
- Accepts MCP protocol connections via stdio
- Connects to one or more Babtec API endpoints
- Provides 18 MCP tools for quality data access
- Logs all operations for audit compliance

## Installation

### Step 1: Download and Extract

```bash
# Extract to installation directory
cd /opt
tar -xzf babtec-mcp-server-1.0.0.tar.gz
cd babtec-mcp-server
```

### Step 2: Install Dependencies

```bash
npm install --production
```

### Step 3: Build

```bash
npm run build
```

### Step 4: Verify Installation

```bash
node dist/index.js --version
```

## Configuration

### Configuration File Location

The server looks for configuration in this order:
1. `config.yaml` in the current directory
2. `~/.babtec-mcp/config.yaml`
3. Environment variables

### Configuration Structure

See `config.example.yaml` for a complete example. Key sections:

#### Server Configuration

```yaml
server:
  name: babtec-mcp-server
  logLevel: info  # error, warn, info, debug
```

#### Babtec Endpoints

```yaml
babtec:
  endpoints:
    - name: babtecq-rest
      type: babtecq-rest
      baseUrl: https://babtec.example.com/api
      apiVersion: v1
      timeout: 30000
      retries: 3
  defaultEndpoint: babtecq-rest
```

**Endpoint Types:**
- `babtecq-rest`: BabtecQ REST API
- `babtecq-soap`: BabtecQ SOAP API
- `babtecqube-rest`: BabtecQube REST API

#### Credentials

```yaml
babtec:
  credentials:
    type: basic  # basic, bearer, api-key, soap-wsse
    username: ${BABTEC_USERNAME}
    password: ${BABTEC_PASSWORD}
```

**Credential Types:**
- `basic`: HTTP Basic Authentication
- `bearer`: Bearer token authentication
- `api-key`: API key in header
- `soap-wsse`: SOAP WS-Security

**Security:** Always use environment variables for credentials. Never commit credentials to version control.

#### Roles and Permissions

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

#### Audit Configuration

```yaml
audit:
  enabled: true
  logPath: ./audit-logs
  retentionDays: 365
```

#### Security Settings

```yaml
security:
  rateLimiting:
    enabled: true
    maxRequests: 100
    windowMs: 60000
  circuitBreaker:
    enabled: true
    failureThreshold: 5
    resetTimeout: 60000
```

### Environment Variables

You can override configuration with environment variables:

```bash
export BABTEC_ENDPOINT_URL=https://babtec.example.com/api
export BABTEC_USERNAME=service-account
export BABTEC_PASSWORD=secure-password
export LOG_LEVEL=info
```

### Version Negotiation

```yaml
babtec:
  versionNegotiation:
    enabled: true
    supportedVersions:
      - v1
      - v2
    fallbackVersion: v1
```

The server automatically detects API versions and negotiates compatibility.

## Deployment

### Standalone Process

Run directly:

```bash
npm start
```

Or with Node.js:

```bash
node dist/index.js
```

### Linux Service (systemd)

Create service file `/etc/systemd/system/babtec-mcp.service`:

```ini
[Unit]
Description=Babtec MCP Server
After=network.target

[Service]
Type=simple
User=babtec-mcp
WorkingDirectory=/opt/babtec-mcp
ExecStart=/usr/bin/node /opt/babtec-mcp/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/etc/babtec-mcp/environment

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable babtec-mcp
sudo systemctl start babtec-mcp
sudo systemctl status babtec-mcp
```

### Windows Service

Using `node-windows`:

```bash
npm install -g node-windows
node-windows install
```

Or using `nssm`:

```bash
nssm install BabtecMCP "C:\Program Files\nodejs\node.exe" "C:\opt\babtec-mcp\dist\index.js"
nssm start BabtecMCP
```

### Docker (Optional)

While not required for MVP, you can containerize:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Process Management

**Recommended:**
- Use process managers (systemd, PM2, supervisor)
- Enable automatic restart on failure
- Monitor process health
- Set resource limits

## Security

### Authentication

The server uses credentials configured in `config.yaml` or environment variables. Ensure:

1. **Credentials are secure**: Use strong passwords or tokens
2. **Environment variables**: Store credentials in environment, not files
3. **Rotation**: Rotate credentials regularly
4. **Least privilege**: Use service accounts with minimal permissions

### Authorization

Role-based access control (RBAC) is enforced at the tool level:

1. **Assign roles**: Assign appropriate roles to users
2. **Review permissions**: Regularly review role permissions
3. **Audit access**: Monitor audit logs for unauthorized access attempts
4. **Principle of least privilege**: Grant minimum required permissions

### Network Security

1. **TLS/HTTPS**: All API connections must use HTTPS
2. **Certificate validation**: Verify SSL certificates
3. **Firewall**: Restrict network access to necessary endpoints
4. **VPN**: Use VPN for internal connections when possible

### Audit Logging

All operations are logged for compliance:

1. **Log location**: Configured in `audit.logPath`
2. **Retention**: Set `retentionDays` per compliance requirements
3. **Access control**: Restrict access to audit logs
4. **Backup**: Regularly backup audit logs

### Data Protection

1. **GDPR compliance**: Audit logs include user information
2. **Data retention**: Configure retention per policy
3. **Encryption**: Consider encrypting audit logs at rest
4. **Access logs**: Monitor who accesses audit logs

## Monitoring

### Health Checks

Use the `babtec_health_check` tool to monitor:

- Server uptime
- Babtec endpoint connectivity
- Circuit breaker status
- Audit logging status
- Tool registration

### Log Files

**Application Logs:**
- Location: `logs/application-YYYY-MM-DD.log`
- Format: JSON
- Rotation: Daily, 14 days retention

**Error Logs:**
- Location: `logs/error-YYYY-MM-DD.log`
- Format: JSON
- Rotation: Daily, 30 days retention

**Audit Logs:**
- Location: `audit-logs/audit-YYYY-MM-DD.jsonl`
- Format: JSONL (one entry per line)
- Retention: Configurable (default 365 days)

### Metrics to Monitor

1. **Server uptime**: Should be stable
2. **Request rate**: Monitor for unusual patterns
3. **Error rate**: Should be low
4. **Response times**: Should meet performance requirements
5. **Circuit breaker state**: Should be "closed" normally
6. **Audit log growth**: Monitor disk space

### Alerting

Set up alerts for:

- Server crashes or restarts
- Circuit breaker opening
- High error rates
- Audit log write failures
- Disk space low
- Unusual access patterns

## Maintenance

### Log Rotation

Logs rotate automatically:
- Application logs: 14 days retention
- Error logs: 30 days retention
- Audit logs: Configurable (default 365 days)

### Audit Log Management

**View logs:**
```bash
# View today's audit log
cat audit-logs/audit-$(date +%Y-%m-%d).jsonl | jq

# Search for specific entries
grep "babtec_create_action" audit-logs/audit-*.jsonl | jq
```

**Archive old logs:**
```bash
# Archive logs older than retention period
find audit-logs -name "audit-*.jsonl" -mtime +365 -exec gzip {} \;
```

**Clean up:**
```bash
# Remove archived logs older than 2 years
find audit-logs -name "audit-*.jsonl.gz" -mtime +730 -delete
```

### Configuration Updates

1. **Backup current config**: Always backup before changes
2. **Test changes**: Test in non-production first
3. **Restart service**: Restart after configuration changes
4. **Verify**: Check health status after restart

### Updates

See [Upgrades](#upgrades) section for update procedures.

## Troubleshooting

### Server Won't Start

**Check:**
1. Configuration file syntax (YAML)
2. Environment variables
3. Log files for errors
4. Node.js version: `node --version`
5. Dependencies: `npm list`

**Common issues:**
- Invalid YAML syntax
- Missing environment variables
- Port conflicts (if HTTP server enabled)
- Permission issues

### Connection to Babtec Fails

**Check:**
1. Endpoint URL is correct
2. Credentials are valid
3. Network connectivity
4. Firewall rules
5. SSL certificates

**Debug:**
```bash
# Test connectivity
curl -v https://babtec.example.com/api/version

# Check DNS resolution
nslookup babtec.example.com
```

### Tools Not Available

**Check:**
1. Tool registration in logs
2. RBAC configuration
3. User roles and permissions
4. MCP client connection

### Performance Issues

**Check:**
1. Response times in logs
2. Circuit breaker status
3. Network latency
4. Server resources (CPU, memory)
5. Concurrent request count

**Optimize:**
- Adjust rate limiting
- Tune circuit breaker thresholds
- Increase timeout values
- Scale horizontally (if supported)

## Backup and Recovery

### What to Backup

1. **Configuration files**: `config.yaml`
2. **Audit logs**: `audit-logs/`
3. **Application logs**: `logs/` (optional)
4. **Environment files**: `/etc/babtec-mcp/environment`

### Backup Strategy

**Daily:**
- Audit logs
- Configuration (if changed)

**Weekly:**
- Full backup of all logs
- Configuration verification

**Monthly:**
- Archive old logs
- Verify backup integrity

### Recovery Procedures

**Configuration recovery:**
1. Restore `config.yaml` from backup
2. Restore environment variables
3. Restart service
4. Verify health status

**Audit log recovery:**
1. Restore audit log files
2. Verify log integrity
3. Check for gaps in timeline

**Full recovery:**
1. Restore application files
2. Restore configuration
3. Restore audit logs
4. Restart service
5. Verify all systems operational

## Upgrades

### Pre-Upgrade Checklist

1. **Backup**: Backup configuration and logs
2. **Review**: Review release notes and breaking changes
3. **Test**: Test upgrade in non-production
4. **Schedule**: Schedule maintenance window

### Upgrade Procedure

1. **Stop service:**
   ```bash
   sudo systemctl stop babtec-mcp
   ```

2. **Backup:**
   ```bash
   cp -r /opt/babtec-mcp /opt/babtec-mcp.backup
   cp config.yaml config.yaml.backup
   ```

3. **Update code:**
   ```bash
   git pull  # or extract new release
   npm install
   npm run build
   ```

4. **Verify configuration:**
   - Check for new configuration options
   - Update configuration if needed
   - Test configuration syntax

5. **Start service:**
   ```bash
   sudo systemctl start babtec-mcp
   ```

6. **Verify:**
   ```bash
   sudo systemctl status babtec-mcp
   # Check health status via MCP tool
   ```

### Rollback Procedure

If upgrade fails:

1. **Stop service:**
   ```bash
   sudo systemctl stop babtec-mcp
   ```

2. **Restore:**
   ```bash
   rm -rf /opt/babtec-mcp
   cp -r /opt/babtec-mcp.backup /opt/babtec-mcp
   cp config.yaml.backup config.yaml
   ```

3. **Start service:**
   ```bash
   sudo systemctl start babtec-mcp
   ```

4. **Verify:**
   - Check health status
   - Review logs for errors
   - Test critical operations

### Post-Upgrade

1. **Monitor**: Monitor logs and metrics closely
2. **Verify**: Verify all tools are working
3. **Test**: Test critical workflows
4. **Document**: Document any issues encountered

---

**Additional Resources:**
- [User Manual](USER-MANUAL.md)
- [Developer Guide](DEVELOPER-GUIDE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [API Documentation](API.md)
