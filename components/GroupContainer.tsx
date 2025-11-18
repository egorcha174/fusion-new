import React from 'react';
import { Device, ColorScheme } from '../types';
import DeviceIcon from './DeviceIcon';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';

interface GroupContainerProps {
  device: Device;
  onClick: () => void;
  colorScheme: ColorScheme['light'];
}

/**
 * Компонент-контейнер для группы (папки), отображаемый на сетке дашборда.
 * Показывает мини-иконки до 4-х устройств внутри.
 */
const GroupContainer: React.FC<GroupContainerProps> = ({ device, onClick, colorScheme }) => {
    // ID группы извлекается из ID виртуального устройства
    const groupId = device.widgetId;
    
    // Получаем данные о группе и всех устройствах из хранилищ
    const group = useAppStore(state => state.groups.find(g => g.id === groupId));
    const allKnownDevices = useHAStore(state => state.allKnownDevices);

    // Если группа не найдена, ничего не рендерим
    if (!group) {
        return (
            <div className="w-full h-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs p-2">
                Ошибка: Группа не найдена
            </div>
        );
    }
    
    // Получаем полные объекты устройств, входящих в группу
    const devicesInGroup = group.deviceIds.map(id => allKnownDevices.get(id)).filter((d): d is Device => !!d);
    // Берем первые 4 для превью
    const previewDevices = devicesInGroup.slice(0, 4);
    // Создаем "пустышки" для красивого отображения сетки, если устройств меньше 4
    const placeholders = Array.from({ length: 4 - previewDevices.length });

    return (
        <div 
            onClick={onClick} 
            className="w-full h-full p-2 flex flex-col cursor-pointer transition-all duration-300"
            style={{ 
                backgroundColor: colorScheme.cardBackground, 
                borderRadius: `${colorScheme.cardBorderRadius}px`
            }}
        >
            {/* Сетка 2x2 для превью иконок */}
            <div className="grid grid-cols-2 grid-rows-2 gap-1 flex-grow">
                {previewDevices.map(d => (
                    <div key={d.id} className="bg-black/10 dark:bg-white/5 rounded-md flex items-center justify-center p-1">
                        <DeviceIcon icon={d.icon || d.type} isOn={d.state === 'on'} className="!w-full !h-full opacity-80" />
                    </div>
                ))}
                {placeholders.map((_, i) => (
                    <div key={`placeholder-${i}`} className="bg-black/5 dark:bg-white/5 rounded-md" />
                ))}
            </div>
            
            {/* Название и количество устройств */}
            <div className="flex-shrink-0 mt-1.5 text-left">
                <p className="text-sm font-semibold truncate" style={{ color: colorScheme.nameTextColor }}>{device.name}</p>
                <p className="text-xs opacity-70" style={{ color: colorScheme.statusTextColor }}>{devicesInGroup.length} устройств</p>
            </div>
        </div>
    );
};

export default GroupContainer;
