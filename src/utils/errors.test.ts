import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BabtecAPIError,
  RateLimitError,
  handleError,
} from './errors.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

describe('Error Handling', () => {
  it('should create ValidationError', () => {
    const error = new ValidationError('Invalid input', { field: 'test' });
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
  });

  it('should create AuthenticationError', () => {
    const error = new AuthenticationError();
    expect(error.message).toBe('Authentication failed');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.statusCode).toBe(401);
  });

  it('should create AuthorizationError', () => {
    const error = new AuthorizationError();
    expect(error.message).toBe('Insufficient permissions');
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
  });

  it('should create NotFoundError with ID', () => {
    const error = new NotFoundError('Resource', '123');
    expect(error.message).toBe('Resource with ID "123" not found');
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should handle ValidationError and convert to MCP error', () => {
    const error = new ValidationError('Invalid input');
    const mcpError = handleError(error);
    expect(mcpError).toBeInstanceOf(McpError);
    expect(mcpError.code).toBe(ErrorCode.InvalidParams);
  });

  it('should handle generic Error', () => {
    const error = new Error('Generic error');
    const mcpError = handleError(error);
    expect(mcpError).toBeInstanceOf(McpError);
    expect(mcpError.code).toBe(ErrorCode.InternalError);
  });
});

