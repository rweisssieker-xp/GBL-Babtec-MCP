import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn('Validation failed', { issues });
      throw new ValidationError('Input validation failed', issues);
    }
    throw error;
  }
}

export function validateRequired<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new ValidationError(`Required field missing: ${fieldName}`);
  }
  return value;
}

