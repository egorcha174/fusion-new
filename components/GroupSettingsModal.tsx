import React, { useState } from 'react';
import { Group } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface GroupSettingsModalProps {
    tabId: string;
    group: Group;
    onSave: (tabId: string, groupId: string, newValues: { name: string; width?: number; height?: number; }) => void;
    onDelete: (tabId: string, groupId: string) => void;
    onClose: () => void;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ tabId, group, onSave, onDelete, onClose }) => {
    const [name, setName] = useState(group.name);
    const [width, setWidth] = useState(group.width || 4);
    const [height, setHeight] = useState(group.height || 0); // 0 for unlimited
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleSave = () => {
        if (name.trim()) {
            onSave(tabId, group.id, { 
                name: name.trim(),
                width: width,
                height: height > 0 ? height : undefined, // Store undefined if height is unlimited
            });
        }
    };

    const handleDelete = () => {
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = () => {
        onDelete(tabId, group.id);
        setIsConfirmingDelete(false); // onClose will be called by parent
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Настроить группу</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="groupName" className="block text-sm font-medium text-gray-300 mb-2">Название группы</label>
                            <input
                                id="groupName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                         <div>
                            <label htmlFor="groupWidth" className="block text-sm font-medium text-gray-300 mb-2">Ширина группы</label>
                            <div className="flex items-center gap-4">
                                <input
                                    id="groupWidth"
                                    type="range"
                                    min="1"
                                    max="4"
                                    step="1"
                                    value={width}
                                    onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="w-8 text-center text-gray-300 font-mono">{width}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Количество карточек в ширину.</p>
                        </div>
                        <div>
                            <label htmlFor="groupHeight" className="block text-sm font-medium text-gray-300 mb-2">Максимальная высота</label>
                            <div className="flex items-center gap-4">
                                <input
                                    id="groupHeight"
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="1"
                                    value={height}
                                    onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="w-8 text-center text-gray-300 font-mono">{height === 0 ? '∞' : height}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Количество рядов карточек. 0 = без ограничений.</p>
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
                title="Удалить группу?"
                message={
                    <>
                        Вы уверены, что хотите удалить группу <strong className="text-white">"{group.name}"</strong>?
                        <br />
                        Устройства в этой группе не будут удалены, а станут несгруппированными.
                    </>
                }
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirmingDelete(false)}
                confirmText="Удалить"
            />
        </>
    );
};

export default GroupSettingsModal;