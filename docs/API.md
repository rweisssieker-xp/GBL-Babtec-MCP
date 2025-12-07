# Babtec MCP Server - API Documentation

## Overview

The Babtec MCP Server provides 18 MCP tools for interacting with Babtec quality management systems.

## Tools

### Inspection Plans

#### `babtec_search_testplan`
Search for inspection plans (Prüfpläne).

**Parameters:**
- `query` (string, optional): Search query
- `partNumber` (string, optional): Part number filter
- `status` (string, optional): Status filter (`active`, `inactive`, `draft`)
- `limit` (number, optional): Max results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Returns:**
```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

**Required Permission:** `read:testplans`

---

#### `babtec_get_testplan`
Get inspection plan details with all characteristics.

**Parameters:**
- `testplanId` (string, required): Inspection plan ID

**Returns:** Complete inspection plan object

**Required Permission:** `read:testplans`

---

### Inspection Lots

#### `babtec_search_lot`
Search for inspection lots (Prüflose).

**Parameters:**
- `lotNumber` (string, optional): Lot number filter
- `partNumber` (string, optional): Part number filter
- `status` (string, optional): Status filter
- `dateFrom` (string, optional): Start date (ISO 8601)
- `dateTo` (string, optional): End date (ISO 8601)
- `limit` (number, optional): Max results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Required Permission:** `read:lots`

---

#### `babtec_get_lot_results`
Get inspection results for a lot.

**Parameters:**
- `lotId` (string, required): Lot ID

**Returns:** Inspection results with measurements

**Required Permission:** `read:lots`

---

#### `babtec_set_lot_status`
Set inspection status for a lot (Write operation).

**Parameters:**
- `lotId` (string, required): Lot ID
- `status` (string, required): New status
- `comment` (string, optional): Optional comment

**Returns:** Success confirmation

**Required Permission:** `write:lots`

---

### Complaints/8D

#### `babtec_search_claim`
Search for complaints/claims.

**Parameters:**
- `claimNumber` (string, optional): Claim number filter
- `supplier` (string, optional): Supplier filter
- `status` (string, optional): Status filter
- `dateFrom` (string, optional): Start date
- `dateTo` (string, optional): End date
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**Required Permission:** `read:complaints`

---

#### `babtec_get_claim`
Get complaint details with 8D status.

**Parameters:**
- `claimId` (string, required): Claim ID

**Required Permission:** `read:complaints`

---

#### `babtec_update_claim_step`
Update 8D step for a complaint (Write operation).

**Parameters:**
- `claimId` (string, required): Claim ID
- `step` (string, required): 8D step (`D1`-`D8`)
- `data` (object, required): Step data

**Required Permission:** `write:complaints`

---

#### `babtec_add_claim_document`
Attach document to complaint (Write operation).

**Parameters:**
- `claimId` (string, required): Claim ID
- `documentName` (string, required): Document name
- `documentType` (string, required): Document type
- `documentContent` (string, required): Base64 encoded content
- `mimeType` (string, optional): MIME type

**Required Permission:** `write:complaints`

---

### Actions

#### `babtec_create_action`
Create new quality action (Write operation).

**Parameters:**
- `title` (string, required): Action title
- `description` (string, optional): Description
- `priority` (string, optional): Priority level
- `assignee` (string, optional): Assignee user ID
- `dueDate` (string, optional): Due date (ISO 8601)
- `relatedEntityType` (string, optional): Related entity type
- `relatedEntityId` (string, optional): Related entity ID

**Required Permission:** `write:actions`

---

#### `babtec_update_action`
Update existing action (Write operation).

**Parameters:**
- `actionId` (string, required): Action ID
- `title` (string, optional): Action title
- `description` (string, optional): Description
- `priority` (string, optional): Priority level
- `status` (string, optional): Status
- `assignee` (string, optional): Assignee
- `dueDate` (string, optional): Due date

**Required Permission:** `write:actions`

---

#### `babtec_close_action`
Close action (Write operation).

**Parameters:**
- `actionId` (string, required): Action ID
- `resolution` (string, optional): Resolution notes

**Required Permission:** `write:actions`

---

#### `babtec_get_action_list`
List actions with filters.

**Parameters:**
- `status` (string, optional): Status filter
- `assignee` (string, optional): Assignee filter
- `priority` (string, optional): Priority filter
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**Required Permission:** `read:actions`

---

### Audits

#### `babtec_create_audit_finding`
Create audit finding (Write operation).

**Parameters:**
- `auditId` (string, required): Audit ID
- `finding` (string, required): Finding description
- `severity` (string, required): Severity level
- `description` (string, optional): Detailed description
- `evidence` (string, optional): Evidence

**Required Permission:** `write:audits`

---

#### `babtec_update_audit_finding`
Update audit finding (Write operation).

**Parameters:**
- `findingId` (string, required): Finding ID
- `finding` (string, optional): Finding description
- `severity` (string, optional): Severity level
- `status` (string, optional): Status
- `description` (string, optional): Description
- `evidence` (string, optional): Evidence

**Required Permission:** `write:audits`

---

#### `babtec_get_audit_status`
Get audit status and findings.

**Parameters:**
- `auditId` (string, required): Audit ID

**Required Permission:** `read:audits`

---

### System Tools

#### `babtec_health_check`
Get health status of MCP server and Babtec connections.

**Parameters:** None

**Returns:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T12:00:00Z",
  "server": {
    "uptime": 3600,
    "version": "1.0.0"
  },
  "babtec": {
    "endpoints": [...]
  },
  "audit": {
    "enabled": true,
    "status": "operational"
  },
  "tools": {
    "registered": 18,
    "status": "operational"
  }
}
```

**Required Permission:** None (system tool)

---

#### `babtec_query_audit_logs`
Query audit logs with filters (admin only).

**Parameters:**
- `startDate` (string, optional): Start date (ISO 8601)
- `endDate` (string, optional): End date (ISO 8601)
- `userId` (string, optional): Filter by user ID
- `tool` (string, optional): Filter by tool name
- `operation` (string, optional): Filter by operation (`read`, `write`)
- `entityType` (string, optional): Filter by entity type
- `entityId` (string, optional): Filter by entity ID
- `limit` (number, optional): Max results (1-1000, default: 100)
- `offset` (number, optional): Pagination offset

**Required Permission:** `read:audit`

---

## Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BABTEC_API_ERROR`: Babtec API error
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error

---

## Rate Limiting

Rate limiting is enabled by default:
- Max requests: 100 per window
- Window: 60 seconds
- Configurable via `config.yaml`

When rate limit is exceeded, returns `RATE_LIMIT_ERROR` with `retryAfter` seconds.

---

## Version Compatibility

The server supports API version negotiation:
- Detects API version on connection
- Negotiates compatible version
- Falls back to last known working version

Supported versions are configured in `config.yaml`.

