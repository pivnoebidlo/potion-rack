import FigureModal from './FigureModal';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import ContextMenu from './ContextMenu';
import { Figure } from '../types/figure';
import { FolderTarget } from './FolderTree';
import { updateFigureAPI, createFigureAPI } from '../services/apiFigures';

interface FiguresModalsProps {
    modalOpen: boolean;
    editingFigure: Figure | null;
    newFigureFolder: string;
    confirmOpen: boolean;
    confirmTitle: string;
    confirmMessage: string;
    confirmAction: () => void;
    contextMenu: { x: number; y: number; target: FolderTarget } | null;
    promptOpen: boolean;
    promptTitle: string;
    promptDefault: string;
    promptCallback: (value: string) => void;
    onCloseModal: () => void;
    onCloseConfirm: () => void;
    onCloseContextMenu: () => void;
    onClosePrompt: () => void;
    onConfirmPrompt: (value: string) => void;
    onSaveFigure: () => Promise<void>;
    onNewFigure: (folderPath: string) => void;
    onNewFolder: (parentPath: string) => void;
    onRename: (target: FolderTarget) => void;
    onExportPdf: (target: FolderTarget) => void;
    onDeleteTarget: (target: FolderTarget) => void;
}

export default function FiguresModals({
                                          modalOpen,
                                          editingFigure,
                                          newFigureFolder,
                                          confirmOpen,
                                          confirmTitle,
                                          confirmMessage,
                                          confirmAction,
                                          contextMenu,
                                          promptOpen,
                                          promptTitle,
                                          promptDefault,
                                          promptCallback,
                                          onCloseModal,
                                          onCloseConfirm,
                                          onCloseContextMenu,
                                          onClosePrompt,
                                          onConfirmPrompt,
                                          onSaveFigure,
                                          onNewFigure,
                                          onNewFolder,
                                          onRename,
                                          onExportPdf,
                                          onDeleteTarget,
                                      }: FiguresModalsProps) {
    return (
        <>
            {modalOpen && (
                <FigureModal
                    figure={editingFigure}
                    onSave={async (data) => {
                        if (editingFigure) {
                            await updateFigureAPI(editingFigure.id, data);
                        } else {
                            await createFigureAPI({ ...data, folder_path: newFigureFolder } as any);
                        }
                        await onSaveFigure();
                    }}
                    onClose={onCloseModal}
                />
            )}
            {confirmOpen && (
                <ConfirmModal
                    title={confirmTitle}
                    message={confirmMessage}
                    onConfirm={confirmAction}
                    onCancel={onCloseConfirm}
                />
            )}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    target={contextMenu.target}
                    onClose={onCloseContextMenu}
                    onNewFigure={onNewFigure}
                    onNewFolder={onNewFolder}
                    onRename={onRename}
                    onExportPdf={onExportPdf}
                    onDelete={onDeleteTarget}
                />
            )}
            {promptOpen && (
                <PromptModal
                    title={promptTitle}
                    defaultValue={promptDefault}
                    onConfirm={(value) => {
                        onClosePrompt();
                        onConfirmPrompt(value);
                    }}
                    onCancel={onClosePrompt}
                />
            )}
        </>
    );
}