// What the projects module shows: the selected figure or group, the article mode, open groups of the tree.
import { allFigures, baseName, findFolder, isWithin, joinPath, parentOf, type Figure, type FigureStatus, type FolderNode } from '../../shared/projects.ts';
import { confirm, promptText } from '../lib/confirm.svelte.ts';
import { flushArticle } from './article.svelte.ts';
import { timer } from './timer.svelte.ts';
import { t } from '../lib/i18n.svelte.ts';
import { store } from '../lib/store.svelte.ts';
import { openModule } from '../lib/workspace.svelte.ts';

const load = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
  } catch {
    return [];
  }
};

export const pview = $state({
  // A figure or a group ('' — all projects).
  selected: '',
  mode: 'read' as 'read' | 'edit' | 'progress',
  expanded: load('projects.expanded'),
  search: '',
});

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem('projects.expanded', JSON.stringify(pview.expanded));
    } catch {
      /* not remembered */
    }
  });
});

export const tree = (): FolderNode => store.state.projects;
export const figureAt = (path: string): Figure | null => allFigures(tree()).find((f) => f.path === path) ?? null;
export const selectedFigure = () => (pview.selected ? figureAt(pview.selected) : null);
// The group in view: the selected one, or the group of the selected figure.
export const currentFolder = () => {
  const f = selectedFigure();
  return f ? parentOf(f.path) : findFolder(tree(), pview.selected) ? pview.selected : '';
};

export function reveal(path: string) {
  const parts = path.split('/');
  for (let i = 1; i < parts.length; i++) {
    const p = parts.slice(0, i).join('/');
    if (!pview.expanded.includes(p)) pview.expanded.push(p);
  }
}

export function select(path: string) {
  reveal(path);
  pview.selected = path;
}

// From another module (a paint's «Used in projects»).
export function openFigure(path: string) {
  openModule('projects');
  pview.mode = 'read';
  select(path);
}

export async function newFigure(parent = currentFolder()) {
  const name = await promptText(t('projects.figureName'));
  if (!name) return;
  const path = await window.api.createFigure(parent, name);
  if (path) {
    select(path);
    pview.mode = 'edit';
  }
}

export async function newFolder(parent = currentFolder()) {
  const name = await promptText(t('projects.folderName'));
  if (!name) return;
  const path = await window.api.createFolder(parent, name);
  if (path) {
    select(path);
    if (!pview.expanded.includes(path)) pview.expanded.push(path);
  }
}

// After a rename or a move: the selection and open groups follow the new path.
function follow(from: string, to: string) {
  const swap = (p: string) => (isWithin(p, from) ? to + p.slice(from.length) : p);
  pview.selected = swap(pview.selected);
  pview.expanded = pview.expanded.map(swap);
  if (timer.running) timer.running = { ...timer.running, path: swap(timer.running.path) };
}

export async function rename(path: string) {
  const name = await promptText(t('projects.rename'), baseName(path));
  if (!name) return;
  await flushArticle();
  const to = await window.api.renameProject(path, name);
  if (to && to !== path) follow(path, to);
}

export async function move(path: string, parent: string) {
  await flushArticle();
  const to = await window.api.moveProject(path, parent);
  if (to) {
    follow(path, to);
    reveal(joinPath(to, ''));
  }
}

export async function remove(path: string) {
  const figure = figureAt(path);
  const text = figure ? t('projects.deleteFigure', { name: baseName(path) }) : t('projects.deleteFolder', { name: baseName(path) });
  if (!(await confirm(text, t('app.delete'), true))) return;
  await flushArticle();
  if (isWithin(pview.selected, path)) pview.selected = parentOf(path);
  await window.api.removeProject(path);
}

// A new status; the dates of starting and finishing fill in by themselves when still empty.
export function setFigureStatus(f: Figure, status: FigureStatus) {
  const today = new Date().toISOString().slice(0, 10);
  const patch: Partial<Figure['meta']> = { status };
  if (status === 'painting' && !f.meta.started) patch.started = today;
  if (status === 'done' && !f.meta.finished) patch.finished = today;
  return window.api.updateFigure(f.path, patch);
}
