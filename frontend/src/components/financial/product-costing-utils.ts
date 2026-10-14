export type CostedProductRecord = {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number | null;
  category: { name: string };
};

export type CostStatusFilter = 'ALL' | 'MISSING' | 'CONFIGURED';

// Keep normalization aligned with the POS importer's sourceKey helper.
export const normalizeCatalogIdentityPart = (value: string) =>
  value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');

// POS imports identify a catalog product by category + product name. SKU is not
// part of that import key, so it remains a display/search attribute here.
export const importerProductIdentity = (product: Pick<CostedProductRecord, 'name' | 'category'>) =>
  `${normalizeCatalogIdentityPart(product.category.name)}::${normalizeCatalogIdentityPart(product.name)}`;

export const productRowsForCosting = (products: CostedProductRecord[]) =>
  [...products].sort((left, right) =>
    importerProductIdentity(left).localeCompare(importerProductIdentity(right))
    || (left.sku ?? '').localeCompare(right.sku ?? '')
    || left.id.localeCompare(right.id),
  );

export const filterCostingProducts = (
  products: CostedProductRecord[],
  search: string,
  status: CostStatusFilter,
) => {
  const term = search.trim().toLocaleLowerCase();
  return products.filter((product) => {
    const matchesStatus = status === 'ALL'
      || (status === 'MISSING' ? product.unitCost === null : product.unitCost !== null);
    const searchText = `${product.name} ${product.category.name} ${product.sku ?? ''}`.toLocaleLowerCase();
    return matchesStatus && (!term || searchText.includes(term));
  });
};
