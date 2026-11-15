// The built-in catalog in the window: loaded on first use (a separate chunk of the build, ~600 KB).
import { flatten, type CatalogFile, type CatalogPaint } from '../../shared/catalog.ts';

export const catalog = $state<{ list: CatalogPaint[]; brands: string[]; source: CatalogFile['source'] | null }>({ list: [], brands: [], source: null });

let loading: Promise<void> | null = null;
export function loadCatalog() {
  loading ??= import('../../catalog/catalog.json').then((m) => {
    const file = (m.default ?? m) as unknown as CatalogFile;
    catalog.list = flatten(file);
    catalog.brands = file.brands.map((b) => b.name);
    catalog.source = file.source;
  });
  return loading;
}
