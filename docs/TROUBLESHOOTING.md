# Babtec MCP Server - Troubleshooting Guide

**Version:** 1.0.0  
**Last Updated:** 2025-01-27

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Server Issues](#server-issues)
4. [Connection Issues](#connection-issues)
5. [Authentication Issues](#authentication-issues)
6. [Authorization Issues](#authorization-issues)
7. [Performance Issues](#performance-issues)
8. [Error Messages](#error-messages)
9. [Debugging Tips](#debugging-tips)
10. [Getting Help](#getting-help)

## Quick Diagnostics

### Health Check

First, check server health:

```bash
# Use the health check tool via MCP client
babtec_health_check
```

**Expected Response:**
```json
{
  "status": "healthy",
  "server": { "uptime": 3600 },
  "babtec": { "endpoints": [{ "status": "connected" }] },
  "audit": { "status": "operational" }
}
```

### Check Logs

```bash
# Application logs
tail -f logs/application-$(date +%Y-%m-%d).log

# Error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# Audit logs
tail -f audit-logs/audit-$(date +%Y-%m-%d).jsonl
```

### Verify Configuration

```bash
# Check configuration syntax
node -e "require('js-yaml').load(require('fs').readFileSync('config.yaml', 'utf8'))"

# Check environment variables
env | grep BABTEC
```

## Common Issues

### Issue: Server Won't Start

**Symptoms:**
- Process exits immediately
- Error message on startup
- No logs generated

**Diagnosis:**

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Check dependencies:**
   ```bash
   npm list --depth=0
   ```

3. **Check configuration:**
   ```bash
   # Validate YAML syntax
   node -e "require('js-yaml').load(require('fs').readFileSync('config.yaml', 'utf8'))"
   ```

4. **Check permissions:**
   ```bash
   # Ensure log directories are writable
   ls -la logs/
   ls -la audit-logs/
   ```

**Solutions:**

- **Invalid YAML**: Fix syntax errors in `config.yaml`
- **Missing dependencies**: Run `npm install`
- **Wrong Node.js version**: Upgrade to Node.js 18+
- **Permission denied**: Fix directory permissions
- **Port conflict**: Check if port is already in use (if HTTP server enabled)

### Issue: Tools Not Available

**Symptoms:**
- Tool not found error
- Empty tool list
- Tool registration errors in logs

**Diagnosis:**

1. **Check tool registration:**
   ```bash
   grep "Tool registered" logs/application-*.log
   ```

2. **Check for errors:**
   ```bash
   grep -i error logs/application-*.log | tail -20
   ```

3. **Verify MCP client connection:**
   - Ensure MCP client is properly connected
   - Check stdio communication

**Solutions:**

- **Tool registration failed**: Check for errors in logs
- **MCP client not connected**: Verify client connection
- **Configuration issue**: Check tool registration in code

### Issue: Connection to Babtec Fails

**Symptoms:**
- Connection timeout errors
- Network errors
- API unavailable errors

**Diagnosis:**

1. **Test connectivity:**
   ```bash
   curl -v https://babtec.example.com/api/version
   ```

2. **Check DNS:**
   ```bash
   nslookup babtec.example.com
   ```

3. **Check firewall:**
   ```bash
   # Test port connectivity
   telnet babtec.example.com 443
   ```

4. **Check circuit breaker:**
   ```bash
   # Use health check tool
   babtec_health_check
   # Look for circuitBreaker: "open"
   ```

**Solutions:**

- **Network unreachable**: Check network connectivity
- **DNS resolution failed**: Verify DNS settings
- **Firewall blocking**: Configure firewall rules
- **SSL certificate issues**: Verify certificates
- **Circuit breaker open**: Wait for reset timeout or check endpoint status

### Issue: Authentication Fails

**Symptoms:**
- 401 Unauthorized errors
- Authentication error messages
- Token expired errors

**Diagnosis:**

1. **Check credentials:**
   ```bash
   # Verify environment variables are set
   echo $BABTEC_USERNAME
   echo $BABTEC_PASSWORD
   ```

2. **Test credentials:**
   ```bash
   curl -u "$BABTEC_USERNAME:$BABTEC_PASSWORD" \
     https://babtec.example.com/api/version
   ```

3. **Check credential type:**
   - Verify `credentials.type` matches API requirements
   - Check if token needs refresh

**Solutions:**

- **Invalid credentials**: Update username/password
- **Wrong credential type**: Change `credentials.type` in config
- **Token expired**: Refresh bearer token
- **API key invalid**: Update API key

### Issue: Permission Denied

**Symptoms:**
- Authorization error messages
- "Missing required permission" errors
- Operations fail with 403

**Diagnosis:**

1. **Check user roles:**
   - Verify roles are assigned to user
   - Check role definitions in config

2. **Check permissions:**
   ```bash
   # Review role permissions
   grep -A 5 "name: MCP_QM_Write" config.yaml
   ```

3. **Check tool requirements:**
   - Review tool documentation for required permissions
   - Verify permission format matches

**Solutions:**

- **No roles assigned**: Assign appropriate roles to user
- **Insufficient permissions**: Add required permissions to role
- **Wrong permission format**: Use correct format (e.g., `write:actions`)

## Server Issues

### Server Crashes

**Symptoms:**
- Process exits unexpectedly
- No response to requests
- Error logs show crashes

**Diagnosis:**

1. **Check error logs:**
   ```bash
   tail -50 logs/error-*.log
   ```

2. **Check system resources:**
   ```bash
   # Memory usage
   ps aux | grep node
   
   # Disk space
   df -h
   ```

3. **Check for uncaught exceptions:**
   ```bash
   grep "uncaught" logs/error-*.log
   ```

**Solutions:**

- **Out of memory**: Increase Node.js memory limit or optimize code
- **Uncaught exception**: Fix error handling in code
- **Disk full**: Free up disk space
- **Resource limits**: Check system resource limits

### Server Slow to Respond

**Symptoms:**
- High response times
- Timeout errors
- Slow tool execution

**Diagnosis:**

1. **Check response times:**
   ```bash
   # Look for slow operations in logs
   grep "Tool called" logs/application-*.log | \
     awk '{print $NF}' | sort -n | tail -10
   ```

2. **Check API response times:**
   - Monitor Babtec API response times
   - Check network latency

3. **Check concurrent requests:**
   - Monitor request rate
   - Check for bottlenecks

**Solutions:**

- **High API latency**: Check Babtec API performance
- **Network issues**: Investigate network latency
- **Too many requests**: Adjust rate limiting
- **Resource constraints**: Increase server resources

## Connection Issues

### Circuit Breaker Open

**Symptoms:**
- Requests fail immediately
- Health check shows circuit breaker "open"
- Connection errors

**Diagnosis:**

```bash
# Check health status
babtec_health_check
# Look for: "circuitBreaker": "open"
```

**Solutions:**

- **Wait for reset**: Circuit breaker resets after `resetTimeout`
- **Check endpoint**: Verify Babtec API is available
- **Reduce failure threshold**: Lower `failureThreshold` in config (not recommended)
- **Manual reset**: Restart server to reset circuit breaker

### Connection Timeout

**Symptoms:**
- Timeout errors
- Slow responses
- Connection errors

**Diagnosis:**

1. **Check timeout settings:**
   ```yaml
   babtec:
     endpoints:
       - timeout: 30000  # 30 seconds
   ```

2. **Test endpoint:**
   ```bash
   time curl https://babtec.example.com/api/version
   ```

**Solutions:**

- **Increase timeout**: Increase `timeout` value in config
- **Check network**: Investigate network latency
- **Check API**: Verify Babtec API performance

## Authentication Issues

### Invalid Credentials

**Symptoms:**
- 401 Unauthorized
- Authentication error

**Solutions:**

1. **Verify credentials:**
   ```bash
   # Test with curl
   curl -u "username:password" https://babtec.example.com/api/version
   ```

2. **Check environment variables:**
   ```bash
   env | grep BABTEC
   ```

3. **Update credentials**: Set correct username/password

### Token Expired

**Symptoms:**
- Token expired errors
- 401 after working previously

**Solutions:**

1. **Refresh token**: Update `BABTEC_TOKEN` environment variable
2. **Check token expiration**: Verify token hasn't expired
3. **Implement token refresh**: Add token refresh logic (future enhancement)

## Authorization Issues

### Missing Permissions

**Symptoms:**
- "Missing required permission" error
- Operations fail with authorization error

**Solutions:**

1. **Check role assignment**: Ensure user has appropriate role
2. **Check role permissions**: Verify role includes required permission
3. **Review tool requirements**: Check tool documentation for required permissions

### Permission Format Error

**Symptoms:**
- Permission check fails
- Unexpected authorization errors

**Solutions:**

1. **Verify format**: Use correct format (e.g., `write:actions`, not `write_actions`)
2. **Check wildcards**: Use `read:*` for all read permissions
3. **Review role config**: Ensure permissions array is correct

## Performance Issues

### High Response Times

**Symptoms:**
- Slow tool execution
- Timeout errors
- Poor performance

**Diagnosis:**

1. **Check API latency:**
   ```bash
   time curl https://babtec.example.com/api/version
   ```

2. **Monitor logs:**
   ```bash
   # Find slow operations
   grep "Tool called" logs/application-*.log
   ```

**Solutions:**

- **Optimize queries**: Use filters to reduce result sets
- **Increase timeout**: Adjust timeout values
- **Check network**: Investigate network performance
- **Scale horizontally**: Run multiple instances (future)

### High Memory Usage

**Symptoms:**
- Server crashes
- Slow performance
- Memory warnings

**Solutions:**

1. **Check memory usage:**
   ```bash
   ps aux | grep node
   ```

2. **Increase memory limit:**
   ```bash
   node --max-old-space-size=2048 dist/index.js
   ```

3. **Optimize code**: Review for memory leaks

## Error Messages

### VALIDATION_ERROR

**Meaning**: Input validation failed

**Common Causes:**
- Missing required parameters
- Invalid parameter types
- Invalid enum values
- Format errors (dates, IDs)

**Solutions:**
- Check required parameters
- Verify parameter types
- Use correct formats (ISO 8601 for dates)
- Review tool documentation

### AUTHENTICATION_ERROR

**Meaning**: Authentication failed

**Common Causes:**
- Invalid credentials
- Expired token
- Wrong credential type

**Solutions:**
- Verify credentials
- Refresh token
- Check credential type

### AUTHORIZATION_ERROR

**Meaning**: Insufficient permissions

**Common Causes:**
- Missing role
- Insufficient permissions
- Wrong permission format

**Solutions:**
- Assign appropriate role
- Add required permissions
- Verify permission format

### NOT_FOUND

**Meaning**: Resource not found

**Common Causes:**
- Invalid entity ID
- Entity doesn't exist
- Wrong endpoint

**Solutions:**
- Verify entity ID
- Check if entity exists
- Use correct endpoint

### BABTEC_API_ERROR

**Meaning**: Babtec API error

**Common Causes:**
- API unavailable
- API error
- Network issue

**Solutions:**
- Check Babtec API status
- Review API error details
- Check network connectivity

### RATE_LIMIT_ERROR

**Meaning**: Rate limit exceeded

**Common Causes:**
- Too many requests
- Rate limit too low

**Solutions:**
- Wait before retrying
- Increase rate limit in config
- Reduce request rate

## Debugging Tips

### Enable Debug Logging

```bash
export LOG_LEVEL=debug
npm start
```

### Check Specific Tool

```bash
# Filter logs for specific tool
grep "babtec_create_action" logs/application-*.log
```

### Monitor Real-Time

```bash
# Watch logs in real-time
tail -f logs/application-$(date +%Y-%m-%d).log | grep -i error
```

### Test Configuration

```bash
# Validate configuration without starting server
node -e "
const { loadConfig } = require('./dist/config/loader.js');
try {
  const config = loadConfig();
  console.log('Configuration valid:', config);
} catch (error) {
  console.error('Configuration error:', error);
}
"
```

### Isolate Issues

1. **Test connectivity**: Use curl to test Babtec API
2. **Test credentials**: Verify credentials work independently
3. **Test permissions**: Check role assignments
4. **Test tools individually**: Call tools one at a time

## Getting Help

### Information to Provide

When reporting issues, include:

1. **Error messages**: Full error text
2. **Logs**: Relevant log entries
3. **Configuration**: Configuration file (redact credentials)
4. **Steps to reproduce**: Detailed steps
5. **Environment**: Node.js version, OS, etc.

### Log Locations

- **Application logs**: `logs/application-YYYY-MM-DD.log`
- **Error logs**: `logs/error-YYYY-MM-DD.log`
- **Audit logs**: `audit-logs/audit-YYYY-MM-DD.jsonl`

### Useful Commands

```bash
# Check server status
systemctl status babtec-mcp

# View recent errors
tail -50 logs/error-$(date +%Y-%m-%d).log

# Check configuration
cat config.yaml

# Test connectivity
curl -v https://babtec.example.com/api/version

# Check health
babtec_health_check
```

---

**Additional Resources:**
- [User Manual](USER-MANUAL.md)
- [Administrator Manual](ADMINISTRATOR-MANUAL.md)
- [Configuration Reference](CONFIGURATION-REFERENCE.md)
