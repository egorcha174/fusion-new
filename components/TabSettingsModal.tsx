
import React, { useState } from 'react';
import { Tab } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface TabSettingsModalProps {
    tab: Tab;
    onSave: (tabId: string, newName: string) => void;
    onDelete: (tabId: string) => void;
    onClose: () => void;
}

const TabSettingsModal: React.FC<TabSettingsModalProps> = ({ tab, onSave, onDelete, onClose }) => {
    const [name, setName] = useState(tab.name);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleSave = () => {
        if (name.trim()) {
            onSave(tab.id, name.trim());
        }
    };

    const handleDelete = () => {
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = () => {
        onDelete(tab.id);
        setIsConfirmingDelete(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Настроить вкладку</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="tabName" className="block text-sm font-medium text-gray-300 mb-2">Название вкладки</label>
                            <input
                                id="tabName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="p-6 flex justify-between items-center bg-gray-800/50 rounded-b-2xl">
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            Удалить
                        </button>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={isConfirmingDelete}
                title="Удалить вкладку?"
                message={
                    <>
                        Вы уверены, что хотите удалить вкладку <strong className="text-white">"{tab.name}"</strong>?
                        <br />
                        Это действие нельзя отменить.
                    </>
                }
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirmingDelete(false)}
                confirmText="Удалить"
            />
        </>
    );
};

export default TabSettingsModal;