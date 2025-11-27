
import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { CardTemplate, CardElement, DeviceType, CardElementId, ElementStyles, Device } from '../types';
import { nanoid } from 'nanoid';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';

interface TemplateEditorModalProps {
  templateToEdit: CardTemplate;
  onClose: () => void;
}

const ELEMENT_LABELS: Record<CardElementId, string> = {
  name: 'Название',
  icon: 'Иконка',
  value: 'Значение',
  unit: 'Единица изм.',
  chart: 'График',
  status: 'Статус',
  slider: 'Слайдер',
  temperature: 'Текущая темп.',
  'target-temperature': 'Термостат (кольцо)',
  'hvac-modes': 'Режимы климата',
  'linked-entity': 'Связанное устройство',
  battery: 'Уровень заряда',
  'fan-speed-control': 'Скорость вентилятора'
};

interface SortableLayerItemProps {
  element: CardElement;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ element, isSelected, onSelect, onToggleVisibility, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: element.uniqueId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`flex items-center justify-between p-2 mb-2 rounded-md border cursor-move ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`} onClick={onSelect}>
        <div className="flex items-center gap-2">
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Icon icon="mdi:drag" className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{ELEMENT_LABELS[element.id]}</span>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${element.visible ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>
                <Icon icon={element.visible ? "mdi:eye" : "mdi:eye-off"} className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500">
                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
};

interface ElementPropertiesEditorProps {
    element: CardElement;
    onChange: (updates: Partial<CardElement> | Partial<ElementStyles>) => void;
}

