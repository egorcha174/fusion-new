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
    onChange: (updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => void;
    snapToGrid: boolean;
    unitMode: 'percent' | 'grid';
}

const ElementPropertiesEditor: React.FC<ElementPropertiesEditorProps> = ({ element, onChange, snapToGrid, unitMode }) => {
    const GRID_BASE = 20;
    const PERCENT_STEP = 100 / GRID_BASE;

    const updateStyle = (key: keyof ElementStyles, value: any) => {
        onChange({ styles: { [key]: value } });
    };

    const handleClearStyle = (key: keyof ElementStyles) => {
      const newStyles = { ...element.styles };
      delete newStyles[key];
      onChange({ styles: newStyles });
    };
    
    const handleNumericChange = (
        prop: 'x' | 'y' | 'width' | 'height',
        valueStr: string
    ) => {
        let num = parseFloat(valueStr);
        if (isNaN(num)) return;

        const isPosition = prop === 'x' || prop === 'y';
        let newPercent;

        if (unitMode === 'grid') {
            newPercent = num * PERCENT_STEP;
        } else {
            newPercent = num;
            if (snapToGrid) {
                newPercent = Math.round(newPercent / PERCENT_STEP) * PERCENT_STEP;
            }
        }
        
        newPercent = Math.max(0, Math.min(100, newPercent));

        const updates = isPosition
            ? { position: { ...element.position, [prop]: newPercent } }
            : { size: { ...element.size, [prop]: newPercent } };
        onChange(updates);
    };

    const handleAlign = (type: 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom') => {
        const { width, height } = element.size;
        let newPos = { ...element.position };
        switch(type) {
            case 'left': newPos.x = 0; break;
            case 'h-center': newPos.x = (100 - width) / 2; break;
            case 'right': newPos.x = 100 - width; break;
            case 'top': newPos.y = 0; break;
            case 'v-center': newPos.y = (100 - height) / 2; break;
            case 'bottom': newPos.y = 100 - height; break;
        }
        
        // Always snap alignment actions
        newPos.x = Math.round(newPos.x / PERCENT_STEP) * PERCENT_STEP;
        newPos.y = Math.round(newPos.y / PERCENT_STEP) * PERCENT_STEP;

        onChange({ position: newPos });
    };

    const xVal = unitMode === 'grid' ? Math.round(element.position.x / PERCENT_STEP) : element.position.x;
    const yVal = unitMode === 'grid' ? Math.round(element.position.y / PERCENT_STEP) : element.position.y;
    const wVal = unitMode === 'grid' ? Math.round(element.size.width / PERCENT_STEP) : element.size.width;
    const hVal = unitMode === 'grid' ? Math.round(element.size.height / PERCENT_STEP) : element.size.height;
    
    const unitLabel = unitMode === 'grid' ? 'gu' : '%';
    const inputStep = unitMode === 'grid' ? 1 : (snapToGrid ? PERCENT_STEP : 1);


    return (
        <div className="space-y-4 p-1">
            <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Расположение</label>
                <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-[10px] text-gray-400">X ({unitLabel})</span><input type="number" value={xVal} onChange={e => handleNumericChange('x', e.target.value)} step={inputStep} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Y ({unitLabel})</span><input type="number" value={yVal} onChange={e => handleNumericChange('y', e.target.value)} step={inputStep} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">W ({unitLabel})</span><input type="number" min="0" value={wVal} onChange={e => handleNumericChange('width', e.target.value)} step={inputStep} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">H ({unitLabel})</span><input type="number" min="0" value={hVal} onChange={e => handleNumericChange('height', e.target.value)} step={inputStep} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                </div>
                 <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Выравнивание</label>
                    <div className="grid grid-cols-3 gap-1">
                        <button onClick={() => handleAlign('left')} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon="mdi:format-align-left" className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => handleAlign('h-center')} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon="mdi:format-align-center" className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => handleAlign('right')} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon="mdi:format-align-right" className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => handleAlign('top')} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon="mdi:format-align-top" className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => handleAlign('v-center')} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon="mdi:format-align-middle" className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => handleAlign('bottom')} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon="mdi:format-align-bottom" className="w-4 h-4 mx-auto" /></button>
                    </div>
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Z-Index (Слой)</label>
                <input type="number" value={element.zIndex} onChange={e => onChange({ zIndex: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
            </div>

            {(element.id === 'name' || element.id === 'value' || element.id === 'status' || element.id === 'unit' || element.id === 'temperature') && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                     <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Типографика</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Размер шрифта (px)</label>
                        <input type="number" min="0" value={element.styles.fontSize || 14} onChange={e => updateStyle('fontSize', parseInt(e.target.value) || undefined)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Выравнивание текста</label>
                        <select value={element.styles.textAlign || 'left'} onChange={e => updateStyle('textAlign', e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="left">Слева</option>
                            <option value="center">По центру</option>
                            <option value="right">Справа</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет текста (опционально)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.color || '#000000'} onChange={e => updateStyle('color', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('color')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                </div>
            )}

            {(element.id === 'value' || element.id === 'temperature') && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Знаков после запятой</label>
                    <input type="number" min="0" max="5" placeholder="Авто" value={element.styles.decimalPlaces ?? ''} onChange={e => updateStyle('decimalPlaces', e.target.value === '' ? undefined : parseInt(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                </div>
            )}
            
            {element.id === 'icon' && (
                 <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Стили иконки</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет (ВКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.onColor || '#FCD34D'} onChange={e => updateStyle('onColor', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('onColor')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет (ВЫКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.offColor || '#9CA3AF'} onChange={e => updateStyle('offColor', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('offColor')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Фон (ВКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.iconBackgroundColorOn || '#FFFFFF'} onChange={e => updateStyle('iconBackgroundColorOn', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('iconBackgroundColorOn')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Фон (ВЫКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.iconBackgroundColorOff || '#FFFFFF'} onChange={e => updateStyle('iconBackgroundColorOff', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('iconBackgroundColorOff')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                 </div>
            )}

            {element.id === 'chart' && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Настройки графика</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тип графика</label>
                        <select value={element.styles.chartType || 'gradient'} onChange={e => updateStyle('chartType', e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="line">Линия</option>
                            <option value="gradient">Градиент</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Период (часов)</label>
                        <input type="number" min="1" value={element.styles.chartTimeRange || 24} onChange={e => updateStyle('chartTimeRange', parseInt(e.target.value) || 24)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                    </div>
                </div>
            )}
            
            {element.id === 'linked-entity' && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Показывать значение</label>
                    <input type="checkbox" checked={element.styles.showValue ?? true} onChange={e => updateStyle('showValue', e.target.checked)} className="accent-blue-600" />
                </div>
            )}
        </div>
    );
};

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ templateToEdit, onClose }) => {
  const { handleSaveTemplate } = useAppStore();
  const { colorScheme } = useAppStore();
  const [template, setTemplate] = useState<CardTemplate>(JSON.parse(JSON.stringify(templateToEdit)));
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [unitMode, setUnitMode] = useState<'percent' | 'grid'>('percent');
  
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

  const handleElementUpdate = (uniqueId: string, updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => {
      setTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(e => {
              if (e.uniqueId !== uniqueId) return e;
  
              const { styles, position, size, ...otherUpdates } = updates as any;
  
              const mergedStyles = styles ? { ...e.styles, ...styles } : e.styles;
              const mergedPosition = position ? { ...e.position, ...position } : e.position;
              const mergedSize = size ? { ...e.size, ...size } : e.size;
              
              return { ...e, ...otherUpdates, styles: mergedStyles, position: mergedPosition, size: mergedSize };
          })
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

  const previewDevice: Device = useMemo(() => ({
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
      unit: '°C'
  }), [template.deviceType]);
  
  const mockAllDevices = new Map<string, Device>();
  mockAllDevices.set(previewDevice.id, previewDevice);

  const availableElements: { id: CardElementId; label: string }[] = [
    { id: 'name', label: 'Название' },
    { id: 'icon', label: 'Иконка' },
    { id: 'status', label: 'Статус' },
    { id: 'value', label: 'Значение (State)' },
    { id: 'unit', label: 'Единица измерения' },
  ];

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

  const previewWidth = (template.width || 1) * 160;
  const previewHeight = (template.height || 1) * 160;

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
            <div className="w-80 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя шаблона</label>
                    <input type="text" value={template.name} onChange={e => setTemplate(prev => ({...prev, name: e.target.value}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Ширина (ячейки)</label>
                            <input type="number" min="0.5" max="4" step="0.5" value={template.width || 1} onChange={e => setTemplate(prev => ({...prev, width: parseFloat(e.target.value) || 1}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Высота (ячейки)</label>
                            <input type="number" min="0.5" max="4" step="0.5" value={template.height || 1} onChange={e => setTemplate(prev => ({...prev, height: parseFloat(e.target.value) || 1}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <label htmlFor="snap-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">Привязка к сетке</label>
                        <button
                            id="snap-toggle"
                            onClick={() => setSnapToGrid(!snapToGrid)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${snapToGrid ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${snapToGrid ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Единицы</label>
                        <div className="flex items-center gap-1 p-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                            <button onClick={() => setUnitMode('percent')} className={`px-3 py-1 text-xs rounded-md transition-all ${unitMode === 'percent' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>%</button>
                            <button onClick={() => setUnitMode('grid')} className={`px-3 py-1 text-xs rounded-md transition-all ${unitMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>Grid</button>
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

            <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-8 flex items-center justify-center relative overflow-hidden grid-background">
                <div 
                    className="relative bg-transparent transition-all duration-300"
                    style={{
                        width: previewWidth,
                        height: previewHeight,
                    }}
                >
                    <DeviceCard
                        device={previewDevice}
                        template={template}
                        cardWidth={template.width || 1}
                        cardHeight={template.height || 1}
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
                        colorScheme={colorScheme['light']}
                        isDark={false}
                    />
                    
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

            {selectedElement && (
                <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-gray-900 dark:text-white">Свойства: {ELEMENT_LABELS[selectedElement.id]}</h3>
                    </div>
                    <div className="p-4 overflow-y-auto no-scrollbar">
                        <ElementPropertiesEditor 
                            element={selectedElement} 
                            onChange={(updates) => handleElementUpdate(selectedElement.uniqueId, updates)} 
                            snapToGrid={snapToGrid}
                            unitMode={unitMode}
                        />
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorModal;