
import React, { useState, useMemo } from 'react';
import { Device, Tab, EventTimerWidget, CustomCardWidget, DeviceType } from '../types';
import DeviceIcon from './DeviceIcon';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import { Icon } from '@iconify/react';
import ConfirmDialog from './ConfirmDialog';

/**
 * Универсальная кнопка с выпадающим списком для добавления элемента на вкладку.
 */
const AddToTabButton: React.FC<{
  device: Device;
}> = React.memo(({ device }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { tabs, handleDeviceAddToTab } = useAppStore();

    const availableTabs = useMemo(() => 
        tabs.filter(tab => !tab.layout.some(item => item.deviceId === device.id)),
        [tabs, device.id]
    );

    if (availableTabs.length === 0) {
        return <button disabled className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-1 rounded-md text-sm font-medium cursor-not-allowed">Добавлено</button>;
    }

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
                Добавить
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black/5 dark:ring-white/10">
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


const HelpersPage: React.FC = () => {
    const { eventTimerWidgets, customCardWidgets, addCustomCard, addCustomWidget, setEditingEventTimerId, setEditingTemplate, templates, deleteCustomCard, deleteCustomWidget } = useAppStore();
    const { allScenes, allAutomations, allScripts, triggerScene, triggerAutomation, triggerScript, allKnownDevices } = useHAStore();
    const [deletingItem, setDeletingItem] = useState<EventTimerWidget | CustomCardWidget | null>(null);

    const handleEdit = (widget: CustomCardWidget) => {
        // It's a standard custom card
        const templateId = `custom-card-template-${widget.id}`;
        const template = templates[templateId];
        if (template) {
            setEditingTemplate(template);
        } else {
            alert('Шаблон для этой карточки не найден.');
        }
    };
    
    const handleDelete = (item: EventTimerWidget | CustomCardWidget) => {
        setDeletingItem(item);
    };

    const confirmDelete = () => {
        if (!deletingItem) return;

        if ('cycleDays' in deletingItem) { // It's an EventTimerWidget
            deleteCustomWidget(deletingItem.id);
        } else { // It's a CustomCardWidget
            deleteCustomCard(deletingItem.id);
        }
        setDeletingItem(null);
    };
    
    const renderHelperRow = (device: Device, onTrigger: (id: string) => void) => (
         <div key={device.id} className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg flex items-center justify-between ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-8 h-8 flex-shrink-0 text-gray-500 dark:text-gray-400">
                    <DeviceIcon icon={device.type} isOn={device.state === 'on'} className="!w-full !h-full !m-0" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{device.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.status}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onTrigger(device.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500" title="Запустить">
                    <Icon icon="mdi:play" className="h-5 w-5" />
                </button>
                <AddToTabButton device={device} />
            </div>
        </div>
    );


    return (
        <div className="container mx-auto">
             <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Вспомогательные элементы</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
                        Управляйте вашими виджетами, сценами и автоматизациями. Добавляйте их на дашборд для быстрого доступа.
                    </p>
                </div>
            </div>

            <div className="space-y-10">
                <section>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-2 flex-grow">Виджеты</h2>
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <button onClick={addCustomCard} className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <Icon icon="mdi:view-dashboard-plus-outline" className="w-5 h-5" /><span>Новая карточка</span>
                            </button>
                            <button onClick={addCustomWidget} className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <Icon icon="mdi:plus" className="w-5 h-5" /><span>Новый таймер</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...eventTimerWidgets, ...customCardWidgets].map(widget => {
                            const isTimer = 'cycleDays' in widget;
                            const deviceId = isTimer ? `internal::event-timer_${widget.id}` : `internal::custom-card_${widget.id}`;
                            const device = allKnownDevices.get(deviceId);
                            
                            // Fallback display if device not yet in store (freshly added)
                            const displayType = isTimer ? DeviceType.EventTimer : DeviceType.Custom;
                            const displayName = device?.name || widget.name;
                            
                            return (
                                 <div key={widget.id} className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg flex items-center justify-between ring-1 ring-black/5 dark:ring-white/5">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-8 h-8 flex-shrink-0 text-gray-500 dark:text-gray-400">
                                            <DeviceIcon icon={displayType} isOn={false} className="!w-full !h-full !m-0" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{displayName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {isTimer ? 'Виджет-таймер' : 'Кастомная карточка'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => isTimer ? setEditingEventTimerId(widget.id) : handleEdit(widget)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500" title="Настроить">
                                            <Icon icon="mdi:pencil" className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(widget)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500" title="Удалить">
                                            <Icon icon="mdi:trash-can-outline" className="h-5 w-5" />
                                        </button>
                                        {device && <AddToTabButton device={device} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {allScenes.length > 0 && <section>
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Сцены</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allScenes.map(scene => renderHelperRow(scene, triggerScene))}
                    </div>
                </section>}
                
                {allAutomations.length > 0 && <section>
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Автоматизации</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allAutomations.map(auto => renderHelperRow(auto, triggerAutomation))}
                    </div>
                </section>}
                
                {allScripts.length > 0 && <section>
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Скрипты</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allScripts.map(script => renderHelperRow(script, triggerScript))}
                    </div>
                </section>}
            </div>
            
            <ConfirmDialog
                isOpen={!!deletingItem}
                title="Удалить элемент?"
                message={
                    <>
                        Вы уверены, что хотите удалить <strong className="text-black dark:text-white">"{deletingItem?.name}"</strong>?
                        <br />
                        Это действие нельзя отменить.
                    </>
                }
                onConfirm={confirmDelete}
                onCancel={() => setDeletingItem(null)}
                confirmText="Удалить"
            />
        </div>
    );
};

export default HelpersPage;
