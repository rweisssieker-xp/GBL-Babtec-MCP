# Babtec MCP Server - User Manual

**Version:** 1.0.0  
**Last Updated:** 2025-01-27

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [MCP Tools Overview](#mcp-tools-overview)
4. [Inspection Plans](#inspection-plans)
5. [Inspection Lots](#inspection-lots)
6. [Complaints and 8D Process](#complaints-and-8d-process)
7. [Quality Actions](#quality-actions)
8. [Audits](#audits)
9. [System Tools](#system-tools)
10. [Error Handling](#error-handling)
11. [Best Practices](#best-practices)

## Introduction

The Babtec MCP Server provides Model Context Protocol (MCP) tools for integrating Babtec quality management systems with AI assistants and LLM clients. This manual explains how to use all available tools to interact with quality data, manage inspections, handle complaints, and track quality actions.

### What You Can Do

- Search and retrieve inspection plans (Prüfpläne)
- Query inspection lots (Prüflose) and results
- Manage complaints and 8D processes
- Create and track quality actions
- Record audit findings
- Monitor system health

### Prerequisites

- Access to a Babtec quality management system
- MCP client configured to connect to this server
- Appropriate user roles and permissions

## Getting Started

### Connecting to the Server

The MCP server runs as a background process and communicates via stdio. Your MCP client handles the connection automatically.

### Understanding Permissions

Different tools require different permissions:

- **Read Operations**: Require `read:*` or specific read permissions
- **Write Operations**: Require specific write permissions (e.g., `write:actions`, `write:complaints`)
- **Admin Operations**: Require `read:audit` permission

Your administrator assigns roles that grant these permissions.

## MCP Tools Overview

The server provides 18 MCP tools organized into categories:

| Category | Tools | Count |
|----------|-------|-------|
| Inspection Plans | `babtec_search_testplan`, `babtec_get_testplan` | 2 |
| Inspection Lots | `babtec_search_lot`, `babtec_get_lot_results`, `babtec_set_lot_status` | 3 |
| Complaints/8D | `babtec_search_claim`, `babtec_get_claim`, `babtec_update_claim_step`, `babtec_add_claim_document` | 4 |
| Actions | `babtec_create_action`, `babtec_update_action`, `babtec_close_action`, `babtec_get_action_list` | 4 |
| Audits | `babtec_create_audit_finding`, `babtec_update_audit_finding`, `babtec_get_audit_status` | 3 |
| System | `babtec_health_check`, `babtec_query_audit_logs` | 2 |

## Inspection Plans

Inspection plans (Prüfpläne) define quality requirements for parts and products.

### Search Inspection Plans

**Tool:** `babtec_search_testplan`

Search for inspection plans using various filters.

**Parameters:**

- `query` (string, optional): Free-text search query
- `partNumber` (string, optional): Filter by part number
- `status` (string, optional): Filter by status (`active`, `inactive`, `draft`)
- `limit` (number, optional): Maximum results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**

```json
{
  "query": "bearing",
  "status": "active",
  "limit": 10
}
```

**Response:**

```json
{
  "items": [
    {
      "id": "TP-001",
      "partNumber": "BEAR-12345",
      "name": "Bearing Inspection Plan",
      "status": "active",
      "version": "1.0"
    }
  ],
  "total": 15,
  "limit": 10,
  "offset": 0
}
```

### Get Inspection Plan Details

**Tool:** `babtec_get_testplan`

Retrieve complete inspection plan with all characteristics and specifications.

**Parameters:**

- `testplanId` (string, required): Inspection plan ID

**Example:**

```json
{
  "testplanId": "TP-001"
}
```

**Response:**

Returns complete inspection plan object with:
- Plan metadata (ID, name, version, status)
- Part information
- Characteristics list with specifications
- Measurement methods
- Tolerance limits

## Inspection Lots

Inspection lots (Prüflose) represent batches of parts being inspected.

### Search Inspection Lots

**Tool:** `babtec_search_lot`

Search for inspection lots with filters.

**Parameters:**

- `lotNumber` (string, optional): Filter by lot number
- `partNumber` (string, optional): Filter by part number
- `status` (string, optional): Filter by status (`pending`, `in-progress`, `completed`, `rejected`)
- `dateFrom` (string, optional): Start date (ISO 8601 format)
- `dateTo` (string, optional): End date (ISO 8601 format)
- `limit` (number, optional): Maximum results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**

```json
{
  "partNumber": "BEAR-12345",
  "status": "completed",
  "dateFrom": "2025-01-01T00:00:00Z",
  "limit": 50
}
```

### Get Inspection Results

**Tool:** `babtec_get_lot_results`

Get all inspection results and measurements for a specific lot.

**Parameters:**

- `lotId` (string, required): Lot ID

**Example:**

```json
{
  "lotId": "LOT-2025-001"
}
```

**Response:**

Returns detailed results including:
- Lot information
- All measurements per characteristic
- Tolerance violations
- Overall lot status
- Timestamps

### Set Lot Status

**Tool:** `babtec_set_lot_status`

Update the inspection status of a lot. Requires `write:lots` permission.

**Parameters:**

- `lotId` (string, required): Lot ID
- `status` (string, required): New status (`pending`, `in-progress`, `completed`, `rejected`)
- `comment` (string, optional): Optional comment explaining the status change

**Example:**

```json
{
  "lotId": "LOT-2025-001",
  "status": "completed",
  "comment": "All measurements within tolerance"
}
```

**Response:**

```json
{
  "success": true,
  "lotId": "LOT-2025-001",
  "status": {
    "status": "completed",
    "updatedAt": "2025-01-27T10:30:00Z"
  }
}
```

## Complaints and 8D Process

Complaints (Reklamationen) are quality issues that follow the 8D problem-solving process.

### Search Complaints

**Tool:** `babtec_search_claim`

Search for complaints using various filters.

**Parameters:**

- `claimNumber` (string, optional): Filter by claim number
- `supplier` (string, optional): Filter by supplier name
- `status` (string, optional): Filter by status (`open`, `in-progress`, `closed`, `escalated`)
- `dateFrom` (string, optional): Start date (ISO 8601)
- `dateTo` (string, optional): End date (ISO 8601)
- `limit` (number, optional): Maximum results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**

```json
{
  "supplier": "Supplier ABC",
  "status": "open",
  "limit": 25
}
```

### Get Complaint Details

**Tool:** `babtec_get_claim`

Get complete complaint information including 8D status.

**Parameters:**

- `claimId` (string, required): Complaint ID

**Response:**

Returns complaint details including:
- Complaint information
- 8D step status (D1 through D8)
- Related documents
- Timeline
- Assignees

### Update 8D Step

**Tool:** `babtec_update_claim_step`

Update a specific 8D step. Requires `write:complaints` permission.

**Parameters:**

- `claimId` (string, required): Complaint ID
- `step` (string, required): 8D step (`D1`, `D2`, `D3`, `D4`, `D5`, `D6`, `D7`, `D8`)
- `data` (object, required): Step-specific data

**8D Steps:**

- **D1**: Team Formation
- **D2**: Problem Description
- **D3**: Containment Actions
- **D4**: Root Cause Analysis
- **D5**: Corrective Actions
- **D6**: Implementation
- **D7**: Prevention
- **D8**: Closure

**Example:**

```json
{
  "claimId": "CLAIM-2025-001",
  "step": "D4",
  "data": {
    "rootCause": "Material hardness below specification",
    "analysisMethod": "5-Why Analysis",
    "evidence": "Test report TR-12345"
  }
}
```

### Add Document to Complaint

**Tool:** `babtec_add_claim_document`

Attach a document to a complaint. Requires `write:complaints` permission.

**Parameters:**

- `claimId` (string, required): Complaint ID
- `documentName` (string, required): Document name
- `documentType` (string, required): Document type (e.g., "report", "image", "certificate")
- `documentContent` (string, required): Base64-encoded document content
- `mimeType` (string, optional): MIME type (e.g., "application/pdf", "image/png")

**Example:**

```json
{
  "claimId": "CLAIM-2025-001",
  "documentName": "Root Cause Analysis Report",
  "documentType": "report",
  "documentContent": "JVBERi0xLjQKJeLjz9MKMy...",
  "mimeType": "application/pdf"
}
```

## Quality Actions

Quality actions track tasks and improvements in the quality management system.

### Create Action

**Tool:** `babtec_create_action`

Create a new quality action. Requires `write:actions` permission.

**Parameters:**

- `title` (string, required): Action title
- `description` (string, optional): Detailed description
- `priority` (string, optional): Priority level (`low`, `medium`, `high`, `critical`, default: `medium`)
- `assignee` (string, optional): Assignee user ID
- `dueDate` (string, optional): Due date (ISO 8601 format)
- `relatedEntityType` (string, optional): Related entity type (e.g., "complaint", "lot")
- `relatedEntityId` (string, optional): Related entity ID

**Example:**

```json
{
  "title": "Review material specifications",
  "description": "Verify material hardness requirements",
  "priority": "high",
  "assignee": "user-123",
  "dueDate": "2025-02-15T00:00:00Z",
  "relatedEntityType": "complaint",
  "relatedEntityId": "CLAIM-2025-001"
}
```

**Response:**

```json
{
  "success": true,
  "actionId": "ACT-2025-001",
  "action": {
    "id": "ACT-2025-001",
    "title": "Review material specifications",
    "status": "open",
    "createdAt": "2025-01-27T10:00:00Z"
  }
}
```

### Update Action

**Tool:** `babtec_update_action`

Update an existing action. Requires `write:actions` permission.

**Parameters:**

- `actionId` (string, required): Action ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `priority` (string, optional): New priority
- `status` (string, optional): New status (`open`, `in-progress`, `completed`, `cancelled`)
- `assignee` (string, optional): New assignee
- `dueDate` (string, optional): New due date

**Example:**

```json
{
  "actionId": "ACT-2025-001",
  "status": "in-progress",
  "description": "Material specifications reviewed, awaiting supplier response"
}
```

### Close Action

**Tool:** `babtec_close_action`

Close an action. Requires `write:actions` permission.

**Parameters:**

- `actionId` (string, required): Action ID
- `resolution` (string, optional): Resolution notes

**Example:**

```json
{
  "actionId": "ACT-2025-001",
  "resolution": "Material specifications updated. Supplier notified."
}
```

### List Actions

**Tool:** `babtec_get_action_list`

List actions with optional filters.

**Parameters:**

- `status` (string, optional): Filter by status
- `assignee` (string, optional): Filter by assignee
- `priority` (string, optional): Filter by priority
- `limit` (number, optional): Maximum results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**

```json
{
  "status": "open",
  "priority": "high",
  "limit": 50
}
```

## Audits

Audit tools manage audit findings and track audit status.

### Create Audit Finding

**Tool:** `babtec_create_audit_finding`

Create a new audit finding. Requires `write:audits` permission.

**Parameters:**

- `auditId` (string, required): Audit ID
- `finding` (string, required): Finding description
- `severity` (string, required): Severity level (`minor`, `major`, `critical`)
- `description` (string, optional): Detailed description
- `evidence` (string, optional): Evidence or reference

**Example:**

```json
{
  "auditId": "AUDIT-2025-001",
  "finding": "Missing calibration certificate",
  "severity": "major",
  "description": "Measurement device DEV-001 lacks current calibration certificate",
  "evidence": "Audit checklist item 3.2"
}
```

### Update Audit Finding

**Tool:** `babtec_update_audit_finding`

Update an existing audit finding. Requires `write:audits` permission.

**Parameters:**

- `findingId` (string, required): Finding ID
- `finding` (string, optional): Updated finding description
- `severity` (string, optional): Updated severity
- `status` (string, optional): Status (`open`, `in-progress`, `resolved`, `closed`)
- `description` (string, optional): Updated description
- `evidence` (string, optional): Updated evidence

**Example:**

```json
{
  "findingId": "FIND-2025-001",
  "status": "resolved",
  "description": "Calibration certificate obtained and verified"
}
```

### Get Audit Status

**Tool:** `babtec_get_audit_status`

Get audit status and all findings.

**Parameters:**

- `auditId` (string, required): Audit ID

**Response:**

Returns audit information including:
- Audit metadata
- All findings with status
- Overall audit status
- Timeline

## System Tools

### Health Check

**Tool:** `babtec_health_check`

Check the health status of the MCP server and Babtec connections. No permissions required.

**Parameters:** None

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "server": {
    "uptime": 3600,
    "version": "1.0.0"
  },
  "babtec": {
    "endpoints": [
      {
        "name": "babtecq-rest",
        "status": "connected",
        "circuitBreaker": "closed",
        "version": "v2"
      }
    ]
  },
  "audit": {
    "enabled": true,
    "logPath": "./audit-logs",
    "status": "operational"
  },
  "tools": {
    "registered": 18,
    "status": "operational"
  }
}
```

**Status Values:**

- `healthy`: All systems operational
- `degraded`: Some systems have issues but server is functional
- `unhealthy`: Critical systems are down

### Query Audit Logs

**Tool:** `babtec_query_audit_logs`

Query audit logs with filters. Requires `read:audit` permission (admin only).

**Parameters:**

- `startDate` (string, optional): Start date (ISO 8601)
- `endDate` (string, optional): End date (ISO 8601)
- `userId` (string, optional): Filter by user ID
- `tool` (string, optional): Filter by tool name
- `operation` (string, optional): Filter by operation (`read`, `write`)
- `entityType` (string, optional): Filter by entity type
- `entityId` (string, optional): Filter by entity ID
- `limit` (number, optional): Maximum results (1-1000, default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**

```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "operation": "write",
  "limit": 200
}
```

## Error Handling

### Error Codes

The server returns standard error codes:

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BABTEC_API_ERROR`: Babtec API error
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error

### Common Errors

**Permission Denied:**

```json
{
  "error": "AUTHORIZATION_ERROR",
  "message": "Missing required permission: write:actions"
}
```

**Resource Not Found:**

```json
{
  "error": "NOT_FOUND",
  "message": "Inspection plan with ID \"TP-999\" not found"
}
```

**Validation Error:**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input: status must be one of: pending, in-progress, completed, rejected"
}
```

### Retry Logic

The server automatically retries failed API calls with exponential backoff. If an operation fails, wait a moment and try again. Persistent failures indicate a system issue.

## Best Practices

### Searching

- Use specific filters to reduce result sets
- Use pagination (`limit` and `offset`) for large result sets
- Combine multiple filters for precise searches

### Write Operations

- Always verify data before submitting write operations
- Include meaningful comments when updating status
- Check permissions before attempting write operations

### Performance

- Use appropriate `limit` values (20-50 for most searches)
- Avoid very large date ranges in searches
- Use health check to verify system status before bulk operations

### Security

- Never share credentials or tokens
- Use appropriate roles with minimal required permissions
- Review audit logs regularly for suspicious activity

### Error Recovery

- Check error messages for specific guidance
- Verify input data format and required fields
- Use health check to diagnose system issues
- Contact administrator for persistent errors

---

**Need Help?**

- See [Administrator Manual](ADMINISTRATOR-MANUAL.md) for configuration and deployment
- See [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
- Contact your system administrator for permission and access issues
