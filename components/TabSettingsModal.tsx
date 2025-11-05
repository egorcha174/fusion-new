import React, { useState } from 'react';
import { Tab, LayoutMode } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface TabSettings {
    name: string;
    layoutMode: LayoutMode;
    gridCols?: number;
}

interface TabSettingsModalProps {
    tab: Tab;
    onSave: (tabId: string, settings: TabSettings) => void;
    onDelete: (tabId: string) => void;
    onClose: () => void;
}

const TabSettingsModal: React.FC<TabSettingsModalProps> = ({ tab, onSave, onDelete, onClose }) => {
    const [settings, setSettings] = useState<TabSettings>({
        name: tab.name,
        layoutMode: tab.layoutMode ?? LayoutMode.Flow,
        gridCols: tab.gridCols ?? 24,
    });
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleSave = () => {
        if (settings.name.trim()) {
            onSave(tab.id, { ...settings, name: settings.name.trim() });
        }
    };

    const handleDelete = () => {
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = () => {
        onDelete(tab.id);
        setIsConfirmingDelete(false);
    };

    const handleSettingsChange = <K extends keyof TabSettings>(key: K, value: TabSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Настроить вкладку</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="tabName" className="block text-sm font-medium text-gray-300 mb-2">Название вкладки</label>
                            <input
                                id="tabName"
                                type="text"
                                value={settings.name}
                                onChange={(e) => handleSettingsChange('name', e.target.value)}
                                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Режим компоновки</label>
                            <div className="flex gap-2 bg-gray-700/50 p-1 rounded-lg">
                                <button 
                                    onClick={() => handleSettingsChange('layoutMode', LayoutMode.Flow)}
                                    className={`flex-1 py-1.5 rounded-md text-sm transition-colors ${settings.layoutMode === LayoutMode.Flow ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-600/50'}`}>
                                    Поточный
                                </button>
                                <button 
                                    onClick={() => handleSettingsChange('layoutMode', LayoutMode.Grid)}
                                    className={`flex-1 py-1.5 rounded-md text-sm transition-colors ${settings.layoutMode === LayoutMode.Grid ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-600/50'}`}>
                                    Сетка
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {settings.layoutMode === LayoutMode.Grid ? "Свободное размещение карточек на сетке." : "Автоматическое размещение групп друг под другом."}
                            </p>
                        </div>
                        
                        {settings.layoutMode === LayoutMode.Grid && (
                            <div className="fade-in">
                                <label htmlFor="gridCols" className="block text-sm font-medium text-gray-300 mb-2">Количество колонок</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        id="gridCols"
                                        type="range"
                                        min="8"
                                        max="48"
                                        step="4"
                                        value={settings.gridCols}
                                        onChange={(e) => handleSettingsChange('gridCols', parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <span className="w-8 text-center text-gray-300 font-mono">{settings.gridCols}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Определяет плотность сетки и размер карточек.</p>
                            </div>
                        )}
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