import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import logger from './logger.js';

export class BabtecError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'BabtecError';
  }
}

export class ValidationError extends BabtecError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends BabtecError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends BabtecError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends BabtecError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID "${id}" not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

export class BabtecAPIError extends BabtecError {
  constructor(
    message: string,
    statusCode: number,
    public readonly apiErrorCode?: string,
    details?: unknown
  ) {
    super(message, 'BABTEC_API_ERROR', statusCode, details);
    this.name = 'BabtecAPIError';
  }
}

export class RateLimitError extends BabtecError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_ERROR',
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'RateLimitError';
  }
}

export function handleError(error: unknown): McpError {
  logger.error('Error handled', { error });

  if (error instanceof McpError) {
    return error;
  }

  if (error instanceof BabtecError) {
    // Map Babtec errors to MCP errors
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return new McpError(ErrorCode.InvalidParams, error.message);
      case 'AUTHENTICATION_ERROR':
        return new McpError(ErrorCode.InvalidRequest, error.message);
      case 'AUTHORIZATION_ERROR':
        return new McpError(ErrorCode.InvalidRequest, error.message);
      case 'NOT_FOUND':
        return new McpError(ErrorCode.InvalidParams, error.message);
      case 'RATE_LIMIT_ERROR':
        return new McpError(ErrorCode.InvalidRequest, error.message);
      default:
        return new McpError(ErrorCode.InternalError, error.message);
    }
  }

  if (error instanceof Error) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  return new McpError(ErrorCode.InternalError, 'Unknown error occurred');
}

