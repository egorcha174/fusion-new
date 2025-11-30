import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { CardTemplate, CardElement, DeviceType, CardElementId, ElementStyles, Device } from '../types';
import { nanoid } from 'nanoid';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';

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
  onSelect: (e: React.MouseEvent) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ element, isSelected, onSelect, onToggleVisibility, onToggleLock, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: element.uniqueId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`flex items-center justify-between p-2 mb-2 rounded-md border transition-colors ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'}`} onClick={onSelect}>
        <div className="flex items-center gap-2 overflow-hidden">
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                <Icon icon="mdi:drag" className="w-5 h-5" />
            </div>
            {element.locked && <Icon icon="mdi:pin" className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{ELEMENT_LABELS[element.id]}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${element.visible ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} title={element.visible ? "Скрыть" : "Показать"}>
                <Icon icon={element.visible ? "mdi:eye" : "mdi:eye-off"} className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${element.locked ? 'text-blue-500' : 'text-gray-400'}`} title={element.locked ? "Открепить" : "Закрепить"}>
                <Icon icon={element.locked ? "mdi:pin" : "mdi:pin-outline"} className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500" title="Удалить">
                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
};

interface ElementPropertiesEditorProps {
    element: CardElement;
    template: CardTemplate;
    onChange: (updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => void;
    snapToGrid: boolean;
}

const ElementPropertiesEditor: React.FC<ElementPropertiesEditorProps> = ({ element, template, onChange, snapToGrid }) => {
    const GRID_STEP = 5;

    const updateStyle = (key: keyof ElementStyles, value: any) => {
        onChange({ styles: { [key]: value } });
    };

    const handleClearStyle = (key: keyof ElementStyles) => {
      const newStyles = { ...element.styles };
      delete newStyles[key];
      onChange({ styles: newStyles });
    };
    
    const handleNumericChange = (updateFunc: (val: number | undefined) => void, value: string, shouldSnap: boolean, allowUndefined: boolean = false, min: number | null = null) => {
        if (value.trim() === '' && allowUndefined) {
            updateFunc(undefined);
            return;
        }
        let numValue = parseFloat(value);
        if (isNaN(numValue)) {
            if (value.trim() === '' && !allowUndefined) {
                numValue = 0;
            } else {
                return;
            }
        }
        
        if(min !== null) numValue = Math.max(min, numValue);
        
        const finalValue = (shouldSnap && snapToGrid) ? Math.round(numValue / GRID_STEP) * GRID_STEP : numValue;
        updateFunc(finalValue);
    };

    const currentSizeMode = element.sizeMode || 'card';

    return (
        <div className="space-y-4 p-1">
            <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Координаты</label>
                    <div className="flex items-center gap-1 p-0.5 bg-gray-200 dark:bg-gray-900/50 rounded-md">
                        <button onClick={() => onChange({ sizeMode: 'card' })} className={`px-2 py-0.5 text-[10px] rounded transition-all ${currentSizeMode === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Карточки</button>
                        <button onClick={() => onChange({ sizeMode: 'cell' })} className={`px-2 py-0.5 text-[10px] rounded transition-all ${currentSizeMode === 'cell' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Ячейки</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-[10px] text-gray-400">Центр X (%)</span><input type="number" value={element.position.x} onChange={e => handleNumericChange((val) => onChange({ position: { ...element.position, x: val as number } }), e.target.value, true)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Центр Y (%)</span><input type="number" value={element.position.y} onChange={e => handleNumericChange((val) => onChange({ position: { ...element.position, y: val as number } }), e.target.value, true)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Ширина (%)</span><input type="number" min="0" value={element.size.width} onChange={e => handleNumericChange((val) => onChange({ size: { ...element.size, width: val as number } }), e.target.value, true, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Высота (%)</span><input type="number" min="0" value={element.size.height} onChange={e => handleNumericChange((val) => onChange({ size: { ...element.size, height: val as number } }), e.target.value, true, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Z-Index (Слой)</label>
                <input type="number" value={element.zIndex} onChange={e => handleNumericChange((val) => onChange({ zIndex: val as number }), e.target.value, false)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
            </div>

            {(element.id === 'name' || element.id === 'value' || element.id === 'status' || element.id === 'unit' || element.id === 'temperature') && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                     <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Типографика</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Размер шрифта (px)</label>
                        <input type="number" min="0" value={element.styles.fontSize || 14} onChange={e => handleNumericChange((val) => updateStyle('fontSize', val), e.target.value, false, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
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
                    <input type="number" min="0" max="5" placeholder="Авто" value={element.styles.decimalPlaces ?? ''} onChange={e => handleNumericChange((val) => updateStyle('decimalPlaces', val), e.target.value, false, true, 0)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
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
                        <input type="number" min="1" value={element.styles.chartTimeRange || 24} onChange={e => handleNumericChange((val) => updateStyle('chartTimeRange', val), e.target.value, false, false, 1)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
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
  const { handleSaveTemplate, colorScheme } = useAppStore();
  const [template, setTemplate] = useState<CardTemplate>(JSON.parse(JSON.stringify(templateToEdit)));
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const sensors = useSensors(useSensor(PointerSensor));

  const handleLayerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTemplate((prev) => {
        const oldIndex = prev.elements.findIndex((e) => e.uniqueId === active.id);
        const newIndex = prev.elements.findIndex((e) => e.uniqueId === over.id);
        const newElements = arrayMove(prev.elements, oldIndex, newIndex);
        return { ...prev, elements: newElements.map((el, index) => ({...el, zIndex: index + 1})) };
      });
    }
  };

  const handleAddElement = (elementId: CardElementId) => {
    const newElement: CardElement = {
      id: elementId,
      uniqueId: nanoid(),
      visible: true,
      position: { x: 50, y: 50 },
      size: { width: 30, height: 20 },
      zIndex: template.elements.length + 1,
      styles: { fontSize: 14 },
      sizeMode: 'card'
    };
    if (elementId === 'chart') newElement.size = { width: 100, height: 30 };
    if (elementId === 'icon') newElement.size = { width: 20, height: 20 };
    if (elementId === 'slider') newElement.size = { width: 90, height: 20 };
    
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
    setSelectedElementIds([newElement.uniqueId]);
  };

  const handleRemoveElement = (uniqueId: string) => {
    setTemplate(prev => ({ ...prev, elements: prev.elements.filter(e => e.uniqueId !== uniqueId) }));
    setSelectedElementIds(prev => prev.filter(id => id !== uniqueId));
  };
  
  const handleElementUpdate = (uniqueId: string, updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => {
      setTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(e => {
              if (e.uniqueId !== uniqueId) return e;
              const { styles, position, size, ...otherUpdates } = updates as any;
              return { ...e, ...otherUpdates, 
                styles: styles ? { ...e.styles, ...styles } : e.styles, 
                position: position ? { ...e.position, ...position } : e.position, 
                size: size ? { ...e.size, ...size } : e.size 
              };
          })
      }));
  };

  const handleToggleVisibility = (uniqueId: string) => {
      setTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(e => e.uniqueId === uniqueId ? { ...e, visible: !e.visible } : e)
      }));
  };

  const handleToggleLock = (uniqueId: string) => {
    setTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(e => e.uniqueId === uniqueId ? { ...e, locked: !e.locked } : e)
    }));
  };
  
  const handleSelectElement = (e: React.MouseEvent, uniqueId: string) => {
    e.stopPropagation();
    const element = template.elements.find(el => el.uniqueId === uniqueId);
    if (element?.locked) return;

    if (e.shiftKey) {
        setSelectedElementIds(prev => 
            prev.includes(uniqueId) 
            ? prev.filter(id => id !== uniqueId) 
            : [...prev, uniqueId]
        );
    } else {
        setSelectedElementIds([uniqueId]);
    }
  };

  const handleCanvasDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    setActiveDragId(null);
    if (delta.x === 0 && delta.y === 0) return;

    const previewWidth = (template.width || 1) * 160;
    const previewHeight = (template.height || 1) * 160;

    const dxPercent = (delta.x / previewWidth) * 100;
    const dyPercent = (delta.y / previewHeight) * 100;

    setTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(el => {
            if (!selectedElementIds.includes(el.uniqueId)) return el;

            let newX = el.position.x + dxPercent;
            let newY = el.position.y + dyPercent;

            if (snapToGrid) {
                newX = Math.round(newX / 5) * 5;
                newY = Math.round(newY / 5) * 5;
            }

            return { ...el, position: { x: newX, y: newY } };
        })
    }));
  };
  
  const handleAlign = (type: 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom') => {
      const selected = template.elements.filter(el => selectedElementIds.includes(el.uniqueId));
      if (selected.length < 2) return;

      const boundingBox = selected.reduce((acc, el) => {
          return {
              minX: Math.min(acc.minX, el.position.x - el.size.width / 2),
              maxX: Math.max(acc.maxX, el.position.x + el.size.width / 2),
              minY: Math.min(acc.minY, el.position.y - el.size.height / 2),
              maxY: Math.max(acc.maxY, el.position.y + el.size.height / 2),
          }
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

      const newElements = template.elements.map(el => {
          if (!selectedElementIds.includes(el.uniqueId)) return el;
          let { x, y } = el.position;
          switch (type) {
              case 'left': x = boundingBox.minX + el.size.width / 2; break;
              case 'h-center': x = (boundingBox.minX + boundingBox.maxX) / 2; break;
              case 'right': x = boundingBox.maxX - el.size.width / 2; break;
              case 'top': y = boundingBox.minY + el.size.height / 2; break;
              case 'v-center': y = (boundingBox.minY + boundingBox.maxY) / 2; break;
              case 'bottom': y = boundingBox.maxY - el.size.height / 2; break;
          }
           if (snapToGrid) {
               x = Math.round(x / 5) * 5;
               y = Math.round(y / 5) * 5;
           }
          return { ...el, position: { x, y } };
      });
      setTemplate(prev => ({ ...prev, elements: newElements }));
  };

  const handleSave = () => { handleSaveTemplate(template); onClose(); };

  const lastSelectedId = selectedElementIds.length > 0 ? selectedElementIds[selectedElementIds.length - 1] : null;
  const selectedElement = lastSelectedId ? template.elements.find(e => e.uniqueId === lastSelectedId) : null;
  
  const previewDevice: Device = useMemo(() => ({
      id: 'preview_device', name: 'Устройство (Пример)', status: 'Активно', state: 'on',
      type: (template.deviceType as unknown as DeviceType) || DeviceType.Sensor,
      haDomain: 'sensor', attributes: {}, brightness: 80, temperature: 22.5,
      targetTemperature: 24, hvacAction: 'heating', batteryLevel: 85, unit: '°C'
  }), [template.deviceType]);
  const mockAllDevices = new Map<string, Device>([[previewDevice.id, previewDevice]]);

  const availableElements = useMemo(() => {
    const base = [
        { id: 'name', label: 'Название' }, { id: 'icon', label: 'Иконка' },
        { id: 'status', label: 'Статус' }, { id: 'value', label: 'Значение (State)' },
        { id: 'unit', label: 'Единица измерения' },
    ];
    if (['sensor', 'climate', 'custom', 'humidifier'].includes(template.deviceType)) base.push({ id: 'chart', label: 'График' });
    if (['light', 'custom'].includes(template.deviceType)) base.push({ id: 'slider', label: 'Слайдер яркости' });
    if (['climate', 'humidifier', 'custom', 'sensor'].includes(template.deviceType)) base.push({ id: 'temperature', label: 'Текущая температура/значение' });
    if (['climate', 'humidifier', 'custom'].includes(template.deviceType)) base.push({ id: 'target-temperature', label: 'Кольцо управления (Target)' });
    if (['climate', 'humidifier', 'custom'].includes(template.deviceType)) base.push({ id: 'hvac-modes', label: 'Кнопки режимов' });
    if (['custom'].includes(template.deviceType)) {
        base.push({ id: 'linked-entity', label: 'Связанное устройство' });
        base.push({ id: 'battery', label: 'Уровень заряда' });
    }
    if (['humidifier', 'custom'].includes(template.deviceType)) base.push({ id: 'fan-speed-control', label: 'Управление вентилятором' });
    return base;
  }, [template.deviceType]);

  const previewWidth = (template.width || 1) * 160;
  const previewHeight = (template.height || 1) * 160;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
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
                        <label htmlFor="snap-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">Привязка к сетке 5%</label>
                        <button id="snap-toggle" onClick={() => setSnapToGrid(!snapToGrid)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${snapToGrid ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${snapToGrid ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Слои (перетащите для порядка)</label>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayerDragEnd}>
                            <SortableContext items={template.elements.map(e => e.uniqueId)} strategy={verticalListSortingStrategy}>
                                {template.elements.map(element => (
                                    <SortableLayerItem key={element.uniqueId} element={element} isSelected={selectedElementIds.includes(element.uniqueId)}
                                        onSelect={(e) => handleSelectElement(e, element.uniqueId)}
                                        onToggleVisibility={() => handleToggleVisibility(element.uniqueId)}
                                        onToggleLock={() => handleToggleLock(element.uniqueId)}
                                        onDelete={() => handleRemoveElement(element.uniqueId)} />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Добавить элемент</label>
                        <select onChange={(e) => { if (e.target.value) { handleAddElement(e.target.value as CardElementId); e.target.value = ''; } }} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none">
                            <option value="">Выберите элемент...</option>
                            {availableElements.map(el => (<option key={el.id} value={el.id}>{el.label}</option>))}
                        </select>
                    </div>
                </div>
            </div>
            <DndContext sensors={sensors} onDragStart={(e) => setActiveDragId(e.active.id as string)} onDragEnd={handleCanvasDragEnd}>
                <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-8 flex items-center justify-center relative overflow-hidden grid-background" onClick={() => setSelectedElementIds([])}>
                    {selectedElementIds.length > 1 && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white dark:bg-gray-700 p-1 rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10">
                            {[ {icon: 'mdi:format-align-left', type: 'left'}, {icon: 'mdi:format-align-center', type: 'h-center'}, {icon: 'mdi:format-align-right', type: 'right'} ].map(item => <button key={item.type} onClick={(e) => { e.stopPropagation(); handleAlign(item.type as any); }} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon={item.icon} className="w-5 h-5" /></button>)}
                            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"/>
                            {[ {icon: 'mdi:format-align-top', type: 'top'}, {icon: 'mdi:format-align-middle', type: 'v-center'}, {icon: 'mdi:format-align-bottom', type: 'bottom'} ].map(item => <button key={item.type} onClick={(e) => { e.stopPropagation(); handleAlign(item.type as any); }} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon={item.icon} className="w-5 h-5" /></button>)}
                        </div>
                    )}
                    <div className="relative bg-transparent transition-all duration-300" style={{ width: previewWidth, height: previewHeight, }}>
                        <DeviceCard device={previewDevice} template={template} cardWidth={template.width || 1} cardHeight={template.height || 1} allKnownDevices={mockAllDevices} customizations={{}} isEditMode={false} isPreview={true} onDeviceToggle={() => {}} onTemperatureChange={() => {}} onBrightnessChange={() => {}} onHvacModeChange={() => {}} onPresetChange={() => {}} onFanSpeedChange={() => {}} onEditDevice={() => {}} haUrl="" signPath={async (p) => ({ path: p })} colorScheme={colorScheme['light']} isDark={false} />
                        {template.elements.map(el => el.visible && <DraggableElement key={el.uniqueId} element={el} template={template} selectedIds={selectedElementIds} onSelect={handleSelectElement} activeDragId={activeDragId} />)}
                    </div>
                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">Превью (Light Mode)</div>
                </div>
            </DndContext>
            {selectedElement && <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white">Свойства: {ELEMENT_LABELS[selectedElement.id]}</h3>
                </div>
                <div className="p-4 overflow-y-auto no-scrollbar">
                    <ElementPropertiesEditor element={selectedElement} template={template} onChange={(updates) => handleElementUpdate(selectedElement.uniqueId, updates)} snapToGrid={snapToGrid}/>
                </div>
            </div>}
        </div>
      </div>
    </div>
  );
};

const DraggableElement = ({ element, template, selectedIds, onSelect, activeDragId }: { element: CardElement; template: CardTemplate; selectedIds: string[]; onSelect: (e: React.MouseEvent, id: string) => void; activeDragId: string | null }) => {
    const isSelected = selectedIds.includes(element.uniqueId);
    const isPartOfDragGroup = isSelected && selectedIds.includes(activeDragId || '');
    
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: element.uniqueId,
        disabled: element.locked || (isSelected && selectedIds.length > 1 && !isPartOfDragGroup),
    });

    const finalSize = {
        // FIX: Renamed `scaleMode` to `sizeMode` to align with type definitions.
        width: `${element.sizeMode === 'cell' && template.width ? element.size.width / template.width : element.size.width}%`,
        // FIX: Renamed `scaleMode` to `sizeMode` to align with type definitions.
        height: `${element.sizeMode === 'cell' && template.height ? element.size.height / template.height : element.size.height}%`,
    };

    return (
        <div ref={setNodeRef} {...attributes} {...listeners}
            onClick={(e) => onSelect(e, element.uniqueId)}
            className={`absolute transition-all duration-200 cursor-move ${isDragging ? 'z-50' : ''} ${isSelected ? 'border-2 border-blue-500 bg-blue-500/10' : 'border-2 border-transparent hover:border-blue-300/50'}`}
            style={{ left: `${element.position.x}%`, top: `${element.position.y}%`, width: finalSize.width, height: finalSize.height, transform: 'translate(-50%, -50%)', }}
        >
            {element.locked && <div className="absolute top-0.5 right-0.5 bg-gray-800/80 p-0.5 rounded-full text-white"><Icon icon="mdi:pin" className="w-2.5 h-2.5" /></div>}
        </div>
    );
};


export default TemplateEditorModal;