const ElementPropertiesEditor: React.FC<ElementPropertiesEditorProps> = ({ element, onChange }) => {
    const updateStyle = (key: keyof ElementStyles, value: any) => {
        onChange({ styles: { ...element.styles, [key]: value } });
    };

    return (
        <div className="space-y-4 p-1">
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Позиция и Размер (%)</label>
                <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-[10px] text-gray-400">X</span><input type="number" value={element.position.x} onChange={e => onChange({ position: { ...element.position, x: parseFloat(e.target.value) } })} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Y</span><input type="number" value={element.position.y} onChange={e => onChange({ position: { ...element.position, y: parseFloat(e.target.value) } })} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">W</span><input type="number" value={element.size.width} onChange={e => onChange({ size: { ...element.size, width: parseFloat(e.target.value) } })} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">H</span><input type="number" value={element.size.height} onChange={e => onChange({ size: { ...element.size, height: parseFloat(e.target.value) } })} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Z-Index (Слой)</label>
                <input type="number" value={element.zIndex} onChange={e => onChange({ zIndex: parseInt(e.target.value) })} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
            </div>

            {(element.id === 'name' || element.id === 'value' || element.id === 'status' || element.id === 'unit' || element.id === 'temperature') && (
                <>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Размер шрифта (px)</label>
                        <input type="number" value={element.styles.fontSize || 14} onChange={e => updateStyle('fontSize', parseInt(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Выравнивание</label>
                        <select value={element.styles.textAlign || 'left'} onChange={e => updateStyle('textAlign', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="left">Слева</option>
                            <option value="center">По центру</option>
                            <option value="right">Справа</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет текста (опционально)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.color || '#000000'} onChange={e => updateStyle('color', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => { const s = {...element.styles}; delete s.color; onChange({styles: s}); }} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                </>
            )}
            
            {element.id === 'icon' && (
                 <>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет (ВКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.onColor || '#FCD34D'} onChange={e => updateStyle('onColor', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => { const s = {...element.styles}; delete s.onColor; onChange({styles: s}); }} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет (ВЫКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.offColor || '#9CA3AF'} onChange={e => updateStyle('offColor', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => { const s = {...element.styles}; delete s.offColor; onChange({styles: s}); }} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Фон иконки (ВКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.iconBackgroundColorOn || '#FFFFFF'} onChange={e => updateStyle('iconBackgroundColorOn', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => { const s = {...element.styles}; delete s.iconBackgroundColorOn; onChange({styles: s}); }} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                 </>
            )}

            {element.id === 'chart' && (
                <>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тип графика</label>
                        <select value={element.styles.chartType || 'gradient'} onChange={e => updateStyle('chartType', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="line">Линия</option>
                            <option value="gradient">Градиент</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Период (часов)</label>
                        <input type="number" value={element.styles.chartTimeRange || 24} onChange={e => updateStyle('chartTimeRange', parseInt(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                    </div>
                </>
            )}
            
            {element.id === 'linked-entity' && (
                <>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Показывать значение</label>
                        <input type="checkbox" checked={element.styles.showValue ?? true} onChange={e => updateStyle('showValue', e.target.checked)} className="accent-blue-600" />
                    </div>
                </>
            )}
        </div>
    );
};

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ templateToEdit, onClose }) => {
  const { handleSaveTemplate } = useAppStore();
  const { colorScheme } = useAppStore();
  const [template, setTemplate] = useState<CardTemplate>(JSON.parse(JSON.stringify(templateToEdit)));
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Dnd Sensors
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setTemplate((prev) => {
        const oldIndex = prev.elements.findIndex((e) => e.uniqueId === active.id);
        const newIndex = prev.elements.findIndex((e) => e.uniqueId === over?.id);
        return { ...prev, elements: arrayMove(prev.elements, oldIndex, newIndex) };
      });
    }
  };

  const handleAddElement = (elementId: CardElementId) => {
    const newElement: CardElement = {
      id: elementId,
      uniqueId: nanoid(),
      visible: true,
      position: { x: 10, y: 10 },
      size: { width: 30, height: 20 },
      zIndex: template.elements.length + 1,
      styles: { fontSize: 14 }
    };
    if (elementId === 'chart') newElement.size = { width: 100, height: 30 };
    if (elementId === 'icon') newElement.size = { width: 20, height: 20 };
    if (elementId === 'slider') newElement.size = { width: 90, height: 20 };
    
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
    setSelectedElementId(newElement.uniqueId);
  };

  const handleRemoveElement = (uniqueId: string) => {
    setTemplate(prev => ({ ...prev, elements: prev.elements.filter(e => e.uniqueId !== uniqueId) }));
    if (selectedElementId === uniqueId) setSelectedElementId(null);
  };

  const handleElementUpdate = (uniqueId: string, updates: any) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(e => e.uniqueId === uniqueId ? { ...e, ...updates, styles: { ...e.styles, ...(updates.styles || {}) }, position: { ...e.position, ...(updates.position || {}) }, size: { ...e.size, ...(updates.size || {}) } } : e)
    }));
  };

  const handleToggleVisibility = (uniqueId: string) => {
      setTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(e => e.uniqueId === uniqueId ? { ...e, visible: !e.visible } : e)
      }));
  };

  const handleSave = () => {
    handleSaveTemplate(template);
    onClose();
  };

  const selectedElement = template.elements.find(e => e.uniqueId === selectedElementId);

  // Fake device for preview
  const previewDevice: Device = {
      id: 'preview_device',
      name: 'Устройство (Пример)',
      status: 'Активно',
      state: 'on',
      type: (template.deviceType as unknown as DeviceType) || DeviceType.Sensor,
      haDomain: 'sensor',
      attributes: {},
      brightness: 80,
      temperature: 22.5,
      targetTemperature: 24,
      hvacAction: 'heating',
      batteryLevel: 85,
  };
  
  const mockAllDevices = new Map<string, Device>();
  mockAllDevices.set(previewDevice.id, previewDevice);

  const availableElements: { id: CardElementId; label: string }[] = [
    { id: 'name', label: 'Название' },
    { id: 'icon', label: 'Иконка' },
    { id: 'status', label: 'Статус' },
    { id: 'value', label: 'Значение (State)' },
    { id: 'unit', label: 'Единица измерения' },
  ];

  // Conditional elements based on device type
  if (['sensor', 'climate', 'custom', 'humidifier'].includes(template.deviceType)) {
      availableElements.push({ id: 'chart', label: 'График' });
  }
  if (['light', 'custom'].includes(template.deviceType)) {
      availableElements.push({ id: 'slider', label: 'Слайдер яркости' });
  }
  if (['climate', 'humidifier', 'custom', 'sensor'].includes(template.deviceType)) {
      availableElements.push({ id: 'temperature', label: 'Текущая температура/значение' });
  }
  if (['climate', 'humidifier', 'custom'].includes(template.deviceType)) {
      availableElements.push({ id: 'target-temperature', label: 'Кольцо управления (Target)' });
  }
  if (['climate', 'humidifier', 'custom'].includes(template.deviceType)) {
      availableElements.push({ id: 'hvac-modes', label: 'Кнопки режимов' });
  }
  if (['custom'].includes(template.deviceType)) {
      availableElements.push({ id: 'linked-entity', label: 'Связанное устройство' });
      availableElements.push({ id: 'battery', label: 'Уровень заряда' });
  }
  if (['humidifier', 'custom'].includes(template.deviceType)) {
      availableElements.push({ id: 'fan-speed-control', label: 'Управление вентилятором' });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Редактор шаблона</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{template.deviceType}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">Отмена</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Сохранить</button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Elements List & Settings */}
            <div className="w-80 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя шаблона</label>
                    <input type="text" value={template.name} onChange={e => setTemplate(prev => ({...prev, name: e.target.value}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Ширина (ячейки)</label>
                            <input type="number" min="1" max="4" value={template.width || 1} onChange={e => setTemplate(prev => ({...prev, width: parseInt(e.target.value)}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Высота (ячейки)</label>
                            <input type="number" min="1" max="4" value={template.height || 1} onChange={e => setTemplate(prev => ({...prev, height: parseInt(e.target.value)}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Слои (перетащите для порядка)</label>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={template.elements.map(e => e.uniqueId)} strategy={verticalListSortingStrategy}>
                                {template.elements.map(element => (
                                    <SortableLayerItem 
                                        key={element.uniqueId} 
                                        element={element} 
                                        isSelected={selectedElementId === element.uniqueId}
                                        onSelect={() => setSelectedElementId(element.uniqueId)}
                                        onToggleVisibility={() => handleToggleVisibility(element.uniqueId)}
                                        onDelete={() => handleRemoveElement(element.uniqueId)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Добавить элемент</label>
                        <select onChange={(e) => { if (e.target.value) { handleAddElement(e.target.value as CardElementId); e.target.value = ''; } }} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none">
                            <option value="">Выберите элемент...</option>
                            {availableElements.map(el => (
                                <option key={el.id} value={el.id}>{el.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Center: Preview Area */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-8 flex items-center justify-center relative overflow-hidden">
                <div 
                    className="relative bg-transparent transition-all duration-300"
                    style={{
                        width: (template.width || 1) * 160, // approximate visualization width
                        height: (template.height || 1) * 160,
                    }}
                >
                    <DeviceCard
                        device={previewDevice}
                        template={template}
                        allKnownDevices={mockAllDevices}
                        customizations={{}}
                        isEditMode={false}
                        isPreview={true}
                        onDeviceToggle={() => {}}
                        onTemperatureChange={() => {}}
                        onBrightnessChange={() => {}}
                        onHvacModeChange={() => {}}
                        onPresetChange={() => {}}
                        onFanSpeedChange={() => {}}
                        onEditDevice={() => {}}
                        haUrl=""
                        signPath={async (p) => ({ path: p })}
                        getCameraStreamUrl={async () => ({ url: '' })}
                        onCameraCardClick={() => {}}
                        colorScheme={colorScheme['light']}
                        isDark={false}
                    />
                    
                    {/* Overlay for selection and movement visualization in preview */}
                    {template.elements.map(el => el.visible && (
                        <div
                            key={el.uniqueId}
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.uniqueId); }}
                            className={`absolute border-2 transition-all duration-200 cursor-pointer ${selectedElementId === el.uniqueId ? 'border-blue-500 z-50 bg-blue-500/10' : 'border-transparent hover:border-blue-300/50'}`}
                            style={{
                                left: `${el.position.x}%`,
                                top: `${el.position.y}%`,
                                width: `${el.size.width}%`,
                                height: `${el.size.height}%`,
                            }}
                        />
                    ))}
                </div>
                <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                    Превью (Light Mode)
                </div>
            </div>

            {/* Right Sidebar: Element Properties */}
            {selectedElement && (
                <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-gray-900 dark:text-white">Свойства: {ELEMENT_LABELS[selectedElement.id]}</h3>
                    </div>
                    <div className="p-4 overflow-y-auto">
                        <ElementPropertiesEditor element={selectedElement} onChange={(updates) => handleElementUpdate(selectedElement.uniqueId, updates)} />
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorModal;
