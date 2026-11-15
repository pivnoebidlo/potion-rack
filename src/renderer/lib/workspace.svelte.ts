// Which module is open (remembered by the window between launches).
export const MODULES = ['paints', 'projects', 'recipes', 'mixer', 'shopping', 'stats'] as const;
export type ModuleId = (typeof MODULES)[number];

const saved = (() => {
  try {
    return localStorage.getItem('module');
  } catch {
    return null;
  }
})();

export const workspace = $state({ module: (MODULES.includes(saved as ModuleId) ? saved : 'paints') as ModuleId });

export function openModule(id: ModuleId) {
  workspace.module = id;
  try {
    localStorage.setItem('module', id);
  } catch {
    /* not remembered */
  }
}
