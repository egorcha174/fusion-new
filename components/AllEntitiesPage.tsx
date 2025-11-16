


import React, { useState } from 'react';
import { Room, Device } from '../types';
import DeviceIcon from './DeviceIcon';
import { useAppStore } from '../store/appStore';
import { Icon } from '@iconify/react';

/**
 * Компонент-кнопка с выпадающим списком для добавления устройства на вкладку.
 * @param {Device} device - Устройство, которое нужно добавить.
 */
const AddToTabButton: React.FC<{
    device: Device;
}> = React.memo(({ device }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { tabs, handleDeviceAddToTab } = useAppStore();

    // Фильтруем вкладки, чтобы показать только те, на которых этого устройства еще нет.
    const availableTabs = tabs.filter(tab => !tab.layout.some(item => item.deviceId === device.id));

    // Если устройство уже на всех вкладках, показываем неактивную кнопку.
    if (availableTabs.length === 0) return (
        <button
            disabled
            className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-1 rounded-md text-sm font-medium cursor-not-allowed"
        >
            Добавлено
        </button>
    );

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                // Закрываем по потере фокуса с небольшой задержкой, чтобы успел сработать onClick на элементе списка.
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
                Добавить
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black/5 dark:ring-black ring-opacity-5">
                    <div className="py-1">
                        {availableTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    handleDeviceAddToTab(device, tab.id);
                                    setIsOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

interface AllEntitiesPageProps {
  rooms: Room[];
}

/**
 * Компонент страницы, отображающий все доступные сущности из Home Assistant,
 * сгруппированные по комнатам. Позволяет скрывать/показывать сущности и добавлять их на вкладки.
 */
const AllEntitiesPage: React.FC<AllEntitiesPageProps> = ({ rooms }) => {
    // FIX: Correctly destructure the `addCustomWidget` action which is now implemented in the store.
    const { customizations, handleToggleVisibility, addCustomWidget } = useAppStore();

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Все сущности</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">Здесь показаны все сущности из вашего Home Assistant. Скрывайте ненужные или добавляйте их на вкладки.</p>
                </div>
                <button
                    onClick={() => addCustomWidget()}
                    className="flex-shrink-0 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <Icon icon="mdi:plus" className="w-5 h-5" />
                    Создать виджет-таймер
                </button>
            </div>
            
            <div className="space-y-10">
                {rooms.map(room => (
                    <section key={room.id}>
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{room.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {room.devices.map(device => {
                                const isHidden = customizations[device.id]?.isHidden ?? false;
                                const isOn = device.state === 'on';
                                return (
                                    <div key={device.id} className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg flex items-center justify-between ring-1 ring-black/5 dark:ring-white/5">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className={`w-10 h-10 flex-shrink-0 ${isOn ? 'text-blue-500' : 'text-gray-400'}`}>
                                                <DeviceIcon
                                                    icon={device.icon ?? device.type}
                                                    isOn={isOn}
                                                    className="!w-full !h-full !m-0"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words">{device.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{device.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleToggleVisibility(device, !isHidden)}
                                                title={isHidden ? 'Показать' : 'Скрыть'}
                                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                {isHidden ? (
                                                    <Icon icon="mdi:eye-off-outline" className="h-5 w-5" />
                                                ) : (
                                                    <Icon icon="mdi:eye-outline" className="h-5 w-5" />
                                                )}
                                            </button>
                                            <AddToTabButton device={device} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default React.memo(AllEntitiesPage);
