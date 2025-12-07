# Deployment Guide

## Prerequisites

- Node.js 18+ (LTS)
- Access to Babtec API endpoints
- Configuration file or environment variables

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Project

```bash
npm run build
```

### 3. Configuration

Create a `config.yaml` file (see `config.example.yaml`) or set environment variables:

```bash
export BABTEC_ENDPOINT_URL=https://babtec.example.com/api
export BABTEC_USERNAME=your-username
export BABTEC_PASSWORD=your-password
export LOG_LEVEL=info
```

## Running as Standalone Process

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Running as Service

### Linux (systemd)

Create `/etc/systemd/system/babtec-mcp.service`:

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

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable babtec-mcp
sudo systemctl start babtec-mcp
sudo systemctl status babtec-mcp
```

### Windows (Service)

Use `node-windows` or `nssm` to create a Windows service:

```bash
npm install -g node-windows
node-windows install
```

## Health Check

The server provides health status via the MCP protocol. Monitor logs for:

- Server startup messages
- Tool registration confirmations
- Circuit breaker status
- API connection status

## Logs

- Application logs: `logs/application-YYYY-MM-DD.log`
- Error logs: `logs/error-YYYY-MM-DD.log`
- Audit logs: `audit-logs/audit-YYYY-MM-DD.jsonl`

## Troubleshooting

### Server won't start

1. Check configuration file syntax
2. Verify environment variables
3. Check log files for errors
4. Verify Node.js version: `node --version`

### Connection to Babtec fails

1. Verify endpoint URL is correct
2. Check credentials
3. Verify network connectivity
4. Check circuit breaker status
5. Review API version compatibility

### Tools not available

1. Check tool registration in logs
2. Verify RBAC configuration
3. Check user roles and permissions

## Monitoring

Monitor the following:

- Process uptime
- Circuit breaker state
- API response times
- Error rates
- Audit log growth

## Backup

Regularly backup:

- Configuration files
- Audit logs
- Application logs

## Updates

1. Stop the service
2. Backup configuration and logs
3. Update code: `git pull` or deploy new version
4. Install dependencies: `npm install`
5. Rebuild: `npm run build`
6. Start service

