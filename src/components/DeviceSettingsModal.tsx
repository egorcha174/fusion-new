
import React, { useState, useMemo } from 'react';
import { Device, DeviceCustomization, DeviceType, CardTemplates, DeviceBinding, CardTemplate, ThresholdRule } from '../types';
import DeviceIcon, { icons, getIconNameForDeviceType } from './DeviceIcon';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';

interface DeviceSettingsModalProps {
  device: Device;
  onClose: () => void;
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  device,
  onClose,
}) => {
  const { customizations, templates, handleSaveCustomization } = useAppStore();
  const { allKnownDevices } = useHAStore();
  
  const customization = customizations[device.id] || {};

  const getDefaultIcon = () => {
    if (customization.icon) return customization.icon;
    // Use the 'off' state icon as the default representation.
    return getIconNameForDeviceType(customization.type ?? device.type, false);
  };
  
  const [name, setName] = useState(customization.name ?? device.name);
  const [type, setType] = useState(customization.type ?? device.type);
  const [icon, setIcon] = useState<string>(getDefaultIcon());
  const [isHidden, setIsHidden] = useState(customization.isHidden ?? false);
  const [templateId, setTemplateId] = useState(customization.templateId ?? '');
  const [iconAnimation, setIconAnimation] = useState(customization.iconAnimation ?? 'none');
  const [bindings, setBindings] = useState<DeviceBinding[]>(customization.deviceBindings ?? []);
  const [thresholds, setThresholds] = useState<ThresholdRule[]>(customization.thresholds ?? []);


  const handleTypeChange = (newType: DeviceType) => {
    setType(newType);
    // When the type changes, also update the icon to match, using the Iconify name.
    setIcon(getIconNameForDeviceType(newType, false));
  };

  const handleSave = () => {
    handleSaveCustomization(device, {
      name: name.trim(),
      type,
      icon,
      isHidden,
      templateId,
      iconAnimation,
      deviceBindings: bindings,
      thresholds: thresholds,
    });
    onClose();
  };
  
  const handleBindingChange = (slotId: string, updates: Partial<DeviceBinding>) => {
    setBindings(prev => {
        const existingBindingIndex = prev.findIndex(b => b.slotId === slotId);
        if (existingBindingIndex > -1) {
            // Update existing binding
            const newBindings = [...prev];
            newBindings[existingBindingIndex] = { ...newBindings[existingBindingIndex], ...updates };
            return newBindings;
        } else {
            // Create new binding
            const newBinding: DeviceBinding = {
                slotId,
                entityId: '',
                enabled: true,
                ...updates
            };
            return [...prev, newBinding];
        }
    });
  };

  const handleAddThreshold = () => {
    const newRule: ThresholdRule = {
      value: 0,
      comparison: 'above',
      style: {},
    };
    setThresholds(prev => [...prev, newRule]);
  };

  const handleUpdateThreshold = (index: number, field: keyof ThresholdRule | 'style', value: any) => {
    setThresholds(prev => {
      const newThresholds = [...prev];
      if (field === 'style') {
        newThresholds[index] = { ...newThresholds[index], style: value };
      } else {
        newThresholds[index] = { ...newThresholds[index], [field]: value };
      }
      return newThresholds;
    });
  };
  
  const handleClearThresholdColor = (index: number, colorType: 'backgroundColor' | 'valueColor') => {
     setThresholds(prev => {
      const newThresholds = [...prev];
      const newStyle = { ...newThresholds[index].style };
      delete newStyle[colorType];
      newThresholds[index] = { ...newThresholds[index], style: newStyle };
      return newThresholds;
    });
  }

  const handleDeleteThreshold = (index: number) => {
    setThresholds(prev => prev.filter((_, i) => i !== index));
  };

  const availableTypes = Object.keys(DeviceType)
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
        value: Number(key),
        name: DeviceType[Number(key)]
    }));
    
  const availableIcons = Object.keys(icons).map(Number);
  
  const isTemplateable = [
    DeviceType.Sensor, DeviceType.Light, DeviceType.DimmableLight,
    DeviceType.Switch, DeviceType.Thermostat, DeviceType.Humidifier,
    DeviceType.Custom
  ].includes(type);

  const isSensor = type === DeviceType.Sensor;
  
  const getTemplateTypeString = (deviceType: DeviceType): 'sensor' | 'light' | 'switch' | 'climate' | 'humidifier' | 'custom' => {
    switch (deviceType) {
        case DeviceType.Light:
        case DeviceType.DimmableLight:
            return 'light';
        case DeviceType.Switch:
            return 'switch';
        case DeviceType.Thermostat:
            return 'climate';
        case DeviceType.Humidifier:
            return 'humidifier';
        case DeviceType.Custom:
            return 'custom';
        case DeviceType.Sensor:
        default:
            return 'sensor';
    }
  };

  const templateType = getTemplateTypeString(type);

  const animationOptions = [
    { value: 'none', name: 'Нет' },
    { value: 'spin', name: 'Вращение' },
    { value: 'pulse', name: 'Пульсация' },
    { value: 'glow', name: 'Сияние' },
  ];
  
  const effectiveTemplateId = templateId || (templateType === 'climate' ? 'default-climate' : '');
  const effectiveTemplate: CardTemplate | undefined = templates[effectiveTemplateId];
  const deviceSlots = effectiveTemplate?.deviceSlots;

  const sortedEntities = useMemo(() => Array.from(allKnownDevices.values()).sort((a: Device, b: Device) => a.name.localeCompare(b.name)), [allKnownDevices]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md ring-1 ring-black/5 dark:ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настроить устройство</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{device.name}</p>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          
          <div>
            <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название</label>
            <input
              id="deviceName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Тип устройства</label>
            <select
                id="deviceType"
                value={type}
                onChange={(e) => handleTypeChange(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
                {availableTypes.map(typeOption => (
                    <option key={typeOption.value} value={typeOption.value}>
                        {typeOption.name}
                    </option>
                ))}
            </select>
          </div>

          {isTemplateable && (
            <div>
              <label htmlFor="deviceTemplate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Шаблон</label>
              <select
                  id="deviceTemplate"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                  <option value="">По умолчанию</option>
                  {Object.values(templates)
                    .filter((template: CardTemplate) => template.deviceType === templateType)
                    .map((template: CardTemplate) => (
                      <option key={template.id} value={template.id}>
                          {template.name}
                      </option>
                  ))}
              </select>
            </div>
          )}
           {isSensor && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Пороги значений</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Изменяйте цвет фона или значения в зависимости от состояния сенсора.</p>
                <div className="space-y-2">
                {(thresholds).map((rule, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Правило #{index + 1}</span>
                            <button onClick={() => handleDeleteThreshold(index)} className="p-1 text-gray-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors">
                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={rule.comparison} onChange={(e) => handleUpdateThreshold(index, 'comparison', e.target.value)} className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none">
                                <option value="above">Больше чем</option>
                                <option value="below">Меньше чем</option>
                            </select>
                            <input type="number" value={rule.value} onChange={e => handleUpdateThreshold(index, 'value', parseFloat(e.target.value) ?? 0)} className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <label className="text-xs text-gray-500 dark:text-gray-400 truncate">Цвет фона</label>
                             <div className="flex items-center gap-2">
                                <input type="color" value={rule.style.backgroundColor || '#ffffff'} onChange={e => handleUpdateThreshold(index, 'style', { ...rule.style, backgroundColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                <button onClick={() => handleClearThresholdColor(index, 'backgroundColor')} title="Сбросить" className="p-1 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                </button>
                             </div>
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <label className="text-xs text-gray-500 dark:text-gray-400 truncate">Цвет значения</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={rule.style.valueColor || '#ffffff'} onChange={e => handleUpdateThreshold(index, 'style', { ...rule.style, valueColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                 <button onClick={() => handleClearThresholdColor(index, 'valueColor')} title="Сбросить" className="p-1 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                </button>
                              </div>
                        </div>
                    </div>
                ))}
                </div>
                <button onClick={handleAddThreshold} className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600/80 rounded-md py-2 transition-colors">
                    <Icon icon="mdi:plus" className="w-5 h-5"/>
                    Добавить правило
                </button>
            </div>
          )}

          {deviceSlots && deviceSlots.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Привязка индикаторов</h3>
                {deviceSlots.map((slot, index) => {
                    const binding = bindings.find(b => b.slotId === slot.id) || { enabled: false, entityId: '', icon: ''};
                    return (
                        <div key={slot.id} className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                           <div className="flex justify-between items-center">
                               <label className="font-medium text-gray-800 dark:text-gray-200">Слот #{index + 1}</label>
                                <button
                                    onClick={() => handleBindingChange(slot.id, { enabled: !binding.enabled })}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${binding.enabled ? 'bg-blue-600' : 'bg-gray-500 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${binding.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                           </div>
                           <div className={!binding.enabled ? 'opacity-50 pointer-events-none' : ''}>
                               <div>
                                   <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Устройство</label>
                                   <select
                                       value={binding.entityId}
                                       onChange={(e) => handleBindingChange(slot.id, { entityId: e.target.value })}
                                       className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                   >
                                       <option value="">-- Выберите устройство --</option>
                                       {sortedEntities.map((entity: Device) => (
                                           <option key={entity.id} value={entity.id}>{entity.name}</option>
                                       ))}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 mt-2">Иконка (переопределение)</label>
                                   <input
                                       type="text"
                                       value={binding.icon || ''}
                                       placeholder="Авто (из устройства)"
                                       onChange={(e) => handleBindingChange(slot.id, { icon: e.target.value })}
                                       className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                   />
                               </div>
                           </div>
                        </div>
                    )
                })}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Иконка</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Вставьте название с <a href="https://iconify.design/" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">Iconify.design</a> или выберите из стандартных.</p>
            <input
              id="deviceIcon"
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="например, mdi:lightbulb"
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg grid grid-cols-5 sm:grid-cols-7 gap-3">
                 {availableIcons.map(iconType => {
                    const iconName = getIconNameForDeviceType(iconType, false);
                    const isSelected = icon === iconName;
                    return (
                        <div key={iconType} onClick={() => setIcon(iconName)} className={`p-2 rounded-lg cursor-pointer transition-colors aspect-square flex items-center justify-center ${isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                           <div className="w-8 h-8 text-gray-500 dark:text-gray-400">
                            <DeviceIcon icon={iconType} isOn={false} className="!w-full !h-full !m-0" />
                           </div>
                        </div>
                    )
                 })}
            </div>
         </div>
          
          <div>
            <label htmlFor="iconAnimation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Анимация иконки (для вкл. состояния)</label>
            <select
              id="iconAnimation"
              value={iconAnimation}
              onChange={(e) => setIconAnimation(e.target.value as any)}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {animationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
            <div>
              <label htmlFor="isHidden" className="text-sm font-medium text-gray-800 dark:text-gray-200">Скрыть устройство</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Устройство не будет отображаться на дашборде.</p>
            </div>
            <button
              onClick={() => setIsHidden(!isHidden)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isHidden ? 'bg-red-600' : 'bg-gray-500 dark:bg-gray-600'}`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isHidden ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>

        <div className="p-6 flex justify-end gap-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DeviceSettingsModal);
