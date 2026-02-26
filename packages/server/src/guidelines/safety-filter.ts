const DISALLOWED_PATTERNS = [
  /you (?:have|likely have|probably have|are diagnosed with)\s/i,
  /you (?:should|must|need to) (?:take|start|begin|use)\s+\w+\s*(?:medication|drug|prescription|pill)/i,
  /go to (?:the )?(?:ER|emergency room|hospital)\s*(?:immediately|now|right away)/i,
  /(?:prescribe|prescribing|prescription for)\s/i,
  /(?:diagnosed? (?:with|as))\s/i,
  /you are (?:suffering from|afflicted with)\s/i,
  /(?:start|begin|take) (?:this )?medication/i,
];

const REPLACEMENT_PHRASES: [RegExp, string][] = [
  [/you have\s+(\w+)/gi, 'your data shows signals sometimes associated with $1'],
  [/you should take/gi, 'you may wish to discuss with a clinician about'],
  [/go to the ER/gi, 'please contact a healthcare professional promptly'],
];

export function filterSafetyOutput(text: string): string {
  let filtered = text;

  // Check for disallowed patterns and rewrite
  for (const [pattern, replacement] of REPLACEMENT_PHRASES) {
    filtered = filtered.replace(pattern, replacement);
  }

  // Final check - if any disallowed pattern still matches, add a warning prefix
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(filtered)) {
      console.warn('Safety filter: Disallowed pattern found in output, stripping.');
      filtered = filtered.replace(pattern, '[content removed for safety]');
    }
  }

  return filtered;
}

export function isSafeOutput(text: string): boolean {
  return !DISALLOWED_PATTERNS.some((pattern) => pattern.test(text));
}
