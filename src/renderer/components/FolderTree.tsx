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

        rootFigures.sort((a, b) => a.name.localeCompare(b.name));

        const sortedFolders = Array.from(allFolders).sort();
        for (const folderPath of sortedFolders) {
            const parts = folderPath.split('/').filter(p => p);
            const folderFigures = byFolder.get(folderPath) || [];
            const displayName = parts[parts.length - 1] || folderPath;

            folderFigures.sort((a, b) => a.name.localeCompare(b.name));

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
                    parent.children.sort((a, b) => {
                        if (a.isDirectory && !b.isDirectory) return -1;
                        if (!a.isDirectory && b.isDirectory) return 1;
                        return a.name.localeCompare(b.name);
                    });
                    continue;
                }
            }

            root.push(folderNode);
        }

        for (const fig of rootFigures) {
            root.push({
                name: fig.name,
                path: '',
                isDirectory: false,
                children: [],
                figures: [fig]
            });
        }

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

    const getStatusClass = (status: string): string => {
        switch (status) {
            case 'completed': return 'folderTree-statusDone';
            case 'in-progress': return 'folderTree-statusProgress';
            case 'draft':
            default: return 'folderTree-statusDraft';
        }
    };

    // Рекурсивный подсчёт фигурок в папке и всех подпапках
    const countFiguresInFolder = useCallback((folderPath: string): number => {
        let count = 0;
        const directFigures = figures.filter(f => f.folder_path === folderPath);
        count += directFigures.length;
        const subFolders = diskFolders.filter(f => f.startsWith(folderPath + '/'));
        for (const sub of subFolders) {
            count += countFiguresInFolder(sub);
        }
        return count;
    }, [figures, diskFolders]);

    const renderNode = (node: FolderNode, depth: number) => {
        const isCollapsed = collapsed.has(node.path);
        const isSelected = node.isDirectory
            ? selectedFolder === node.path
            : selectedId === node.figures[0]?.id;

        if (node.isDirectory) {
            const count = countFiguresInFolder(node.path);
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
                        {count > 0 && <span className={styles.count}>{count}</span>}
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
                <span className={`folderTree-statusDot ${getStatusClass(figure.status)}`} />
                <span className={styles.name}>{figure.name}</span>
            </div>
        );
    };

    // Навигация стрелками
    useEffect(() => {
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

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement).closest('.cm-editor')) return;
            if ((e.target as HTMLElement).closest('.cm-content')) return;

            const visibleNodes = getAllVisibleNodes(tree);
            if (visibleNodes.length === 0) return;

            const currentIndex = visibleNodes.findIndex(v => {
                if (selectedId !== null) {
                    return !v.node.isDirectory && v.node.figures[0]?.id === selectedId;
                }
                return v.node.isDirectory && v.node.path === selectedFolder;
            });

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentIndex <= 0) return;
                const target = visibleNodes[currentIndex - 1].node;
                if (target.isDirectory) {
                    onSelectFolder(target.path);
                } else {
                    onSelectFigure(target.figures[0].id);
                }
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentIndex >= visibleNodes.length - 1) return;
                const target = visibleNodes[currentIndex + 1].node;
                if (target.isDirectory) {
                    onSelectFolder(target.path);
                } else {
                    onSelectFigure(target.figures[0].id);
                }
            }

            if (e.key === 'ArrowRight') {
                const target = currentIndex >= 0 ? visibleNodes[currentIndex].node : null;
                if (target?.isDirectory && collapsed.has(target.path)) {
                    e.preventDefault();
                    toggleCollapse(target.path);
                }
            }

            if (e.key === 'ArrowLeft') {
                const target = currentIndex >= 0 ? visibleNodes[currentIndex].node : null;
                if (target?.isDirectory && !collapsed.has(target.path)) {
                    e.preventDefault();
                    toggleCollapse(target.path);
                } else if (target && !target.isDirectory && currentIndex > 0) {
                    e.preventDefault();
                    for (let i = currentIndex - 1; i >= 0; i--) {
                        if (visibleNodes[i].node.isDirectory) {
                            onSelectFolder(visibleNodes[i].node.path);
                            break;
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tree, collapsed, selectedId, selectedFolder, onSelectFigure, onSelectFolder, toggleCollapse]);

    return (
        <div className={styles.tree} onContextMenu={(e) => handleContextMenu(e, { type: 'root', path: '' })}>
            {tree.map(node => renderNode(node, 0))}
            {tree.length === 0 && (
                <div className={styles.empty}>Нет фигурок</div>
            )}
        </div>
    );
}