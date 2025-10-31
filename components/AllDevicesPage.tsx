
import React from 'react';
import { Room, Device, DeviceCustomizations, DeviceType } from '../types';
import DeviceIcon from './DeviceIcon';

interface AllDevicesPageProps {
    rooms: Room[];
    customizations: DeviceCustomizations;
    onToggleVisibility: (deviceId: string, isHidden: boolean) => void;
}

const VisibilityToggle: React.FC<{ isHidden: boolean; onClick: () => void }> = ({ isHidden, onClick }) => {
    return (
        <button
            onClick={onClick}
            title={isHidden ? 'Показать на дашборде' : 'Скрыть с дашборда'}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isHidden
                    ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
            {isHidden ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m0 0l-2.14 2.14" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            )}
        </button>
    );
};


const AllDevicesPage: React.FC<AllDevicesPageProps> = ({ rooms, customizations, onToggleVisibility }) => {
    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-8">Все устройства</h1>
            <div className="space-y-10">
                {rooms.map(room => (
                    <section key={room.id}>
                        <h2 className="text-2xl font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">{room.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {room.devices.map(device => {
                                const isHidden = customizations[device.id]?.isHidden ?? false;
                                return (
                                    <div key={device.id} className="bg-gray-800/80 p-4 rounded-lg flex items-center justify-between ring-1 ring-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 flex-shrink-0">
                                                <DeviceIcon type={device.type} isOn={device.status.toLowerCase() === 'вкл'} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-100">{device.name}</p>
                                                <p className="text-sm text-gray-400">{device.id}</p>
                                            </div>
                                        </div>
                                        <VisibilityToggle
                                            isHidden={isHidden}
                                            onClick={() => onToggleVisibility(device.id, !isHidden)}
                                        />
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
