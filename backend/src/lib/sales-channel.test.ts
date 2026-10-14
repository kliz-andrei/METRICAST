import { describe, expect, it } from 'vitest';
import { normalizeSalesChannel, salesChannelFilterValues } from './sales-channel.js';

describe('sales-channel normalization', () => {
  it('maps known display and delivery-provider values while preserving unknown values', () => {
    expect(normalizeSalesChannel(' Dine In ')).toBe('Dine In');
    expect(normalizeSalesChannel('take-out')).toBe('Takeout');
    expect(normalizeSalesChannel('FoodPanda')).toBe('Delivery');
    expect(normalizeSalesChannel(' grabfood ')).toBe('Delivery');
    expect(normalizeSalesChannel('Catering')).toBe('Catering');
  });

  it('expands the Delivery filter to its source channels without changing unknown filters', () => {
    expect(salesChannelFilterValues(['Delivery', 'Catering'])).toEqual([
      'Delivery',
      'Foodpanda',
      'Grabfood',
      'Catering',
    ]);
  });
});
