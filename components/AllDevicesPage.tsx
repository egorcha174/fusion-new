

import React, { useState } from 'react';
import { RoomWithPhysicalDevices, Device } from '../types';
import DeviceIcon from './DeviceIcon';
import { useAppStore } from '../store/appStore';
import { Icon } from '@iconify/react';

/**
 * Компонент-кнопка с выпадающим списком для добавления устройства на вкладку.
 * @param {Device} device - Сущность, которую нужно добавить.
 */
const AddToTabButton: React.FC<{
    device: Device;
}> = React.memo(({ device }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { tabs, handleDeviceAddToTab } = useAppStore();

    const availableTabs = tabs.filter(tab => !tab.layout.some(item => item.deviceId === device.id));

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
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
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


/**
 * Компонент для отображения одного физического устройства и его сущностей.
 */
const PhysicalDeviceRow: React.FC<{
  physicalDevice: { id: string; name: string; entities: Device[] };
}> = ({ physicalDevice }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { customizations, handleToggleVisibility } = useAppStore();

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg"
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <Icon icon="mdi:chip" className="w-8 h-8 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{physicalDevice.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{physicalDevice.entities.length} сущ.</p>
          </div>
        </div>
        <Icon icon="mdi:chevron-down" className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-300/50 dark:border-gray-700/50 p-4 space-y-3">
          {physicalDevice.entities.map(device => {
            const isHidden = customizations[device.id]?.isHidden ?? false;
            const isOn = device.state === 'on';
            return (
              <div key={device.id} className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 flex-shrink-0 ${isOn ? 'text-blue-500' : 'text-gray-400'}`}>
                        <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} className="!w-full !h-full !m-0"/>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{device.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.status}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(device, !isHidden)}
                    title={isHidden ? 'Показать' : 'Скрыть'}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    {isHidden ? <Icon icon="mdi:eye-off-outline" className="h-5 w-5" /> : <Icon icon="mdi:eye-outline" className="h-5 w-5" />}
                  </button>
                  <AddToTabButton device={device} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


interface AllDevicesPageProps {
  rooms: RoomWithPhysicalDevices[];
}

/**
 * Компонент страницы, отображающий все физические устройства из Home Assistant,
 * сгруппированные по комнатам.
 */
const AllDevicesPage: React.FC<AllDevicesPageProps> = ({ rooms }) => {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-8">Все устройства</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl">Здесь показаны все физические устройства, обнаруженные в Home Assistant, и связанные с ними сущности.</p>
      <div className="space-y-10">
        {rooms.map(room => (
          <section key={room.id}>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{room.name}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {room.devices.map(physicalDevice => (
                <PhysicalDeviceRow key={physicalDevice.id} physicalDevice={physicalDevice} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
export default React.memo(AllDevicesPage);