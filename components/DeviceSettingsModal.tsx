

import React, { useState } from 'react';
import { Device, DeviceCustomization, DeviceType } from '../types';
import DeviceIcon, { icons } from './DeviceIcon';

interface DeviceSettingsModalProps {
  device: Device;
  customization: DeviceCustomization;
  onSave: (deviceId: string, customization: DeviceCustomization) => void;
  onClose: () => void;
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  device,
  customization,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(customization.name ?? device.name);
  const [type, setType] = useState(customization.type ?? device.type);
  const [icon, setIcon] = useState(device.icon ?? device.type);
  const [isHidden, setIsHidden] = useState(customization.isHidden ?? false);


  const handleSave = () => {
    const finalCustomization: DeviceCustomization = {
      name: name.trim() !== device.name ? name.trim() : undefined,
      type: type !== device.type ? type : undefined,
      // Save the icon override only if the selected icon is different
      // from the icon that would be inferred from the selected type.
      icon: icon !== type ? icon : undefined,
      isHidden: isHidden,
    };
    onSave(device.id, finalCustomization);
  };
  
  const availableTypes = Object.keys(DeviceType)
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
        value: Number(key) as DeviceType,
        name: DeviceType[Number(key) as DeviceType]
    }));
    
  const availableIcons = Object.keys(icons).map(Number) as DeviceType[];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-md ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Настроить устройство</h2>
            <p className="text-sm text-gray-400">{device.name}</p>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor="deviceName" className="block text-sm font-medium text-gray-300 mb-2">Название</label>
            <input
              id="deviceName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="deviceType" className="block text-sm font-medium text-gray-300 mb-2">Тип устройства</label>
            <p className="text-xs text-gray-400 mb-2">Определяет поведение карточки. Используйте, если автоопределение неверно.</p>
            <select
                id="deviceType"
                value={type}
                onChange={(e) => setType(Number(e.target.value) as DeviceType)}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
                {availableTypes.map(typeOption => (
                    <option key={typeOption.value} value={typeOption.value}>
                        {typeOption.name}
                    </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Иконка</label>
            <div className="bg-gray-700/50 p-3 rounded-lg grid grid-cols-5 sm:grid-cols-7 gap-3">
                 {availableIcons.map(iconType => {
                    const isSelected = icon === iconType;
                    return (
                        <div key={iconType} onClick={() => setIcon(iconType)} className={`p-2 rounded-lg cursor-pointer transition-colors aspect-square flex items-center justify-center ${isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                           <div className="w-8 h-8">
                            <DeviceIcon type={iconType} isOn={false} cardSize="sm" />
                           </div>
                        </div>
                    )
                 })}
            </div>
         </div>
          
          <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
            <div>
              <label htmlFor="isHidden" className="text-sm font-medium text-gray-200">Скрыть устройство</label>
              <p className="text-xs text-gray-400">Устройство не будет отображаться на дашборде.</p>
            </div>
            <button
              onClick={() => setIsHidden(!isHidden)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isHidden ? 'bg-red-600' : 'bg-gray-600'}`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isHidden ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>

        <div className="p-6 flex justify-end gap-4 bg-gray-800/50 rounded-b-2xl border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default DeviceSettingsModal;