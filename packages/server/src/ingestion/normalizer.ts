import { convertUnit, STANDARD_UNITS } from '@pm-valet/shared';

export function normalizeObservations(observations: any[]): any[] {
  return observations
    .filter((obs) => !isNaN(obs.value) && obs.value !== null)
    .map((obs) => {
      const normalized = { ...obs };

      // Unit normalization
      const standardUnit = STANDARD_UNITS[obs.code];
      if (standardUnit && obs.unit && obs.unit !== standardUnit) {
        try {
          normalized.rawReference = normalized.rawReference || `${obs.value} ${obs.unit}`;
          normalized.value = convertUnit(obs.value, obs.unit, standardUnit);
          normalized.unit = standardUnit;
        } catch {
          // Keep original if conversion not found
        }
      }

      // Ensure timestamp is a Date
      if (typeof normalized.timestamp === 'string') {
        normalized.timestamp = new Date(normalized.timestamp);
      }

      return normalized;
    });
}
