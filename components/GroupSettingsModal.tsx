import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import DeviceIcon from './DeviceIcon';
import { Icon } from '@iconify/react';
import { Device } from '../types';

interface GroupSettingsModalProps {
  groupId: string;
  onClose: () => void;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ groupId, onClose }) => {
    const { groups, handleUpdateGroup, handleRemoveFromGroup, activeTabId } = useAppStore();
    const { allKnownDevices, handleDeviceToggle } = useHAStore();
    
    const group = groups.find(g => g.id === groupId);
    
    const [name, setName] = useState(group?.name || 'Группа');
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (group) setName(group.name);
    }, [group]);

    if (!group) {
        // Если группа была расформирована, пока модальное окно открыто
        onClose();
        return null;
    }

    const devicesInGroup = group.deviceIds.map(id => allKnownDevices.get(id)).filter((d): d is Device => !!d);

    const handleSaveName = () => {
        if (name.trim()) {
            handleUpdateGroup(group.id, { name: name.trim() });
        }
    };
    
    const handleRemove = (deviceId: string) => {
        if (activeTabId) {
            handleRemoveFromGroup(group.id, deviceId, activeTabId);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-lg w-full max-w-xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 flex-shrink-0 flex items-center justify-between border-b border-gray-300/50 dark:border-gray-700/50">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="text-lg font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md -ml-2 px-2"
                        placeholder="Название группы"
                    />
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isEditMode ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {isEditMode ? 'Готово' : 'Править'}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Icon icon="mdi:close" className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-grow p-4 overflow-y-auto">
                    {devicesInGroup.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {devicesInGroup.map(device => {
                                const isOn = device.state === 'on';
                                return (
                                    <div key={device.id} className="relative group">
                                        <div
                                            onClick={() => !isEditMode && handleDeviceToggle(device.id)}
                                            className={`aspect-square rounded-xl p-3 flex flex-col justify-between transition-colors duration-300 ${isEditMode ? '' : 'cursor-pointer'} ${isOn ? 'bg-white dark:bg-gray-700' : 'bg-gray-200/80 dark:bg-gray-900/50'}`}
                                        >
                                            <div className={`w-8 h-8 ${isOn ? 'text-blue-500' : 'text-gray-500'}`}>
                                                <DeviceIcon icon={device.icon || device.type} isOn={isOn} className="!w-full !h-full !m-0" />
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm ${isOn ? 'text-black dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{device.name}</p>
                                                <p className={`text-xs ${isOn ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500'}`}>{device.status}</p>
                                            </div>
                                        </div>
                                        {isEditMode && (
                                            <button 
                                                onClick={() => handleRemove(device.id)}
                                                className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-110"
                                                title="Удалить из группы"
                                            >
                                                <Icon icon="mdi:minus" className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <p>Эта группа пуста.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupSettingsModal;
