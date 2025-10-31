import { describe, it, expect, test } from 'vitest';

test('basic math test', () => {
  expect(1 + 1).toBe(2);
});

describe('Simple Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should handle string equality', () => {
    expect('hello').toBe('hello');
  });
});
