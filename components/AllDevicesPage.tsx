
import React, { useState } from 'react';
import { Room, DeviceCustomizations, Tab, Device } from '../types';
import DeviceIcon from './DeviceIcon';

interface AllDevicesPageProps {
    rooms: Room[];
    customizations: DeviceCustomizations;
    onToggleVisibility: (deviceId: string, isHidden: boolean) => void;
    tabs: Tab[];
    onDeviceAddToTab: (deviceId: string, tabId: string) => void;
}

const AddToTabButton: React.FC<{
    tabs: Tab[];
    device: Device;
    onAddToTab: (tabId: string) => void;
}> = ({ tabs, device, onAddToTab }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Filter out tabs that already contain the device
    const availableTabs = tabs.filter(tab => !tab.deviceIds.includes(device.id));

    if (availableTabs.length === 0) return (
        <button
            disabled
            className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm font-medium cursor-not-allowed"
        >
            Добавлено
        </button>
    );

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Close on blur with a small delay
                className="bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
                Добавить
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        {availableTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    onAddToTab(tab.id);
                                    setIsOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


const AllDevicesPage: React.FC<AllDevicesPageProps> = ({ rooms, customizations, onToggleVisibility, tabs, onDeviceAddToTab }) => {
    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-8">Все устройства</h1>
            <p className="text-gray-400 mb-8 max-w-2xl">Здесь показаны все устройства, обнаруженные в вашем Home Assistant. Вы можете скрыть те, которые не хотите видеть на дашборде, или добавить их на одну из ваших вкладок.</p>
            <div className="space-y-10">
                {rooms.map(room => (
                    <section key={room.id}>
                        <h2 className="text-2xl font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">{room.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {room.devices.map(device => {
                                const isHidden = customizations[device.id]?.isHidden ?? false;
                                return (
                                    <div key={device.id} className="bg-gray-800/80 p-4 rounded-lg flex items-center justify-between ring-1 ring-white/5">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-10 h-10 flex-shrink-0">
                                                <DeviceIcon
                                                    type={device.type}
                                                    isOn={device.status.toLowerCase() === 'включено'}
                                                    cardSize="md"
                                                    haDomain={device.haDomain}
                                                    haDeviceClass={device.haDeviceClass}
                                                    customIcon={device.icon}
                                                />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-medium text-gray-100 text-sm break-words">{device.name}</p>
                                                <p className="text-sm text-gray-400 truncate">{device.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => onToggleVisibility(device.id, !isHidden)}
                                                title={isHidden ? 'Показать' : 'Скрыть'}
                                                className="p-2 text-gray-400 hover:text-white"
                                            >
                                                {isHidden ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.27 5.943 14.478 3 10 3a9.953 9.953 0 00-4.512 1.074l-1.78-1.781zM9.5 6.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                                                        <path d="M10 15a5 5 0 01-4.472-2.772l-1.473 1.473a1 1 0 101.414 1.414l1.473-1.473A5 5 0 0110 15z" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                            <AddToTabButton tabs={tabs} device={device} onAddToTab={(tabId) => onDeviceAddToTab(device.id, tabId)} />
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

export default AllDevicesPage;