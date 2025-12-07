# Babtec-MCP Integration Server

Model Context Protocol (MCP) server for integrating Babtec quality management systems with LLM/AI clients.

## Features

- **16 MCP Tools** for reading and writing quality data
- **Multi-endpoint support** (BabtecQ REST/SOAP, BabtecQube REST)
- **API version negotiation** with compatibility layer
- **Role-based access control** (RBAC)
- **Audit logging** for all write operations
- **Circuit breaker** and **rate limiting** for resilience
- **Real Babtec API integration** for testing

## Requirements

- Node.js 18+ (LTS)
- TypeScript 5.0+
- Access to Babtec test environment (for integration tests)

## Installation

```bash
npm install
```

## Configuration

Create a `config.yaml` file or set environment variables:

```yaml
server:
  name: babtec-mcp-server
  logLevel: info

babtec:
  endpoints:
    - name: babtecq-rest
      type: babtecq-rest
      baseUrl: https://babtec.example.com/api
      apiVersion: v1
  defaultEndpoint: babtecq-rest
  credentials:
    type: basic
    username: ${BABTEC_USERNAME}
    password: ${BABTEC_PASSWORD}

roles:
  - name: MCP_Read
    permissions: ["read:*"]
  - name: MCP_QM_Write
    permissions: ["read:*", "write:actions", "write:complaints"]
```

Or use environment variables:

```bash
export BABTEC_ENDPOINT_URL=https://babtec.example.com/api
export BABTEC_USERNAME=user
export BABTEC_PASSWORD=pass
export LOG_LEVEL=info
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run production
npm start

# Run tests
npm test

# Run integration tests (requires Babtec test environment)
npm run test:integration

# Lint
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
  config/         # Configuration schema and loader
  connectors/     # Babtec API connectors
  tools/          # MCP tool implementations
  middleware/     # RBAC, audit logging, validation
  utils/          # Logger, error handling
tests/
  integration/    # Integration tests with real Babtec
```

## License

MIT

