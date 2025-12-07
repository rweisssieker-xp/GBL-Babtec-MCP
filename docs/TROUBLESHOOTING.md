# Troubleshooting Guide

## Common Issues

### Server Won't Start

**Symptoms:**
- Server exits immediately
- Error messages in console

**Solutions:**
1. Check configuration file syntax:
   ```bash
   # Validate YAML syntax
   cat config.yaml | yq eval . - > /dev/null
   ```

2. Verify environment variables:
   ```bash
   echo $BABTEC_ENDPOINT_URL
   echo $BABTEC_USERNAME
   ```

3. Check log files:
   ```bash
   tail -f logs/error-*.log
   ```

4. Verify Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

---

### Connection to Babtec Fails

**Symptoms:**
- Tools return connection errors
- Circuit breaker opens

**Solutions:**
1. Verify endpoint URL:
   ```bash
   curl -v $BABTEC_ENDPOINT_URL/health
   ```

2. Check credentials:
   - Verify username/password
   - Check token expiration
   - Verify API key format

3. Check network connectivity:
   ```bash
   ping babtec.example.com
   telnet babtec.example.com 443
   ```

4. Check circuit breaker status:
   - Use `babtec_health_check` tool
   - Look for `circuitBreaker: "open"` status

5. Review API version:
   - Check if API version changed
   - Update `supportedVersions` in config

---

### Tools Not Available

**Symptoms:**
- Tools don't appear in tool list
- "Tool not found" errors

**Solutions:**
1. Check tool registration in logs:
   ```bash
   grep "Tool registered" logs/application-*.log
   ```

2. Verify RBAC configuration:
   - Check `roles` section in config
   - Verify user has required permissions

3. Check MCP client connection:
   - Verify MCP client is connected
   - Check MCP protocol version

---

### Permission Denied Errors

**Symptoms:**
- "Insufficient permissions" errors
- Operations fail with authorization errors

**Solutions:**
1. Check user roles:
   - Verify user has required role
   - Check role permissions in config

2. Verify permission format:
   - Format: `read:*` or `write:actions`
   - Check tool's required permission

3. Review audit logs:
   ```bash
   # Query audit logs for permission failures
   babtec_query_audit_logs --operation write --result failure
   ```

---

### Performance Issues

**Symptoms:**
- Slow response times
- Timeouts

**Solutions:**
1. Check API response times:
   - Use `babtec_health_check` tool
   - Review endpoint status

2. Review circuit breaker:
   - Check if circuit is open
   - Review failure threshold

3. Check rate limiting:
   - Verify rate limit settings
   - Check if rate limit is being hit

4. Review logs for errors:
   ```bash
   grep "timeout\|slow" logs/application-*.log
   ```

---

### Audit Logging Issues

**Symptoms:**
- Audit logs not created
- Log files not found

**Solutions:**
1. Check audit configuration:
   ```yaml
   audit:
     enabled: true
     logPath: ./audit-logs
   ```

2. Verify log directory permissions:
   ```bash
   ls -la audit-logs/
   chmod 755 audit-logs/
   ```

3. Check disk space:
   ```bash
   df -h audit-logs/
   ```

4. Review log retention:
   - Check `retentionDays` setting
   - Clean up old logs if needed

---

### API Version Issues

**Symptoms:**
- "API version not supported" errors
- Incompatible API responses

**Solutions:**
1. Check detected version:
   - Use `babtec_health_check` tool
   - Review `version` field in endpoint status

2. Update supported versions:
   ```yaml
   babtec:
     versionNegotiation:
       supportedVersions:
         - v1
         - v2
   ```

3. Check compatibility layer:
   - Review version negotiation logs
   - Verify fallback version

---

## Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm start
```

Or in config:
```yaml
server:
  logLevel: debug
```

---

## Health Check

Use the health check tool to diagnose issues:

```bash
# Via MCP client
babtec_health_check
```

Check for:
- Server uptime
- Endpoint connectivity
- Circuit breaker status
- Audit logging status

---

## Log Locations

- Application logs: `logs/application-YYYY-MM-DD.log`
- Error logs: `logs/error-YYYY-MM-DD.log`
- Audit logs: `audit-logs/audit-YYYY-MM-DD.jsonl`

---

## Getting Help

1. Check logs first
2. Review this troubleshooting guide
3. Check API documentation
4. Review configuration
5. Contact support with:
   - Error messages
   - Log excerpts
   - Configuration (sanitized)
   - Health check output

