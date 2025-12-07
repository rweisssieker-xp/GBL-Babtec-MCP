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
10. [Common Workflows](#common-workflows)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)

## Introduction

The Babtec MCP Server provides a standardized interface for AI assistants and LLM clients to interact with Babtec quality management systems. This manual explains how to use all available MCP tools to read and write quality data.

### What is MCP?

Model Context Protocol (MCP) is a protocol that enables AI assistants to securely access and interact with external systems. The Babtec MCP Server exposes 18 tools that cover inspection plans, lots, complaints, actions, and audits.

### Key Features

- **Read Operations**: Search and retrieve quality data
- **Write Operations**: Create and update quality records
- **Role-Based Access**: Permissions control what you can do
- **Audit Logging**: All operations are logged for compliance
- **Error Handling**: Clear error messages and retry logic

## Getting Started

### Prerequisites

- Access to a Babtec quality management system
- MCP client configured to connect to the server
- Appropriate user roles assigned

### Connecting to the Server

Your MCP client handles the connection. Once connected, you can call any of the available tools. The server automatically handles authentication and authorization based on your user context.

### Understanding Permissions

Each tool requires specific permissions:

- **Read permissions**: `read:testplans`, `read:lots`, `read:complaints`, `read:actions`, `read:audits`
- **Write permissions**: `write:actions`, `write:complaints`, `write:lots`, `write:audits`
- **Admin permissions**: `read:audit` (for audit log queries)

If you don't have the required permission, the tool returns an authorization error.

## MCP Tools Overview

The server provides 18 tools organized into categories:

### Inspection Plans (2 tools)
- `babtec_search_testplan` - Search for inspection plans
- `babtec_get_testplan` - Get inspection plan details

### Inspection Lots (3 tools)
- `babtec_search_lot` - Search for inspection lots
- `babtec_get_lot_results` - Get inspection results
- `babtec_set_lot_status` - Set lot status (Write)

### Complaints/8D (4 tools)
- `babtec_search_claim` - Search for complaints
- `babtec_get_claim` - Get complaint details
- `babtec_update_claim_step` - Update 8D step (Write)
- `babtec_add_claim_document` - Attach document (Write)

### Quality Actions (4 tools)
- `babtec_create_action` - Create action (Write)
- `babtec_update_action` - Update action (Write)
- `babtec_close_action` - Close action (Write)
- `babtec_get_action_list` - List actions

### Audits (3 tools)
- `babtec_create_audit_finding` - Create finding (Write)
- `babtec_update_audit_finding` - Update finding (Write)
- `babtec_get_audit_status` - Get audit status

### System Tools (2 tools)
- `babtec_health_check` - Check server health
- `babtec_query_audit_logs` - Query audit logs (Admin)

## Inspection Plans

Inspection plans (Prüfpläne) define what characteristics to measure and their specifications.

### Search Inspection Plans

Use `babtec_search_testplan` to find inspection plans:

```json
{
  "query": "bearing",
  "partNumber": "BEAR-001",
  "status": "active",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (optional): Search text
- `partNumber` (optional): Filter by part number
- `status` (optional): `active`, `inactive`, or `draft`
- `limit` (optional): Max results (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "TP-001",
      "partNumber": "BEAR-001",
      "name": "Bearing Inspection Plan",
      "status": "active",
      "version": "1.0"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Get Inspection Plan Details

Use `babtec_get_testplan` to retrieve complete plan information:

```json
{
  "testplanId": "TP-001"
}
```

**Response includes:**
- Plan metadata (name, version, status)
- All characteristics with specifications
- Measurement methods
- Tolerance values
- Sampling plans

## Inspection Lots

Inspection lots (Prüflose) represent batches of parts being inspected.

### Search Inspection Lots

Use `babtec_search_lot` to find lots:

```json
{
  "lotNumber": "LOT-2025-001",
  "partNumber": "BEAR-001",
  "status": "completed",
  "dateFrom": "2025-01-01T00:00:00Z",
  "dateTo": "2025-01-31T23:59:59Z",
  "limit": 20,
  "offset": 0
}
```

**Status values:** `pending`, `in-progress`, `completed`, `rejected`

### Get Inspection Results

Use `babtec_get_lot_results` to retrieve all measurements:

```json
{
  "lotId": "LOT-001"
}
```

**Response includes:**
- Lot metadata
- All measurements per characteristic
- Tolerance violations
- Pass/fail status
- Statistical data

### Set Lot Status

Use `babtec_set_lot_status` to update lot status (requires `write:lots` permission):

```json
{
  "lotId": "LOT-001",
  "status": "completed",
  "comment": "All measurements within tolerance"
}
```

**Important:** Status changes are audit-logged and cannot be undone without proper authorization.

## Complaints and 8D Process

Complaints (Reklamationen) follow the 8D problem-solving process.

### Search Complaints

Use `babtec_search_claim` to find complaints:

```json
{
  "claimNumber": "CLAIM-001",
  "supplier": "Supplier ABC",
  "status": "in-progress",
  "dateFrom": "2025-01-01T00:00:00Z",
  "dateTo": "2025-01-31T23:59:59Z"
}
```

**Status values:** `open`, `in-progress`, `closed`, `escalated`

### Get Complaint Details

Use `babtec_get_claim` to retrieve complete complaint information:

```json
{
  "claimId": "CLAIM-001"
}
```

**Response includes:**
- Complaint metadata
- 8D step status (D1-D8)
- Current step details
- Related documents
- Timeline

### Update 8D Step

Use `babtec_update_claim_step` to update a specific 8D step (requires `write:complaints` permission):

```json
{
  "claimId": "CLAIM-001",
  "step": "D3",
  "data": {
    "rootCause": "Material hardness below specification",
    "analysis": "Metallurgical analysis confirmed...",
    "responsible": "John Doe"
  }
}
```

**8D Steps:**
- `D1`: Team formation
- `D2`: Problem description
- `D3`: Containment actions
- `D4`: Root cause analysis
- `D5`: Corrective actions
- `D6`: Implementation
- `D7`: Prevention
- `D8`: Closure

### Attach Document

Use `babtec_add_claim_document` to attach files (requires `write:complaints` permission):

```json
{
  "claimId": "CLAIM-001",
  "documentName": "Analysis Report.pdf",
  "documentType": "report",
  "documentContent": "base64-encoded-content",
  "mimeType": "application/pdf"
}
```

## Quality Actions

Quality actions track tasks and improvements in the quality management system.

### Create Action

Use `babtec_create_action` to create a new action (requires `write:actions` permission):

```json
{
  "title": "Review supplier quality process",
  "description": "Conduct audit of Supplier ABC quality processes",
  "priority": "high",
  "assignee": "user-123",
  "dueDate": "2025-02-15T00:00:00Z",
  "relatedEntityType": "complaint",
  "relatedEntityId": "CLAIM-001"
}
```

**Priority values:** `low`, `medium`, `high`, `critical`

### Update Action

Use `babtec_update_action` to modify an action (requires `write:actions` permission):

```json
{
  "actionId": "ACT-001",
  "status": "in-progress",
  "description": "Updated description",
  "priority": "critical"
}
```

**Status values:** `open`, `in-progress`, `completed`, `cancelled`

### Close Action

Use `babtec_close_action` to close an action (requires `write:actions` permission):

```json
{
  "actionId": "ACT-001",
  "resolution": "Action completed successfully. Supplier audit conducted."
}
```

**Note:** Closed actions cannot be reopened. Create a new action if follow-up is needed.

### List Actions

Use `babtec_get_action_list` to search for actions:

```json
{
  "status": "open",
  "assignee": "user-123",
  "priority": "high",
  "limit": 50,
  "offset": 0
}
```

## Audits

Audit findings track non-conformances and improvement opportunities.

### Create Audit Finding

Use `babtec_create_audit_finding` to create a finding (requires `write:audits` permission):

```json
{
  "auditId": "AUDIT-001",
  "finding": "Missing calibration records for measuring equipment",
  "severity": "major",
  "description": "Three measuring devices lack current calibration certificates",
  "evidence": "Equipment inventory dated 2025-01-15"
}
```

**Severity values:** `minor`, `major`, `critical`

### Update Audit Finding

Use `babtec_update_audit_finding` to update a finding (requires `write:audits` permission):

```json
{
  "findingId": "FIND-001",
  "status": "resolved",
  "description": "Updated with corrective action details"
}
```

**Status values:** `open`, `in-progress`, `resolved`, `closed`

### Get Audit Status

Use `babtec_get_audit_status` to retrieve audit information:

```json
{
  "auditId": "AUDIT-001"
}
```

**Response includes:**
- Audit metadata
- All findings with status
- Overall audit status
- Timeline

## System Tools

### Health Check

Use `babtec_health_check` to check server and connection status:

```json
{}
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T12:00:00Z",
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

**Status values:**
- `healthy`: All systems operational
- `degraded`: Some systems have issues but server is functional
- `unhealthy`: Critical systems unavailable

### Query Audit Logs

Use `babtec_query_audit_logs` to search audit logs (requires `read:audit` permission):

```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "userId": "user-123",
  "tool": "babtec_create_action",
  "operation": "write",
  "entityType": "action",
  "limit": 100,
  "offset": 0
}
```

## Common Workflows

### Workflow 1: Process Inspection Lot

1. Search for lot: `babtec_search_lot`
2. Get results: `babtec_get_lot_results`
3. Review measurements
4. Set status: `babtec_set_lot_status` (if authorized)

### Workflow 2: Handle Complaint

1. Search complaint: `babtec_search_claim`
2. Get details: `babtec_get_claim`
3. Update 8D step: `babtec_update_claim_step`
4. Attach documents: `babtec_add_claim_document` (as needed)
5. Create related actions: `babtec_create_action`

### Workflow 3: Manage Quality Actions

1. List open actions: `babtec_get_action_list`
2. Update progress: `babtec_update_action`
3. Close when complete: `babtec_close_action`

### Workflow 4: Conduct Audit

1. Create findings: `babtec_create_audit_finding`
2. Track resolution: `babtec_update_audit_finding`
3. Monitor status: `babtec_get_audit_status`

## Error Handling

### Error Types

**Validation Errors:**
- Missing required parameters
- Invalid parameter values
- Format errors (dates, IDs)

**Authorization Errors:**
- Insufficient permissions
- Role not assigned

**Not Found Errors:**
- Entity doesn't exist
- Invalid ID

**API Errors:**
- Babtec API unavailable
- Network issues
- Timeout

### Error Response Format

```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Missing required permission: write:actions"
  }
}
```

### Retry Logic

The server automatically retries failed API calls with exponential backoff. You don't need to implement retry logic in your client.

### Best Practices for Error Handling

1. **Check permissions first**: Verify you have required permissions before calling write operations
2. **Validate inputs**: Ensure all required parameters are provided and correctly formatted
3. **Handle not found**: Check if entities exist before updating
4. **Monitor health**: Use `babtec_health_check` to verify server status
5. **Review audit logs**: Check audit logs if operations fail unexpectedly

## Best Practices

### General Guidelines

1. **Use pagination**: Always specify `limit` and use `offset` for large result sets
2. **Filter effectively**: Use search filters to reduce result sets
3. **Check before write**: Read entities before updating to understand current state
4. **Provide context**: Include comments and descriptions in write operations
5. **Monitor health**: Regularly check server health status

### Security

1. **Never log credentials**: Credentials are handled by the server
2. **Respect permissions**: Only attempt operations you're authorized for
3. **Audit awareness**: All write operations are logged
4. **Error messages**: Don't expose sensitive data in error handling

### Performance

1. **Batch operations**: When possible, process multiple items in sequence
2. **Cache results**: Cache read results when appropriate
3. **Limit result sets**: Use appropriate `limit` values
4. **Filter early**: Apply filters in search operations

### Data Quality

1. **Validate before write**: Ensure data quality before write operations
2. **Complete information**: Provide all required fields
3. **Consistent formats**: Use consistent date formats (ISO 8601)
4. **Meaningful descriptions**: Include clear descriptions in write operations

---

**Need Help?** See the [Troubleshooting Guide](TROUBLESHOOTING.md) or [Administrator Manual](ADMINISTRATOR-MANUAL.md) for more information.
