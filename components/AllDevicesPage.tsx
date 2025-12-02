import React, { useState, useMemo } from 'react';
import { RoomWithPhysicalDevices, Device, PhysicalDevice, Tab } from '../types';
import DeviceIcon from './DeviceIcon';
import { useAppStore } from '../store/appStore';
import { Icon } from '@iconify/react';

/**
 * Универсальная кнопка с выпадающим списком для добавления элемента на вкладку.
 */
const AddToTabButton: React.FC<{
  onAddToTab: (tabId: string) => void;
  availableTabs: Tab[];
  buttonText?: string;
  disabledText?: string;
}> = React.memo(({ onAddToTab, availableTabs, buttonText = "Добавить", disabledText = "Добавлено" }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    if (availableTabs.length === 0) {
        return <button disabled className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-1 rounded-md text-sm font-medium cursor-not-allowed">{disabledText}</button>;
    }
    
    // Если доступна только одна вкладка, добавляем сразу на нее без выпадающего списка.
    if (availableTabs.length === 1) {
        return <button onClick={(e) => { e.stopPropagation(); onAddToTab(availableTabs[0].id); }} className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors">{buttonText}</button>;
    }

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
                {buttonText}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black/5 dark:ring-white/10">
                    <div className="py-1">
                        {availableTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToTab(tab.id);
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
  physicalDevice: PhysicalDevice;
}> = ({ physicalDevice }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tabs, handleDeviceAddToTab, handleAddPhysicalDeviceAsCustomCard } = useAppStore();
  
  const customCardDeviceId = `internal::custom-card_physdev-${physicalDevice.id}`;
  const availableTabsForDevice = useMemo(() => 
    tabs.filter(tab => !tab.layout.some(item => item.deviceId === customCardDeviceId)),
    [tabs, customCardDeviceId]
  );

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300">
      <div className="flex items-center justify-between p-4 text-left">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-4 overflow-hidden text-left"
        >
          <Icon icon="mdi:chip" className="w-8 h-8 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{physicalDevice.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{physicalDevice.entities.length} сущ.</p>
          </div>
          <Icon icon="mdi:chevron-down" className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="ml-4 flex-shrink-0">
           <AddToTabButton
              availableTabs={availableTabsForDevice}
              onAddToTab={(tabId) => handleAddPhysicalDeviceAsCustomCard(physicalDevice, tabId)}
              buttonText="Добавить целиком"
            />
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-300/50 dark:border-gray-700/50 p-4 space-y-3">
          {physicalDevice.entities.map(entity => {
            const isOn = entity.state === 'on';
            const availableTabsForEntity = tabs.filter(tab => !tab.layout.some(item => item.deviceId === entity.id));
            
            return (
              <div key={entity.id} className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 flex-shrink-0 ${isOn ? 'text-blue-500' : 'text-gray-400'}`}>
                        <DeviceIcon icon={entity.icon ?? entity.type} isOn={isOn} className="!w-full !h-full !m-0"/>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{entity.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{entity.status}</p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                  <AddToTabButton
                    availableTabs={availableTabsForEntity}
                    onAddToTab={(tabId) => handleDeviceAddToTab(entity, tabId)}
                    buttonText="Добавить сущность"
                  />
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
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl">
        Здесь показаны все физические устройства, обнаруженные в Home Assistant.
        Вы можете добавить устройство целиком (будет создана кастомная карточка) или добавить на дашборд любую из его сущностей по-отдельности.
      </p>
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