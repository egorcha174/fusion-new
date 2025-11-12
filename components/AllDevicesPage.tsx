
import React, { useState } from 'react';
import { Room, DeviceCustomizations, Tab, Device } from '../types';
import DeviceIcon from './DeviceIcon';
import { useAppStore } from '../store/appStore';

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

interface AllDevicesPageProps {
  rooms: Room[];
}

/**
 * Компонент страницы, отображающий все доступные устройства из Home Assistant,
 * сгруппированные по комнатам. Позволяет скрывать/показывать устройства и добавлять их на вкладки.
 */
const AllDevicesPage: React.FC<AllDevicesPageProps> = ({ rooms }) => {
    const { customizations, handleToggleVisibility } = useAppStore();

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-8">Все устройства</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl">Здесь показаны все устройства, обнаруженные в вашем Home Assistant. Вы можете скрыть те, которые не хотите видеть на дашборде, или добавить их на одну из ваших вкладок.</p>
            <div className="space-y-10">
                {rooms.map(room => (
                    <section key={room.id}>
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{room.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {room.devices.map(device => {
                                const isHidden = customizations[device.id]?.isHidden ?? false;
                                const isOn = device.status.toLowerCase() === 'включено';
                                return (
                                    <div key={device.id} className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg flex items-center justify-between ring-1 ring-black/5 dark:ring-white/5">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className={`w-10 h-10 flex-shrink-0 ${isOn ? 'text-blue-500' : 'text-gray-400'}`}>
                                                <DeviceIcon
                                                    icon={device.icon ?? device.type}
                                                    isOn={isOn}
                                                />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words">{device.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{device.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Кнопка для скрытия/показа устройства */}
                                            <button
                                                onClick={() => handleToggleVisibility(device, !isHidden)}
                                                title={isHidden ? 'Показать' : 'Скрыть'}
                                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                {isHidden ? (
                                                    // Иконка "скрыто" (перечеркнутый глаз)
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.27 5.943 14.478 3 10 3a9.953 9.953 0 00-4.512 1.074l-1.78-1.781zM9.5 6.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                                                        <path d="M10 15a5 5 0 01-4.472-2.772l-1.473 1.473a1 1 0 101.414 1.414l1.473-1.473A5 5 0 0110 15z" />
                                                    </svg>
                                                ) : (
                                                    // Иконка "видно" (глаз)
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                            {/* Кнопка добавления на вкладку */}
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

export default React.memo(AllDevicesPage);
