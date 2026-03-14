import { describe, expect, it } from 'vitest';
import { normalizeFinishReason } from './do-stream-step.js';

describe('normalizeFinishReason', () => {
  it('should extract "stop" from V3 finish reason', () => {
    expect(normalizeFinishReason({ unified: 'stop', raw: 'stop' })).toBe(
      'stop',
    );
  });

  it('should extract "tool-calls" from V3 finish reason', () => {
    expect(
      normalizeFinishReason({ unified: 'tool-calls', raw: 'tool_use' }),
    ).toBe('tool-calls');
  });

  it('should extract "length" from V3 finish reason', () => {
    expect(normalizeFinishReason({ unified: 'length', raw: 'length' })).toBe(
      'length',
    );
  });

  it('should extract "content-filter" from V3 finish reason', () => {
    expect(
      normalizeFinishReason({
        unified: 'content-filter',
        raw: 'content_filter',
      }),
    ).toBe('content-filter');
  });

  it('should extract "error" from V3 finish reason', () => {
    expect(normalizeFinishReason({ unified: 'error', raw: 'error' })).toBe(
      'error',
    );
  });

  it('should extract "other" from V3 finish reason', () => {
    expect(normalizeFinishReason({ unified: 'other', raw: undefined })).toBe(
      'other',
    );
  });

  it('should return "other" for undefined', () => {
    expect(normalizeFinishReason(undefined)).toBe('other');
  });
});
