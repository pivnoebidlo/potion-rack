// The actions of a figure and of a group: the right-click menu of the tree, the cards and the «⋯» buttons.
import { Circle, CircleCheck, FilePlus, FolderOpen, FolderPlus, FolderUp, Pencil, Trash2 } from '@lucide/svelte';
import { FIGURE_STATUSES, parentOf, type Figure } from '../../shared/projects.ts';
import type { MenuItem } from '../lib/ContextMenu.svelte';
import { t } from '../lib/i18n.svelte.ts';
import { move, newFigure, newFolder, remove, rename, setFigureStatus } from './view.svelte.ts';

const common = (path: string): MenuItem[] => [
  { label: t('projects.rename'), icon: Pencil, action: () => void rename(path) },
  ...(parentOf(path) ? [{ label: t('projects.moveRoot'), icon: FolderUp, action: () => void move(path, '') }] : []),
  { label: t('projects.reveal'), icon: FolderOpen, action: () => void window.api.revealProject(path) },
  { label: t('projects.delete'), icon: Trash2, danger: true, action: () => void remove(path) },
];

export const figureMenu = (f: Figure): MenuItem[] => [
  ...FIGURE_STATUSES.map((s) => ({ label: t(`fstatus.${s}`), icon: s === f.meta.status ? CircleCheck : Circle, action: () => void setFigureStatus(f, s) })),
  ...common(f.path),
];

export const folderMenu = (path: string): MenuItem[] => [
  { label: t('projects.newFigure'), icon: FilePlus, action: () => void newFigure(path) },
  { label: t('projects.newFolder'), icon: FolderPlus, action: () => void newFolder(path) },
  ...(path ? common(path) : [{ label: t('projects.reveal'), icon: FolderOpen, action: () => void window.api.revealProject('') }]),
];
