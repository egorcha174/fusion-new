import React, { useState } from 'react';
import { Group } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface GroupSettingsModalProps {
    tabId: string;
    group: Group;
    onSave: (tabId: string, groupId: string, newValues: { name: string; colSpan: number; rowSpan: number }) => void;
    onDelete: (tabId: string, groupId: string) => void;
    onClose: () => void;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ tabId, group, onSave, onDelete, onClose }) => {
    const [name, setName] = useState(group.name);
    const [colSpan, setColSpan] = useState(group.colSpan || 1);
    const [rowSpan, setRowSpan] = useState(group.rowSpan || 1);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleSave = () => {
        if (name.trim()) {
            onSave(tabId, group.id, { name: name.trim(), colSpan, rowSpan });
        }
    };

    const handleDelete = () => {
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = () => {
        onDelete(tabId, group.id);
        setIsConfirmingDelete(false); // onClose will be called by parent
    };
    
    const sizeOptions = [1, 2, 3, 4];

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
                            <h3 className="text-sm font-medium text-gray-300 mb-2">Размер группы</h3>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                     <label htmlFor="groupColSpan" className="block text-xs text-gray-400 mb-1">Ширина (колонки)</label>
                                     <div className="relative">
                                      <select
                                        id="groupColSpan"
                                        value={colSpan}
                                        onChange={(e) => setColSpan(Number(e.target.value))}
                                        className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg pl-4 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                      >
                                          {sizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                     </div>
                                </div>
                                 <div className="flex-1">
                                     <label htmlFor="groupRowSpan" className="block text-xs text-gray-400 mb-1">Высота (строки)</label>
                                      <div className="relative">
                                         <select
                                            id="groupRowSpan"
                                            value={rowSpan}
                                            onChange={(e) => setRowSpan(Number(e.target.value))}
                                            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg pl-4 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                          >
                                              {sizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
                                          </select>
                                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                      </div>
                                </div>
                            </div>
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