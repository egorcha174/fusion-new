import React, { useState } from 'react';
import { Tab } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore } from '../store/appStore';

interface TabSettings {
    name: string;
    gridSettings: {
        cols: number;
        rows: number;
    }
}

interface TabSettingsModalProps {
    tab: Tab;
    onClose: () => void;
}

const TabSettingsModal: React.FC<TabSettingsModalProps> = ({ tab, onClose }) => {
    const { handleUpdateTabSettings, handleDeleteTab } = useAppStore();
    const [settings, setSettings] = useState<TabSettings>({
        name: tab.name,
        gridSettings: tab.gridSettings || { cols: 8, rows: 5 },
    });
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleSave = () => {
        if (settings.name.trim()) {
            handleUpdateTabSettings(tab.id, { ...settings, name: settings.name.trim() });
            onClose();
        }
    };

    const handleDelete = () => {
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = () => {
        handleDeleteTab(tab.id);
        setIsConfirmingDelete(false);
        onClose();
    };

    const handleGridSettingsChange = (key: 'cols' | 'rows', value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            setSettings(prev => ({
                ...prev,
                gridSettings: {
                    ...prev.gridSettings,
                    [key]: numValue,
                }
            }));
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-black/5 dark:ring-white/10" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настроить вкладку</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="tabName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название вкладки</label>
                            <input
                                id="tabName"
                                type="text"
                                value={settings.name}
                                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Размер сетки</label>
                            <div className="flex items-center gap-4">
                               <div className="flex-1">
                                  <label htmlFor="gridCols" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Колонки</label>
                                  <input
                                      id="gridCols"
                                      type="number"
                                      min="1"
                                      max="20"
                                      value={settings.gridSettings.cols}
                                      onChange={(e) => handleGridSettingsChange('cols', e.target.value)}
                                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                               </div>
                               <div className="flex-1">
                                  <label htmlFor="gridRows" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ряды</label>
                                  <input
                                      id="gridRows"
                                      type="number"
                                      min="1"
                                      max="20"
                                      value={settings.gridSettings.rows}
                                      onChange={(e) => handleGridSettingsChange('rows', e.target.value)}
                                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                               </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Определяет количество ячеек на дашборде.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 flex justify-between items-center bg-gray-100/50 dark:bg-gray-800/50 rounded-b-2xl">
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            Удалить
                        </button>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
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
                        Вы уверены, что хотите удалить вкладку <strong className="text-black dark:text-white">"{tab.name}"</strong>?
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

export default React.memo(TabSettingsModal);