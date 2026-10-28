import { describe, expect, it } from 'vitest';
import { forecastAccuracyFromMape } from './forecast-accuracy.js';

describe('forecastAccuracyFromMape', () => {
  it.each([
    [7.63, 92.37],
    [0, 100],
    [100, 0],
    [125.4, 0]
  ])('returns the non-negative complement for MAPE %s', (mape, expected) => {
    expect(forecastAccuracyFromMape(mape)).toBe(expected);
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, -1, '7.63'])(
    'returns null for an invalid MAPE value: %s',
    (mape) => {
      expect(forecastAccuracyFromMape(mape)).toBeNull();
    }
  );
});
