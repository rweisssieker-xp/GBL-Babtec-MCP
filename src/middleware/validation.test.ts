import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateInput, validateRequired } from './validation.js';
import { ValidationError } from '../utils/errors.js';

describe('Validation', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
  });

  it('should validate valid input', () => {
    const result = validateInput(testSchema, { name: 'Test', age: 25 });
    expect(result).toEqual({ name: 'Test', age: 25 });
  });

  it('should throw ValidationError for invalid input', () => {
    expect(() => {
      validateInput(testSchema, { name: 'Test', age: -5 });
    }).toThrow(ValidationError);
  });

  it('should validate required field', () => {
    const value = validateRequired('test', 'fieldName');
    expect(value).toBe('test');
  });

  it('should throw ValidationError for missing required field', () => {
    expect(() => {
      validateRequired(undefined, 'fieldName');
    }).toThrow(ValidationError);
  });
});

