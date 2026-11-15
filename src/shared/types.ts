// The data model. The rack is one JSON file (`rack.json`) in the rack folder; paint photos lie next to it in
// `paints/<paint id>/`, projects — in `projects/` (shared/projects.ts). Settings of the app (which rack, theme,
// language) live in the user data folder.
import type { Lang, LangSetting } from './i18n/core.ts';
import type { FolderNode } from './projects.ts';
import type { UpdateSettings } from './updates.ts';

export const PAINT_TYPES = ['acrylic', 'contrast', 'wash', 'ink', 'metallic', 'primer', 'varnish', 'technical', 'pigment', 'oil', 'air', 'other'] as const;
export type PaintType = (typeof PAINT_TYPES)[number];

// have — on the shelf; low — running out; out — used up; ordered — on its way; wanted — not bought yet.
export const PAINT_STATUSES = ['have', 'low', 'out', 'ordered', 'wanted'] as const;
export type PaintStatus = (typeof PAINT_STATUSES)[number];

export interface Paint {
  id: string;
  brand: string;
  // Series / range: Base, Layer, Model Color, Game Color, 3rd Gen…
  line: string;
  name: string;
  // Article / code on the bottle: 72.001, 21-04…
  code: string;
  // The colour as '#rrggbb', '' — not set.
  hex: string;
  type: PaintType;
  status: PaintStatus;
  // Bottles on the shelf (0 — not counted).
  count: number;
  // 0 — no rating, 1–5 stars.
  rating: number;
  price: number | null;
  store: string;
  // Purchase date 'YYYY-MM-DD', '' — unknown.
  bought: string;
  note: string;
  // File names in paints/<id>/; the first one is the cover.
  photos: string[];
  created: string;
  updated: string;
}

// A recipe: how a surface is painted (skin, red armour, rusty metal) — steps from primer to highlights. A step is one
// paint or a mix of several in parts.
export const STEP_KINDS = ['primer', 'base', 'wash', 'layer', 'highlight', 'edge', 'drybrush', 'glaze', 'varnish', 'other'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export interface StepPaint {
  paint: string;
  // Parts of the mix (1 — one part); a step of one paint ignores it.
  parts: number;
}

export interface RecipeStep {
  id: string;
  kind: StepKind;
  paints: StepPaint[];
  note: string;
}

export interface Recipe {
  id: string;
  name: string;
  note: string;
  steps: RecipeStep[];
  created: string;
  updated: string;
}

export interface Rack {
  version: 1;
  paints: Paint[];
  recipes: Recipe[];
}

export const THEMES = ['auto', 'dark', 'light', 'grey', 'workbench'] as const;
export type ThemeSetting = (typeof THEMES)[number];

export const PAINT_SORTS = ['name', 'brand', 'code', 'type', 'status', 'rating', 'color', 'created'] as const;
export type PaintSort = (typeof PAINT_SORTS)[number];

export interface Settings {
  // The rack folder; null — the default one (Documents/Potion Rack).
  rackPath: string | null;
  theme: ThemeSetting;
  language: LangSetting;
  paints: { view: 'grid' | 'list'; sort: PaintSort; desc: boolean };
  updates: UpdateSettings;
  // Sync with the phone (shared/sync.ts): off by default; the token is the key of the pairing.
  phone: { enabled: boolean; token: string; port: number; lastSync: string; device: string };
}

// Everything a window sees. Replaced as a whole after every change.
export interface AppState {
  rack: Rack;
  // <rack>/projects as a tree of groups and figures (front matter and image names; articles are read on demand).
  projects: FolderNode;
  rackPath: string;
  settings: Settings;
  lang: Lang;
  version: string;
  // The rack file could not be read (broken JSON): the app shows it and does not overwrite the file.
  error: string | null;
  // The phone server as it runs: null — off; link — what the QR code holds.
  phone: { port: number; hosts: string[]; link: string } | null;
}

export type RackAction =
  | { type: 'paint/add'; paint: Paint }
  | { type: 'paint/update'; id: string; patch: Partial<Omit<Paint, 'id' | 'created' | 'updated'>> }
  | { type: 'paint/remove'; id: string }
  | { type: 'recipe/add'; recipe: Recipe }
  | { type: 'recipe/update'; id: string; patch: Partial<Omit<Recipe, 'id' | 'created' | 'updated'>> }
  | { type: 'recipe/remove'; id: string };
