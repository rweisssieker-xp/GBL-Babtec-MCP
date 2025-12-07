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

The Babtec MCP Server provides a Model Context Protocol (MCP) interface to interact with Babtec quality management systems. This server enables AI assistants and automation tools to read and write quality data, manage inspection processes, handle complaints, and track quality actions.

### What is MCP?

Model Context Protocol (MCP) is a standardized protocol that allows AI assistants to interact with external systems through tools. Each tool represents a specific operation you can perform on the Babtec system.

### Key Features

- **18 MCP Tools** covering all major quality management operations
- **Read and Write Operations** for inspection plans, lots, complaints, actions, and audits
- **Role-Based Access Control** ensuring secure access to sensitive operations
- **Audit Logging** for compliance with ISO 9001 and IATF 16949
- **Automatic Retry Logic** for reliable operations
- **Health Monitoring** to track system status

## Getting Started

### Prerequisites

- Access to a Babtec quality management system (BabtecQ or BabtecQube)
- Valid credentials (username/password or API token)
- MCP-compatible client (Claude Desktop, Cursor, or custom MCP client)

### Basic Concepts

**Tools:** Each MCP tool represents a specific operation. Tools have names like `babtec_search_testplan` or `babtec_create_action`.

**Permissions:** Your access to tools depends on your assigned roles:
- `MCP_Read`: Read-only access to all data
- `MCP_QM_Write`: Read access + write access to actions and complaints
- `MCP_Production_Write`: Read access + write access to inspection lots
- `MCP_Audit_Write`: Read access + write access to audit findings
- `MCP_Admin`: Full access including audit log queries

**Operations:**
- **Read Operations:** Retrieve data without modifying the system
- **Write Operations:** Create, update, or modify data (requires appropriate permissions)

## MCP Tools Overview

The server provides 18 tools organized into categories:

### Inspection Plans (2 tools)
- `babtec_search_testplan` - Search for inspection plans
- `babtec_get_testplan` - Get detailed inspection plan

### Inspection Lots (3 tools)
- `babtec_search_lot` - Search for inspection lots
- `babtec_get_lot_results` - Get inspection results
- `babtec_set_lot_status` - Update lot status (Write)

### Complaints/8D (4 tools)
- `babtec_search_claim` - Search for complaints
- `babtec_get_claim` - Get complaint details
- `babtec_update_claim_step` - Update 8D step (Write)
- `babtec_add_claim_document` - Attach document (Write)

### Quality Actions (4 tools)
- `babtec_create_action` - Create new action (Write)
- `babtec_update_action` - Update action (Write)
- `babtec_close_action` - Close action (Write)
- `babtec_get_action_list` - List actions with filters

### Audits (3 tools)
- `babtec_create_audit_finding` - Create finding (Write)
- `babtec_update_audit_finding` - Update finding (Write)
- `babtec_get_audit_status` - Get audit status

### System Tools (2 tools)
- `babtec_health_check` - Check system health
- `babtec_query_audit_logs` - Query audit logs (Admin only)

## Inspection Plans

Inspection plans (Prüfpläne) define what characteristics need to be inspected for a part.

### Searching for Inspection Plans

Use `babtec_search_testplan` to find inspection plans:

