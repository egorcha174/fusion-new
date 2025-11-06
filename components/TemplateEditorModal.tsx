import React, { useState } from 'react';
import { CardTemplate, Device, DeviceType, CardElementId } from '../types';
import DeviceCard from './DeviceCard';

interface TemplateEditorModalProps {
  template: CardTemplate;
  onSave: (newTemplate: CardTemplate) => void;
  onClose: () => void;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ template, onSave, onClose }) => {
  const [editedTemplate, setEditedTemplate] = useState<CardTemplate>(template);

  const sampleDevice: Device = {
    id: 'sensor.sample_temperature',
    name: 'Температура в кабинете',
    status: '25.9',
    type: DeviceType.Sensor,
    unit: '°C',
    history: Array.from({ length: 20 }, (_, i) => 25 + Math.sin(i / 3) + (Math.random() - 0.5)),
    haDomain: 'sensor',
  };

  const handleElementVisibilityChange = (elementId: CardElementId, isVisible: boolean) => {
    setEditedTemplate(prev => ({
      ...prev,
      elements: {
        ...prev.elements,
        [elementId]: { visible: isVisible },
      },
    }));
  };
  
  const handleStyleChange = (styleKey: keyof CardTemplate['styles'], value: any) => {
    setEditedTemplate(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [styleKey]: value,
      },
    }));
  };
  
  const handleSave = () => {
    onSave(editedTemplate);
  };
  
  const elementLabels: Record<CardElementId, string> = {
      name: 'Название',
      icon: 'Иконка',
      value: 'Значение',
      unit: 'Единица изм.',
      chart: 'График',
      status: 'Статус' // Not used for sensor, but for completeness
  };

  const availableElements: CardElementId[] = ['name', 'icon', 'value', 'unit', 'chart'];
  
  const defaultBackgroundColor = 'rgb(31 41 55 / 0.8)';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-3xl ring-1 ring-white/10 flex"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Side: Preview */}
        <div className="w-1/3 bg-gray-900/50 p-8 flex flex-col items-center justify-center rounded-l-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Live Preview</h3>
          <div className="w-[180px] h-[180px] transition-all duration-300">
            <DeviceCard
              device={sampleDevice}
              template={editedTemplate}
              onTemperatureChange={() => {}}
              onBrightnessChange={() => {}}
              onPresetChange={() => {}}
              onCameraCardClick={() => {}}
              isEditMode={false}
              onEditDevice={() => {}}
              haUrl=""
              signPath={async () => ({path: ''})}
              getCameraStreamUrl={async () => ''}
            />
          </div>
        </div>
        
        {/* Right Side: Controls */}
        <div className="w-2/3 flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Редактор шаблона (Сенсор)</h2>
            <p className="text-sm text-gray-400">Изменения применяются ко всем сенсорам.</p>
          </div>
          
          <div className="p-6 space-y-6 flex-grow overflow-y-auto">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Элементы</label>
                <div className="grid grid-cols-2 gap-3">
                    {availableElements.map(elementId => (
                        <div key={elementId} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                            <label htmlFor={`toggle-${elementId}`} className="text-sm text-gray-200">{elementLabels[elementId]}</label>
                            <button
                              onClick={() => handleElementVisibilityChange(elementId, !editedTemplate.elements[elementId]?.visible)}
                              className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${editedTemplate.elements[elementId]?.visible ? 'bg-blue-600' : 'bg-gray-600'}`}
                            >
                              <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${editedTemplate.elements[elementId]?.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Стили</label>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="nameFontSize" className="text-sm text-gray-200">Размер названия</label>
                        <div className="flex items-center gap-2">
                           <input type="range" id="nameFontSize" min="10" max="24" value={editedTemplate.styles.nameFontSize} onChange={(e) => handleStyleChange('nameFontSize', parseInt(e.target.value))} className="w-32 accent-blue-500" />
                           <span className="text-xs text-gray-400 w-8 text-right">{editedTemplate.styles.nameFontSize}px</span>
                        </div>
                    </div>
                     <div className="flex items-center justify-between">
                        <label htmlFor="valueFontSize" className="text-sm text-gray-200">Размер значения</label>
                        <div className="flex items-center gap-2">
                           <input type="range" id="valueFontSize" min="20" max="64" value={editedTemplate.styles.valueFontSize} onChange={(e) => handleStyleChange('valueFontSize', parseInt(e.target.value))} className="w-32 accent-blue-500" />
                           <span className="text-xs text-gray-400 w-8 text-right">{editedTemplate.styles.valueFontSize}px</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="bgColor" className="text-sm text-gray-200">Цвет фона</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleStyleChange('backgroundColor', defaultBackgroundColor)}
                                title="Сбросить цвет"
                                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a5.002 5.002 0 008.057 4.918 1 1 0 011.885.666A7.002 7.002 0 012.199 14.101V17a1 1 0 01-2 0v-5a1 1 0 011-1h5a1 1 0 010 2H4.008z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <input type="color" id="bgColor" value={editedTemplate.styles.backgroundColor} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="p-6 flex justify-end gap-4 bg-gray-800/50 rounded-b-2xl border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorModal;