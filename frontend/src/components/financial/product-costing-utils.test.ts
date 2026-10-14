import { describe, expect, it } from 'vitest';
import {
  filterCostingProducts,
  importerProductIdentity,
  productRowsForCosting,
  type CostedProductRecord,
} from './product-costing-utils';

const product = (overrides: Partial<CostedProductRecord> = {}): CostedProductRecord => ({
  id: 'product-1',
  name: 'Bucket Light',
  sku: null,
  unitCost: 0,
  category: { name: 'Drinks' },
  ...overrides,
});

describe('Product Costing product rows', () => {
  it('keeps same-name products in different categories as separate records', () => {
    const rows = productRowsForCosting([
      product({ id: 'drinks', category: { name: 'Drinks' } }),
      product({ id: 'beer', category: { name: 'Beer' } }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toEqual(['beer', 'drinks']);
  });

  it('does not collapse distinct IDs with the same importer identity', () => {
    const first = product({ id: 'first', sku: 'SKU-1' });
    const second = product({ id: 'second', sku: 'SKU-2' });

    expect(importerProductIdentity(first)).toBe(importerProductIdentity(second));
    expect(productRowsForCosting([first, second])).toHaveLength(2);
  });

  it('keeps SKU out of the importer identity while retaining it for search', () => {
    const withSku = product({ sku: 'LIGHT-650' });
    const withoutSku = product({ id: 'without-sku', sku: null });

    expect(importerProductIdentity(withSku)).toBe(importerProductIdentity(withoutSku));
    expect(filterCostingProducts([withSku, withoutSku], 'light-650', 'ALL')).toEqual([withSku]);
  });

  it('treats only null costs as missing and keeps zero-cost products configured', () => {
    const missing = product({ id: 'missing', unitCost: null });
    const zero = product({ id: 'zero', unitCost: 0 });
    const configured = product({ id: 'configured', unitCost: 125 });

    expect(filterCostingProducts([missing, zero, configured], '', 'MISSING').map((row) => row.id)).toEqual(['missing']);
    expect(filterCostingProducts([missing, zero, configured], '', 'CONFIGURED').map((row) => row.id)).toEqual(['zero', 'configured']);
  });

  it('combines the search and status filters and reports the matching row count', () => {
    const products = [
      product({ id: 'missing-drinks', unitCost: null }),
      product({ id: 'configured-drinks', unitCost: 0, sku: 'LIGHT-650' }),
      product({ id: 'configured-beer', category: { name: 'Beer' }, unitCost: 227 }),
    ];

    expect(filterCostingProducts(products, 'drinks', 'MISSING').map((row) => row.id)).toEqual(['missing-drinks']);
    expect(filterCostingProducts(products, 'light-650', 'CONFIGURED')).toHaveLength(1);
  });
});
