# API Version Compatibility Matrix

## Overview

The Babtec MCP Server supports multiple Babtec API versions through version negotiation and compatibility layers.

## Supported Versions

| API Version | Status | Features | Notes |
|------------|--------|----------|-------|
| v1 | ✅ Supported | Full feature set | Legacy version |
| v2 | ✅ Supported | Full feature set | Current version |
| v3 | ⚠️ Partial | Most features | New endpoints may not be available |

## Version Detection

The server automatically detects API version on connection:

1. Checks `/api/version` endpoint
2. Reads `X-API-Version` header
3. Falls back to configured version

## Version Negotiation

When multiple versions are supported:

1. Server detects API version
2. Checks against `supportedVersions` list
3. Selects compatible version
4. Falls back to `fallbackVersion` if negotiation fails

## Compatibility Layer

The compatibility layer abstracts version differences:

- **Endpoint Mapping**: Maps endpoints between versions
- **Data Transformation**: Transforms request/response data
- **Feature Flags**: Enables/disables features per version

## Configuration

```yaml
babtec:
  versionNegotiation:
    enabled: true
    supportedVersions:
      - v1
      - v2
    fallbackVersion: v1
```

## Version-Specific Notes

### v1
- All tools supported
- Legacy authentication methods
- SOAP support available

### v2
- All tools supported
- Modern authentication (Bearer tokens)
- REST-only (no SOAP)

### v3
- Most tools supported
- New endpoints may require updates
- Enhanced error handling

## Migration Guide

### From v1 to v2

1. Update authentication:
   ```yaml
   credentials:
     type: bearer  # Changed from basic
     token: ${BABTEC_TOKEN}
   ```

2. Update endpoints:
   ```yaml
   endpoints:
     - name: babtecq-rest
       type: babtecq-rest
       baseUrl: https://babtec.example.com/api/v2
   ```

3. Test all tools
4. Update supported versions in config

### From v2 to v3

1. Review breaking changes
2. Update tool implementations if needed
3. Test thoroughly
4. Update version in config

## Breaking Changes

### v1 → v2
- Authentication method changed
- Some endpoint paths changed
- Response format changes

### v2 → v3
- New required fields in some requests
- Response structure changes
- Error code changes

## Testing

Test version compatibility:

```bash
# Test with specific version
export BABTEC_API_VERSION=v2
npm test

# Test version negotiation
npm run test:integration
```

## Support

For version-specific issues:
1. Check version compatibility matrix
2. Review version-specific notes
3. Check breaking changes
4. Contact support with version details