**Example Request:**
```json
{
  "query": "bearing",
  "partNumber": "BEAR-12345",
  "status": "active",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (optional): Text search across plan names and descriptions
- `partNumber` (optional): Filter by specific part number
- `status` (optional): Filter by status (`active`, `inactive`, `draft`)
- `limit` (optional): Maximum results (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "TP-001",
      "name": "Bearing Inspection Plan",
      "partNumber": "BEAR-12345",
      "status": "active",
      "version": "1.0"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Getting Inspection Plan Details

Use `babtec_get_testplan` to retrieve complete plan information:

**Example Request:**
```json
{
  "testplanId": "TP-001"
}
```

**Response includes:**
- Plan metadata (name, version, status)
- All characteristics to be inspected
- Measurement specifications
- Tolerance ranges
- Sampling rules

## Inspection Lots

Inspection lots (Prüflose) represent batches of parts being inspected.

### Searching for Lots

Use `babtec_search_lot` to find inspection lots:

**Example Request:**
```json
{
  "lotNumber": "LOT-2025-001",
  "partNumber": "BEAR-12345",
  "status": "completed",
  "dateFrom": "2025-01-01T00:00:00Z",
  "dateTo": "2025-01-31T23:59:59Z",
  "limit": 20
}
```

**Parameters:**
- `lotNumber` (optional): Specific lot number
- `partNumber` (optional): Filter by part number
- `status` (optional): `pending`, `in-progress`, `completed`, `rejected`
- `dateFrom` (optional): Start date (ISO 8601)
- `dateTo` (optional): End date (ISO 8601)
- `limit` (optional): Max results (1-100)
- `offset` (optional): Pagination offset

### Getting Inspection Results

Use `babtec_get_lot_results` to retrieve all measurements:

**Example Request:**
```json
{
  "lotId": "LOT-2025-001"
}
```

**Response includes:**
- All measured values
- Tolerance violations
- Pass/fail status per characteristic
- Statistical data

### Updating Lot Status

Use `babtec_set_lot_status` to change lot status (requires `MCP_Production_Write` role):

**Example Request:**
```json
{
  "lotId": "LOT-2025-001",
  "status": "completed",
  "comment": "All inspections passed"
}
```

**Status Values:**
- `pending`: Lot created but not yet inspected
- `in-progress`: Inspection currently in progress
- `completed`: Inspection finished successfully
- `rejected`: Lot failed inspection

## Complaints and 8D Process

Complaints (Reklamationen) are managed through the 8D problem-solving process.

### Searching for Complaints

Use `babtec_search_claim` to find complaints:

**Example Request:**
```json
{
  "claimNumber": "CLAIM-2025-001",
  "supplier": "Supplier ABC",
  "status": "open",
  "dateFrom": "2025-01-01T00:00:00Z"
}
```

**Parameters:**
- `claimNumber` (optional): Specific claim number
- `supplier` (optional): Filter by supplier name
- `status` (optional): `open`, `in-progress`, `closed`, `escalated`
- `dateFrom` / `dateTo` (optional): Date range filter
- `limit` / `offset` (optional): Pagination

### Getting Complaint Details

Use `babtec_get_claim` to retrieve complete complaint information:

**Example Request:**
```json
{
  "claimId": "CLAIM-2025-001"
}
```

**Response includes:**
- Complaint metadata
- 8D step status (D1 through D8)
- Related documents
- Action items
- Timeline

### Updating 8D Steps

The 8D process consists of 8 steps:
- **D1:** Team Formation
- **D2:** Problem Description
- **D3:** Interim Containment Actions
- **D4:** Root Cause Analysis
- **D5:** Permanent Corrective Actions
- **D6:** Implementation and Validation
- **D7:** Prevention
- **D8:** Team Recognition

Use `babtec_update_claim_step` to update a step (requires `MCP_QM_Write` role):

**Example Request:**
```json
{
  "claimId": "CLAIM-2025-001",
  "step": "D4",
  "data": {
    "rootCause": "Material defect in batch XYZ",
    "analysisMethod": "5-Why Analysis",
    "findings": "Supplier used incorrect material specification"
  }
}
```

### Attaching Documents

Use `babtec_add_claim_document` to attach files (requires `MCP_QM_Write` role):

**Example Request:**
```json
{
  "claimId": "CLAIM-2025-001",
  "documentName": "Root Cause Analysis Report",
  "documentType": "report",
  "documentContent": "base64-encoded-content",
  "mimeType": "application/pdf"
}
```

## Quality Actions

Quality actions track tasks that need to be completed to address quality issues.

### Creating Actions

Use `babtec_create_action` to create a new action (requires `MCP_QM_Write` role):

**Example Request:**
```json
{
  "title": "Review material specification",
  "description": "Verify material spec matches supplier requirements",
  "priority": "high",
  "assignee": "user-123",
  "dueDate": "2025-02-15T00:00:00Z",
  "relatedEntityType": "complaint",
  "relatedEntityId": "CLAIM-2025-001"
}
```

**Priority Levels:**
- `low`: Low priority, can be scheduled later
- `medium`: Normal priority (default)
- `high`: Urgent, should be addressed soon
- `critical`: Immediate attention required

### Updating Actions

Use `babtec_update_action` to modify an action:

**Example Request:**
```json
{
  "actionId": "ACT-001",
  "status": "in-progress",
  "description": "Updated description with progress notes"
}
```

**Status Values:**
- `open`: Action created but not started
- `in-progress`: Work in progress
- `completed`: Action finished
- `cancelled`: Action cancelled

### Closing Actions

Use `babtec_close_action` to mark an action as completed:

**Example Request:**
```json
{
  "actionId": "ACT-001",
  "resolution": "Material specification verified and updated"
}
```

### Listing Actions

Use `babtec_get_action_list` to search for actions:

**Example Request:**
```json
{
  "status": "open",
  "assignee": "user-123",
  "priority": "high",
  "limit": 50
}
```

## Audits

Audits track quality system compliance and findings.

### Creating Audit Findings

Use `babtec_create_audit_finding` to record a finding (requires `MCP_Audit_Write` role):

**Example Request:**
```json
{
  "auditId": "AUDIT-2025-001",
  "finding": "Missing calibration records",
  "severity": "major",
  "description": "Three measurement devices lack current calibration certificates",
  "evidence": "Device IDs: DEV-001, DEV-002, DEV-003"
}
```

**Severity Levels:**
- `minor`: Small issue, low impact
- `major`: Significant issue requiring attention
- `critical`: Serious compliance issue

### Updating Findings

Use `babtec_update_audit_finding` to update finding status:

**Example Request:**
```json
{
  "findingId": "FIND-001",
  "status": "resolved",
  "description": "Calibration certificates obtained and verified"
}
```

**Status Values:**
- `open`: Finding identified
- `in-progress`: Corrective action in progress
- `resolved`: Issue resolved
- `closed`: Finding closed after verification

### Getting Audit Status

Use `babtec_get_audit_status` to retrieve audit information:

**Example Request:**
```json
{
  "auditId": "AUDIT-2025-001"
}
```

## System Tools

### Health Check

Use `babtec_health_check` to monitor system status:

**Example Request:**
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

**Status Values:**
- `healthy`: All systems operational
- `degraded`: Some systems have issues but core functionality works
- `unhealthy`: Critical systems unavailable

### Query Audit Logs

Use `babtec_query_audit_logs` to search audit logs (requires `MCP_Admin` role):

**Example Request:**
```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "userId": "user-123",
  "tool": "babtec_create_action",
  "operation": "write",
  "limit": 100
}
```

## Common Workflows

### Workflow 1: Inspecting a New Lot

1. Search for the inspection plan: `babtec_search_testplan` with part number
2. Get plan details: `babtec_get_testplan` to see required characteristics
3. Create lot in Babtec (via Babtec UI or API)
4. Search for lot: `babtec_search_lot` to find the new lot
5. Perform inspections (via Babtec UI or measurement equipment)
6. Get results: `babtec_get_lot_results` to review measurements
7. Update status: `babtec_set_lot_status` to mark as completed

### Workflow 2: Handling a Complaint

1. Search for complaint: `babtec_search_claim` to find the complaint
2. Get details: `babtec_get_claim` to see current 8D status
3. Update D2 (Problem Description): `babtec_update_claim_step`
4. Create actions: `babtec_create_action` for each required task
5. Update D4 (Root Cause): `babtec_update_claim_step` with analysis
6. Attach documents: `babtec_add_claim_document` for evidence
7. Track actions: `babtec_get_action_list` to monitor progress
8. Update D6 (Implementation): `babtec_update_claim_step` when actions complete

### Workflow 3: Conducting an Audit

1. Create findings: `babtec_create_audit_finding` for each issue found
2. Get audit status: `babtec_get_audit_status` to review all findings
3. Create actions: `babtec_create_action` for each corrective action
4. Update findings: `babtec_update_audit_finding` as actions progress
5. Close findings: `babtec_update_audit_finding` with status "resolved"

## Error Handling

### Common Error Codes

**VALIDATION_ERROR (400)**
- Input data doesn't match required format
- Missing required fields
- Invalid enum values

**AUTHENTICATION_ERROR (401)**
- Invalid credentials
- Token expired
- Solution: Check credentials or refresh token

**AUTHORIZATION_ERROR (403)**
- Insufficient permissions for operation
- Solution: Request appropriate role from administrator

**NOT_FOUND (404)**
- Requested resource doesn't exist
- Invalid ID provided
- Solution: Verify ID and try search operation first

**BABTEC_API_ERROR (500+)**
- Error from Babtec system
- Check error details for specific issue
- Solution: Verify Babtec system status

**RATE_LIMIT_ERROR (429)**
- Too many requests in time window
- Solution: Wait before retrying (check `retryAfter` in response)

### Best Practices for Error Handling

1. **Always validate inputs** before calling tools
2. **Check permissions** - verify you have required role
3. **Handle retries** - transient errors may resolve on retry
4. **Log errors** - include context for troubleshooting
5. **Check health status** - if errors persist, verify system health

## Best Practices

### Security

- **Never share credentials** - use environment variables or secure configuration
- **Use least privilege** - request only the roles you need
- **Review audit logs** - regularly check for unauthorized access
- **Rotate credentials** - change passwords/tokens regularly

### Performance

- **Use pagination** - set appropriate `limit` values (20-50 is optimal)
- **Filter early** - use search filters to reduce result sets
- **Cache results** - store frequently accessed data locally
- **Batch operations** - group related operations when possible

### Data Quality

- **Validate before write** - ensure data is correct before submitting
- **Use consistent formats** - follow ISO 8601 for dates, standard formats for IDs
- **Include context** - add comments and descriptions to explain changes
- **Link related entities** - use `relatedEntityType` and `relatedEntityId` when creating actions

### Compliance

- **All write operations are logged** - audit trail is automatic
- **Review audit logs** - regularly check for compliance issues
- **Document changes** - include clear descriptions in updates
- **Follow 8D process** - complete all steps in order for complaints

### Troubleshooting

1. **Check health status** first: `babtec_health_check`
2. **Verify permissions** - ensure you have required role
3. **Check error messages** - they often indicate the specific issue
4. **Review audit logs** - see what operations succeeded/failed
5. **Contact administrator** - for persistent issues or permission problems

## Additional Resources

- **API Reference:** See `docs/API.md` for detailed tool specifications
- **Configuration Guide:** See `docs/ADMINISTRATOR-MANUAL.md` for setup
- **Troubleshooting:** See `docs/TROUBLESHOOTING.md` for common issues
- **Architecture:** See `docs/ARCHITECTURE.md` for system design

## Support

For issues or questions:
1. Check this manual and troubleshooting guide
2. Review audit logs for error context
3. Contact your system administrator
4. Refer to Babtec system documentation

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-01-27
