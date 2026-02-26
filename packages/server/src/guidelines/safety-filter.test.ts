import { describe, it, expect } from 'vitest';
import { filterSafetyOutput, isSafeOutput } from './safety-filter';

describe('filterSafetyOutput', () => {
  it('filters "you have diabetes"', () => {
    const result = filterSafetyOutput('You have diabetes.');
    expect(result).toContain('your data shows signals sometimes associated with diabetes');
    expect(result.toLowerCase()).not.toContain('you have');
  });

  it('filters "you should take medication"', () => {
    const result = filterSafetyOutput('You should take medication.');
    expect(result).toContain('you may wish to discuss with a clinician about');
  });

  it('filters "go to the ER immediately"', () => {
    const result = filterSafetyOutput('Go to the ER immediately.');
    expect(result).toContain('please contact a healthcare professional promptly');
  });

  it('passes through "discuss with a clinician"', () => {
    const text = 'You may want to discuss with a clinician about these results.';
    const result = filterSafetyOutput(text);
    expect(result).toBe(text);
  });

  it('passes through "your data shows signals sometimes associated with"', () => {
    const text = 'Your data shows signals sometimes associated with elevated glucose.';
    const result = filterSafetyOutput(text);
    expect(result).toBe(text);
  });
});

describe('isSafeOutput', () => {
  it('returns true for safe text', () => {
    expect(isSafeOutput('Please discuss with a clinician about these results.')).toBe(true);
  });

  it('returns false for unsafe text', () => {
    expect(isSafeOutput('You have diabetes.')).toBe(false);
  });
});