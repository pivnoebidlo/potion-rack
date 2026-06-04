import { useState, useEffect, useCallback } from 'react';
import { Figure } from '../services/apiFigures';
import styles from './FolderTree.module.css';

interface FolderNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children: FolderNode[];
    figures: Figure[];
}

interface FolderTreeProps {
    figures: Figure[];
    diskFolders: string[];
    selectedId: number | null;
    selectedFolder: string;
    onSelectFigure: (id: number) => void;
    onSelectFolder: (folderPath: string) => void;
    onDoubleClickFigure: (id: number) => void;
    onContextMenu: (e: React.MouseEvent, target: FolderTarget) => void;
    searchQuery: string;
}

export interface FolderTarget {
    type: 'folder' | 'figure' | 'root';
    path: string;
    figureId?: number;
}

export default function FolderTree({ figures, diskFolders, selectedId, selectedFolder, onSelectFigure, onSelectFolder, onDoubleClickFigure, onContextMenu, searchQuery }: FolderTreeProps) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [tree, setTree] = useState<FolderNode[]>([]);

    const buildTree = useCallback((): FolderNode[] => {
        const root: FolderNode[] = [];
        const byFolder = new Map<string, Figure[]>();
        const rootFigures: Figure[] = [];
        const allFolders = new Set<string>(diskFolders);

        for (const fig of figures) {
            if (searchQuery && !fig.name.toLowerCase().includes(searchQuery.toLowerCase())) continue;
            if (fig.folder_path) {
                allFolders.add(fig.folder_path);
                const existing = byFolder.get(fig.folder_path) || [];
                existing.push(fig);
                byFolder.set(fig.folder_path, existing);
            } else {
                rootFigures.push(fig);
            }
        }

        // Добавляем папки (сначала)
        const sortedFolders = Array.from(allFolders).sort();
        for (const folderPath of sortedFolders) {
            const parts = folderPath.split('/').filter(p => p);
            const folderFigures = byFolder.get(folderPath) || [];
            const displayName = parts[parts.length - 1] || folderPath;

            const folderNode: FolderNode = {
                name: displayName,
                path: folderPath,
                isDirectory: true,
                children: [],
                figures: folderFigures
            };

            for (const fig of folderFigures) {
                folderNode.children.push({
                    name: fig.name,
                    path: folderPath,
                    isDirectory: false,
                    children: [],
                    figures: [fig]
                });
            }

            const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
            if (parentPath) {
                const parent = findFolder(root, parentPath);
                if (parent) {
                    parent.children.push(folderNode);
                    continue;
                }
            }

            root.push(folderNode);
        }

        // Добавляем фигурки в корне (после папок)
        for (const fig of rootFigures) {
            root.push({
                name: fig.name,
                path: '',
                isDirectory: false,
                children: [],
                figures: [fig]
            });
        }

        // Сортировка: папки первыми, потом фигурки, внутри — по алфавиту
        root.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return root;
    }, [figures, diskFolders, searchQuery]);

    const findFolder = (nodes: FolderNode[], path: string): FolderNode | null => {
        for (const node of nodes) {
            if (node.isDirectory && node.path === path) return node;
            const found = findFolder(node.children, path);
            if (found) return found;
        }
        return null;
    };

    useEffect(() => {
        setTree(buildTree());
    }, [buildTree]);

    const toggleCollapse = (path: string) => {
        const next = new Set(collapsed);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        setCollapsed(next);
    };

    const handleContextMenu = (e: React.MouseEvent, target: FolderTarget) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, target);
    };

    const renderNode = (node: FolderNode, depth: number) => {
        const isCollapsed = collapsed.has(node.path);
        const isSelected = node.isDirectory
            ? selectedFolder === node.path
            : selectedId === node.figures[0]?.id;

        if (node.isDirectory) {
            return (
                <div key={`folder-${node.path}`}>
                    <div
                        className={`${styles.treeRow} ${styles.folder} ${isSelected ? styles.selected : ''}`}
                        style={{ paddingLeft: `${depth * 16 + 10}px` }}
                        onClick={() => {
                            onSelectFolder(node.path);
                            toggleCollapse(node.path);
                        }}
                        onContextMenu={(e) => handleContextMenu(e, { type: 'folder', path: node.path })}
                    >
                        <span className={styles.arrow}>{isCollapsed ? '▸' : '▾'}</span>
                        <span className={styles.name}>{node.name}</span>
                    </div>
                    {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
                </div>
            );
        }

        const figure = node.figures[0];
        return (
            <div
                key={`figure-${figure.id}`}
                className={`${styles.treeRow} ${styles.figure} ${isSelected ? styles.selected : ''}`}
                style={{ paddingLeft: `${depth * 16 + 10}px` }}
                onClick={() => onSelectFigure(figure.id)}
                onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickFigure(figure.id); }}
                onContextMenu={(e) => handleContextMenu(e, { type: 'figure', path: node.path, figureId: figure.id })}
            >
                <span className={styles.arrow}></span>
                <span className={styles.name}>{figure.name}</span>
            </div>
        );
    };

    // Навигация стрелками — работает только когда фокус НЕ в редакторе
    const getAllVisibleNodes = (nodes: FolderNode[]): { node: FolderNode; depth: number }[] => {
        const result: { node: FolderNode; depth: number }[] = [];
        const traverse = (n: FolderNode, d: number) => {
            result.push({ node: n, depth: d });
            if (n.isDirectory && !collapsed.has(n.path)) {
                for (const child of n.children) {
                    traverse(child, d + 1);
                }
            }
        };
        for (const n of nodes) traverse(n, 0);
        return result;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Игнорируем, если фокус в редакторе
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement).closest('.cm-editor')) return;
            if ((e.target as HTMLElement).closest('.cm-content')) return;

            const visibleNodes = getAllVisibleNodes(tree);
            if (visibleNodes.length === 0) return;

            let currentIndex = visibleNodes.findIndex(v =>
                v.node.isDirectory
                    ? v.node.path === selectedFolder
                    : v.node.figures[0]?.id === selectedId
            );

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentIndex === -1) currentIndex = 0;
                const newIndex = e.key === 'ArrowUp'
                    ? Math.max(0, currentIndex - 1)
                    : Math.min(visibleNodes.length - 1, currentIndex + 1);
                const target = visibleNodes[newIndex].node;
                if (target.isDirectory) {
                    onSelectFolder(target.path);
                } else {
                    onSelectFigure(target.figures[0].id);
                }
            }

            if (e.key === 'ArrowRight' && currentIndex >= 0) {
                const target = visibleNodes[currentIndex].node;
                if (target.isDirectory && collapsed.has(target.path)) {
                    toggleCollapse(target.path);
                }
            }

            if (e.key === 'ArrowLeft' && currentIndex >= 0) {
                const target = visibleNodes[currentIndex].node;
                if (target.isDirectory && !collapsed.has(target.path)) {
                    toggleCollapse(target.path);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tree, collapsed, selectedId, selectedFolder]);

    return (
        <div className={styles.tree} onContextMenu={(e) => handleContextMenu(e, { type: 'root', path: '' })}>
            {tree.map(node => renderNode(node, 0))}
            {tree.length === 0 && (
                <div className={styles.empty}>Нет фигурок</div>
            )}
        </div>
    );
}