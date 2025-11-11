import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { CardTemplate, Device, DeviceType, CardElementId, CardElement, DeviceSlot, ColorScheme } from '../types';
import DeviceCard from './DeviceCard';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ContextMenu from './ContextMenu';
import { nanoid } from 'nanoid';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';

const SNAP_GRID_SIZE = 1; // pixels

// --- Draggable Resize Handle ---
const ResizeHandle: React.FC<{
  elementId: CardElementId,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}> = ({ elementId, position }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `resize-${position}-${elementId}`,
    data: { type: 'resize', handle: position, elementId },
  });
  const cursorClass = {
    'top-left': 'cursor-nwse-resize',
    'top-right': 'cursor-nesw-resize',
    'bottom-left': 'cursor-nesw-resize',
    'bottom-right': 'cursor-nwse-resize',
  }[position];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -m-1.5 z-50 ${cursorClass}`}
      style={{
        top: position.includes('top') ? 0 : '100%',
        left: position.includes('left') ? 0 : '100%',
      }}
    />
  );
};

// --- Draggable Element on Canvas ---
const DraggableCanvasElement: React.FC<{
  element: CardElement;
  isSelected: boolean;
  onSelect: (id: CardElementId, isMultiSelect: boolean) => void;
  showResizeHandles: boolean;
}> = ({ element, isSelected, onSelect, showResizeHandles }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `element-${element.id}`,
    data: { type: 'element', elementId: element.id },
    disabled: !element.visible,
  });
  
  const style: React.CSSProperties = {
    left: `${element.position.x}%`,
    top: `${element.position.y}%`,
    width: `${element.size.width}%`,
    height: `${element.size.height}%`,
    zIndex: isSelected ? element.zIndex + 101 : element.zIndex,
    boxShadow: isSelected ? '0 0 0 2px #3b82f6' : '0 0 0 1px rgba(59, 130, 246, 0.3)',
    display: element.visible ? 'block' : 'none',
  };

  if (isDragging && transform) {
    style.transform = CSS.Transform.toString({ x: transform.x, y: transform.y, scaleX: 1, scaleY: 1 });
    style.zIndex = 9999;
  }

  return (
    <div
      id={`element-${element.id}`}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(element.id, e.ctrlKey || e.metaKey); }}
      className={`absolute group cursor-move bg-white/5 transition-shadow duration-100 rounded-sm`}
      style={style}
    >
      {showResizeHandles && (
        <>
          <ResizeHandle elementId={element.id} position="top-left" />
          <ResizeHandle elementId={element.id} position="top-right" />
          <ResizeHandle elementId={element.id} position="bottom-left" />
          <ResizeHandle elementId={element.id} position="bottom-right" />
        </>
      )}
    </div>
  );
};

const DraggableIndicatorSlot: React.FC<{ slot: DeviceSlot, isSelected: boolean, onSelect: () => void; }> = ({ slot, isSelected, onSelect }) => {
    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: `slot-${slot.id}`,
        data: { type: 'slot', slotId: slot.id }
    });

    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${slot.position.x}%`,
        top: `${slot.position.y}%`,
        width: slot.visualStyle.showValue ? '60px' : `${slot.iconSize}px`,
        height: slot.visualStyle.showValue ? '30px' : `${slot.iconSize}px`,
        zIndex: 50,
        transform: 'translate(-50%, -50%)',
    };

    if (isDragging && transform) {
        style.transform = `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            style={style}
            className={`flex items-center justify-center cursor-move transition-all duration-100 ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : ''} ${slot.visualStyle.showValue ? 'rounded-md' : 'rounded-full'}`}
        >
            {slot.visualStyle.showValue ? (
                <div className="w-full h-full bg-white/10 border-2 border-dashed border-white/50 rounded-md flex items-center justify-center p-1">
                    <span className="text-white/50 text-[10px] font-mono select-none">12.3°</span>
                </div>
            ) : (
                <div className="w-full h-full bg-white/20 border-2 border-dashed border-white/50 rounded-full flex items-center justify-center">
                    <span className="text-white/50 text-xs font-bold">+</span>
                </div>
            )}
        </div>
    );
};


// --- Helper UI Components ---
const Section: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-700/80">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-2 text-sm font-semibold text-gray-300 hover:text-white">
        <span>{title}</span>
        <Icon icon="mdi:chevron-down" className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-4 space-y-3">{children}</div>}
    </div>
  );
};

const LabeledInput: React.FC<{ label: string, children: React.ReactNode, suffix?: string }> = ({ label, children, suffix }) => (
    <div className="grid grid-cols-[auto,1fr] items-center gap-4">
        <label className="text-xs text-gray-400 truncate">{label}</label>
        <div className="flex items-center gap-2">
            {children}
            {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
        </div>
    </div>
);

const NumberInput: React.FC<{ value: number | undefined, onChange: (val?: number) => void, min?: number, max?: number, placeholder?: string, step?: number }> = ({ value, onChange, min, max, placeholder, step }) => (
    <input
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
    />
);


interface TemplateEditorModalProps {
  templateToEdit: CardTemplate;
  onClose: () => void;
}

const ELEMENT_LABELS: Record<CardElementId, string> = {
  name: 'Название', icon: 'Иконка', value: 'Значение', unit: 'Единица изм.', chart: 'График',
  status: 'Статус', slider: 'Слайдер', temperature: 'Текущая темп.', 'target-temperature': 'Термостат (кольцо)',
  'hvac-modes': 'Режимы климата', 'linked-entity': 'Связанное устройство'
};

// --- Sortable Layer Item Component ---
interface SortableLayerItemProps {
    element: CardElement;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onToggleVisibility: (e: React.MouseEvent) => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = React.memo(({ element, isSelected, onSelect, onToggleVisibility }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `layer-${element.id}` });
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            onClick={onSelect} 
            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/50' : 'bg-gray-700/50 hover:bg-gray-700'}`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <div {...attributes} {...listeners} className="cursor-grab touch-none text-gray-400 hover:text-white">
                    <Icon icon="mdi:drag-horizontal-variant" className="w-5 h-5"/>
                </div>
                <span className="text-sm truncate">{ELEMENT_LABELS[element.id]}</span>
            </div>
            <button onClick={onToggleVisibility}>
                <Icon icon={element.visible ? 'mdi:eye' : 'mdi:eye-off'} className={`w-5 h-5 ${element.visible ? 'text-gray-300' : 'text-gray-500'}`}/>
            </button>
        </div>
    );
});

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ templateToEdit, onClose }) => {
  const { handleSaveTemplate, colorScheme, theme } = useAppStore();
  const { allKnownDevices } = useHAStore();
  
  const [editedTemplate, setEditedTemplate] = useState<CardTemplate>({
    ...templateToEdit,
    width: templateToEdit.width || 1,
    height: templateToEdit.height || 1,
  });
  const [selectedElementIds, setSelectedElementIds] = useState<CardElementId[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isSystemDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
  const isDark = useMemo(() => theme === 'night' || (theme === 'auto' && isSystemDark), [theme, isSystemDark]);
  const currentColorScheme = useMemo(() => isDark ? colorScheme.dark : colorScheme.light, [isDark, colorScheme]);

  const FONT_FAMILIES = [
    { name: 'Системный', value: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"` },
    { name: 'San Francisco (SF Pro)', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { name: 'Calibri', value: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, Verdana, Segoe, sans-serif' },
    { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: '"Courier New", Courier, monospace' },
    { name: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' }
  ];

  const sampleDevice = useMemo(() => {
    if (templateToEdit.deviceType === 'climate') return { id: 'climate.living_room', name: 'Гостиная', status: 'Охлаждение до 22°', type: DeviceType.Thermostat, temperature: 24, targetTemperature: 22, minTemp: 16, maxTemp: 30, hvacModes: ['off', 'cool', 'heat', 'auto'], hvacAction: 'cooling', presetMode: 'comfort', presetModes: ['none', 'away', 'comfort', 'eco', 'sleep'], state: 'cool', haDomain: 'climate' };
    if (templateToEdit.deviceType === 'light') return { id: 'light.sample_dimmable', name: 'Лампа в гостиной', status: 'Включено', type: DeviceType.DimmableLight, brightness: 80, state: 'on', haDomain: 'light' };
    if (templateToEdit.deviceType === 'switch') return { id: 'switch.sample_outlet', name: 'Розетка на кухне', status: 'Включено', type: DeviceType.Switch, state: 'on', haDomain: 'switch' };
    return { id: 'sensor.sample_temperature', name: 'Температура в кабинете', status: '25.9', type: DeviceType.Sensor, unit: '°C', history: Array.from({ length: 20 }, (_, i) => 25 + Math.sin(i / 3) + (Math.random() - 0.5)), state: '25.9', haDomain: 'sensor' };
  }, [templateToEdit.deviceType]);
  
  const sampleAllKnownDevices = useMemo(() => new Map<string, Device>([[sampleDevice.id, sampleDevice]]), [sampleDevice]);

  const handleDeleteSlot = useCallback((slotIdToDelete: string) => {
      setEditedTemplate(prev => ({
          ...prev,
          deviceSlots: prev.deviceSlots?.filter(s => s.id !== slotIdToDelete)
      }));
      if (selectedSlotId === slotIdToDelete) {
          setSelectedSlotId(null);
      }
  }, [selectedSlotId]);
  
  const handleSlotUpdate = useCallback((slotId: string, updates: Partial<DeviceSlot>) => {
    setEditedTemplate(prev => {
        return {
            ...prev,
            deviceSlots: prev.deviceSlots?.map(s => s.id === slotId ? { ...s, ...updates } : s)
        }
    });
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const isTextInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
        if (isTextInput) return;

        const hasSelection = selectedElementIds.length > 0 || selectedSlotId;
        if (!hasSelection) return;

        const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
        if (isArrowKey) {
            e.preventDefault();
            const delta = e.shiftKey ? 10 : 1;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowLeft') dx = -delta;
            if (e.key === 'ArrowRight') dx = delta;
            if (e.key === 'ArrowUp') dy = -delta;
            if (e.key === 'ArrowDown') dy = delta;
            
            const previewRect = previewRef.current?.getBoundingClientRect();
            if (!previewRect) return;

            const dxPercent = (dx / previewRect.width) * 100;
            const dyPercent = (dy / previewRect.height) * 100;

            if (selectedElementIds.length > 0) {
              setEditedTemplate(prev => ({ ...prev, elements: prev.elements.map(el => 
                  selectedElementIds.includes(el.id) ? { ...el, position: {
                      x: Math.max(0, Math.min(100 - el.size.width, el.position.x + dxPercent)),
                      y: Math.max(0, Math.min(100 - el.size.height, el.position.y + dyPercent)),
                  }} : el
              )}));
            }
            
            if (selectedSlotId) {
                setEditedTemplate(prev => ({
                    ...prev,
                    deviceSlots: prev.deviceSlots?.map(slot => 
                        slot.id === selectedSlotId ? { ...slot, position: {
                            x: Math.max(0, Math.min(100, slot.position.x + dxPercent)),
                            y: Math.max(0, Math.min(100, slot.position.y + dyPercent)),
                        }} : slot
                    )
                }));
            }
        }
        
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (selectedElementIds.length > 0) {
              setEditedTemplate(prev => ({ ...prev, elements: prev.elements.map(el => 
                  selectedElementIds.includes(el.id) ? { ...el, visible: false } : el
              )}));
              setSelectedElementIds([]);
            }
            if (selectedSlotId) {
              handleDeleteSlot(selectedSlotId);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, selectedSlotId, handleDeleteSlot]);

  const handleSelect = (type: 'element' | 'slot', id: string, isMultiSelect: boolean = false) => {
    if (type === 'element') {
        const elementId = id as CardElementId;
        setSelectedSlotId(null);
        if (isMultiSelect) {
            setSelectedElementIds(prev => prev.includes(elementId) ? prev.filter(i => i !== elementId) : [...prev, elementId]);
        } else {
            setSelectedElementIds(prev => prev.includes(elementId) && prev.length === 1 ? [] : [elementId]);
        }
    } else {
        setSelectedElementIds([]);
        setSelectedSlotId(prev => prev === id ? null : id);
    }
  };
  
  const handleAddSlot = () => {
    const newSlot: DeviceSlot = {
      id: nanoid(),
      position: { x: 50, y: 85 },
      iconSize: 24,
      visualStyle: {
        type: 'color_glow',
        activeColor: '#34d399', // emerald-400
        inactiveColor: '#6b7280', // gray-500
        glowIntensity: 0.7,
        animationType: 'none',
        showValue: false,
        decimalPlaces: 1,
      },
      interactive: true,
    };
    setEditedTemplate(prev => ({
      ...prev,
      deviceSlots: [...(prev.deviceSlots || []), newSlot]
    }));
    handleSelect('slot', newSlot.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const type = active.data.current?.type;
    
    if (type === 'layer') return; // Layer sorting is handled by SortableContext directly
    
    const previewRect = previewRef.current?.getBoundingClientRect();
    if (!previewRect) return;

    const applyDrag = (element: CardElement | DeviceSlot, elType: 'element' | 'slot') => {
        const startX = (element.position.x / 100) * (elType === 'element' ? previewRect.width : previewRect.width - (element as DeviceSlot).iconSize);
        const startY = (element.position.y / 100) * (elType === 'element' ? previewRect.height : previewRect.height - (element as DeviceSlot).iconSize);
        
        const newPixelX = startX + delta.x;
        const newPixelY = startY + delta.y;
        
        const snappedX = Math.round(newPixelX / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
        const snappedY = Math.round(newPixelY / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
        
        let newXPercent = (snappedX / previewRect.width) * 100;
        let newYPercent = (snappedY / previewRect.height) * 100;

        if (elType === 'element') {
            const el = element as CardElement;
            newXPercent = Math.max(0, Math.min(100 - el.size.width, newXPercent));
            newYPercent = Math.max(0, Math.min(100 - el.size.height, newYPercent));
        } else {
            newXPercent = Math.max(0, Math.min(100, newXPercent));
            newYPercent = Math.max(0, Math.min(100, newYPercent));
        }

        return { ...element, position: { x: newXPercent, y: newYPercent }};
    }

    if (type === 'element') {
        setEditedTemplate(prev => ({...prev, elements: prev.elements.map(el => 
            selectedElementIds.includes(el.id) ? applyDrag(el, 'element') as CardElement : el
        )}));
    } else if (type === 'resize') {
        const { handle, elementId } = active.data.current as any;
        setEditedTemplate(prev => {
            const index = prev.elements.findIndex(el => el.id === elementId);
            if (index === -1) return prev;
            
            const element = prev.elements[index];
            let { position, size } = element;

            let newPosPx = { x: (position.x / 100) * previewRect.width, y: (position.y / 100) * previewRect.height };
            let newSizePx = { width: (size.width / 100) * previewRect.width, height: (size.height / 100) * previewRect.height };
            
            if (handle.includes('right')) newSizePx.width += delta.x;
            if (handle.includes('bottom')) newSizePx.height += delta.y;
            if (handle.includes('left')) {
                newSizePx.width -= delta.x;
                newPosPx.x += delta.x;
            }
            if (handle.includes('top')) {
                newSizePx.height -= delta.y;
                newPosPx.y += delta.y;
            }

            const snappedWidth = Math.max(SNAP_GRID_SIZE * 4, Math.round(newSizePx.width / SNAP_GRID_SIZE) * SNAP_GRID_SIZE);
            const snappedHeight = Math.max(SNAP_GRID_SIZE * 4, Math.round(newSizePx.height / SNAP_GRID_SIZE) * SNAP_GRID_SIZE);
            const snappedX = Math.round(newPosPx.x / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
            const snappedY = Math.round(newPosPx.y / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;

            const newElements = [...prev.elements];
            newElements[index] = { ...element, 
                position: { x: (snappedX / previewRect.width) * 100, y: (snappedY / previewRect.height) * 100 },
                size: { width: (snappedWidth / previewRect.width) * 100, height: (snappedHeight / previewRect.height) * 100 }
            };
            return { ...prev, elements: newElements };
        });
    } else if (type === 'slot') {
        setEditedTemplate(prev => ({...prev, deviceSlots: prev.deviceSlots?.map(slot => 
            slot.id === selectedSlotId ? applyDrag(slot, 'slot') as DeviceSlot : slot
        )}));
    }
  };
  
  const handleLayerSortEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setEditedTemplate(prev => {
            const oldIndex = prev.elements.findIndex(e => `layer-${e.id}` === active.id);
            const newIndex = prev.elements.findIndex(e => `layer-${e.id}` === over.id);
            if (oldIndex === -1 || newIndex === -1) return prev;
            
            const reorderedElements = arrayMove(prev.elements, oldIndex, newIndex);
            
            const updatedZIndexes = reorderedElements.map((el, index) => ({
                ...el, zIndex: reorderedElements.length - index
            }));
            return { ...prev, elements: updatedZIndexes };
        });
    }
  }

  const selectedElement = useMemo(() => editedTemplate.elements.find(el => selectedElementIds.length === 1 && el.id === selectedElementIds[0]), [selectedElementIds, editedTemplate.elements]);
  const selectedSlot = useMemo(() => editedTemplate.deviceSlots?.find(s => s.id === selectedSlotId), [selectedSlotId, editedTemplate.deviceSlots]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-lg w-full h-full max-w-7xl max-h-[95vh] ring-1 ring-white/10 flex text-white" onClick={e => e.stopPropagation()}>
          {/* Left Panel */}
          <aside className="w-[240px] bg-gray-800/50 flex-shrink-0 flex flex-col border-r border-gray-700/80">
            <div className="p-4 border-b border-gray-700/80">
              <h3 className="font-bold text-lg">Слои</h3>
              <p className="text-xs text-gray-400 mt-1">Перетащите для изменения порядка. Ctrl/Cmd+клик для выбора нескольких.</p>
            </div>
            <div className="flex-grow p-2 space-y-1.5 overflow-y-auto no-scrollbar">
              <DndContext sensors={sensors} onDragEnd={handleLayerSortEnd}>
                  <SortableContext items={editedTemplate.elements.map(e => `layer-${e.id}`)}>
                    {editedTemplate.elements.map(el => (
                       <SortableLayerItem
                            key={el.id}
                            element={el}
                            isSelected={selectedElementIds.includes(el.id)}
                            onSelect={(e) => {
                                e.stopPropagation();
                                handleSelect('element', el.id, e.ctrlKey || e.metaKey);
                            }}
                            onToggleVisibility={(e) => {
                                e.stopPropagation();
                                setEditedTemplate(p => ({
                                    ...p,
                                    elements: p.elements.map(e => (e.id === el.id ? { ...e, visible: !e.visible } : e)),
                                }));
                            }}
                        />
                    ))}
                  </SortableContext>
              </DndContext>
              
               {editedTemplate.deviceSlots && editedTemplate.deviceSlots.length > 0 && (
                <>
                    <div className="px-2 pt-4 pb-1 text-xs font-semibold text-gray-400">Индикаторы</div>
                    {editedTemplate.deviceSlots.map((slot, index) => (
                        <div key={slot.id} onClick={() => handleSelect('slot', slot.id)} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedSlotId === slot.id ? 'bg-blue-600/50' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Icon icon="mdi:map-marker-radius" className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                <span className="text-sm truncate">Индикатор #{index + 1}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }} className="p-1 text-gray-500 hover:text-red-400">
                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </>
              )}

            </div>
            <div className="p-2 border-t border-gray-700/80">
                <button
                    onClick={handleAddSlot}
                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600/80 rounded-md py-2 transition-colors"
                >
                    <Icon icon="mdi:plus-circle-outline" className="w-5 h-5" />
                    <span>Добавить индикатор</span>
                </button>
            </div>
          </aside>

          {/* Center Panel */}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <main className="flex-1 flex flex-col items-center justify-center bg-gray-900/50 relative" onClick={() => handleSelect('element', '')}>
              <div ref={previewRef} className="w-[400px] transition-all duration-300 relative" style={{ aspectRatio: `${editedTemplate.width || 1} / ${editedTemplate.height || 1}`}}>
                  <DeviceCard device={sampleDevice} allKnownDevices={sampleAllKnownDevices} customizations={{}} onDeviceToggle={() => {}} template={editedTemplate} isPreview={true} onTemperatureChange={()=>{}} onBrightnessChange={()=>{}} onHvacModeChange={()=>{}} onPresetChange={()=>{}} onCameraCardClick={()=>{}} isEditMode={false} onEditDevice={()=>{}} haUrl="" signPath={async()=>({path:''})} getCameraStreamUrl={async()=>({url: ''})} colorScheme={currentColorScheme} />
                  {editedTemplate.elements.map(element => <DraggableCanvasElement key={element.id} element={element} isSelected={selectedElementIds.includes(element.id)} onSelect={(id, multi) => handleSelect('element', id, multi)} showResizeHandles={selectedElementIds.length === 1 && selectedElementIds[0] === element.id}/>)}
                  {editedTemplate.deviceSlots?.map(slot => <DraggableIndicatorSlot key={slot.id} slot={slot} isSelected={selectedSlotId === slot.id} onSelect={() => handleSelect('slot', slot.id)} />)}
              </div>
            </main>
          </DndContext>

          {/* Right Panel */}
          <aside className="w-[360px] bg-gray-800/50 flex-shrink-0 flex flex-col border-l border-gray-700/80">
            <div className="p-4 border-b border-gray-700/80">
              <h3 className="font-bold text-lg">Инспектор</h3>
              <p className="text-xs text-gray-400 mt-1">
                {selectedElementIds.length > 1 ? `Выбрано ${selectedElementIds.length} элементов` : selectedElement ? ELEMENT_LABELS[selectedElement.id] : selectedSlot ? 'Индикатор' : 'Настройки шаблона'}
              </p>
            </div>
            <div className="flex-grow p-4 space-y-4 overflow-y-auto no-scrollbar">
              { !selectedElement && !selectedSlot && (<>
                <Section title="Общие настройки" defaultOpen={true}>
                  <LabeledInput label="Название"><input type="text" value={editedTemplate.name} onChange={e => setEditedTemplate(p => ({...p, name: e.target.value}))} className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/></LabeledInput>
                </Section>
                <Section title="Размеры карточки">
                    <LabeledInput label="Ширина" suffix="колонок">
                        <div className="relative w-full">
                            <select
                                value={editedTemplate.width}
                                onChange={e => setEditedTemplate(p => ({ ...p, width: parseInt(e.target.value, 10) }))}
                                className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6"
                            >
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(w => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Icon icon="mdi:chevron-down" className="w-4 h-4 text-gray-400"/>
                            </div>
                        </div>
                    </LabeledInput>
                    <LabeledInput label="Высота" suffix="рядов">
                       <div className="relative w-full">
                            <select
                                value={editedTemplate.height}
                                onChange={e => setEditedTemplate(p => ({ ...p, height: parseFloat(e.target.value) }))}
                                className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6"
                            >
                                {[0.5, ...Array.from({ length: 10 }, (_, i) => i + 1)].map(h => (
                                    <option key={h} value={h}>{String(h).replace('.', ',')}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Icon icon="mdi:chevron-down" className="w-4 h-4 text-gray-400"/>
                            </div>
                        </div>
                    </LabeledInput>
                </Section>
                <Section title="Стили фона">
                    <LabeledInput label="Цвет (Выкл.)"><input type="color" value={editedTemplate.styles.backgroundColor} onChange={e => setEditedTemplate(p => ({...p, styles: {...p.styles, backgroundColor: e.target.value}}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                    <LabeledInput label="Цвет (Вкл.)"><input type="color" value={editedTemplate.styles.onBackgroundColor || ''} onChange={e => setEditedTemplate(p => ({...p, styles: {...p.styles, onBackgroundColor: e.target.value}}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                </Section>
              </>)}
              { selectedElement && (<>
                <Section title="Положение и размер">
                    <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-3 items-center">
                        {/* Row 1 */}
                        <label className="text-xs text-gray-400 justify-self-end">X</label>
                        <div className="flex items-center gap-1">
                            <NumberInput value={Math.round(selectedElement.position.x)} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, position: {...e.position, x: v || 0}} : e)}))} />
                            <span className="text-xs text-gray-500">%</span>
                        </div>
                        
                        <label className="text-xs text-gray-400 justify-self-end pl-2">Y</label>
                        <div className="flex items-center gap-1">
                            <NumberInput value={Math.round(selectedElement.position.y)} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, position: {...e.position, y: v || 0}} : e)}))} />
                            <span className="text-xs text-gray-500">%</span>
                        </div>
                        
                        {/* Row 2 */}
                        <label className="text-xs text-gray-400 justify-self-end">Ширина</label>
                        <div className="flex items-center gap-1">
                            <NumberInput value={Math.round(selectedElement.size.width)} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, size: {...e.size, width: v || 0}} : e)}))} />
                            <span className="text-xs text-gray-500">%</span>
                        </div>
                        
                        <label className="text-xs text-gray-400 justify-self-end pl-2">Высота</label>
                        <div className="flex items-center gap-1">
                            <NumberInput value={Math.round(selectedElement.size.height)} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, size: {...e.size, height: v || 0}} : e)}))} />
                            <span className="text-xs text-gray-500">%</span>
                        </div>
                    </div>
                </Section>
                
                 {['name', 'status', 'value', 'unit', 'temperature'].includes(selectedElement.id) && (
                    <Section title="Текст">
                        <LabeledInput label="Размер шрифта" suffix="px"><NumberInput value={selectedElement.styles.fontSize} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, styles: {...e.styles, fontSize: v}} : e)}))} min={8} max={100} placeholder="Авто" /></LabeledInput>
                        <LabeledInput label="Цвет текста">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.styles.textColor || '#ffffff'} 
                                    onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, textColor: e.target.value}} : el)}))}
                                    className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                />
                                <button 
                                    onClick={() => setEditedTemplate(p => {
                                        const newElements = [...p.elements];
                                        const elIndex = newElements.findIndex(el => el.id === selectedElement.id);
                                        if (elIndex > -1) {
                                            const newStyles = { ...newElements[elIndex].styles };
                                            delete newStyles.textColor;
                                            newElements[elIndex] = { ...newElements[elIndex], styles: newStyles };
                                        }
                                        return {...p, elements: newElements};
                                    })}
                                    title="Сбросить" 
                                    className="p-1 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
                                >
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                </button>
                            </div>
                        </LabeledInput>
                        <LabeledInput label="Шрифт">
                           <div className="flex items-center gap-2 w-full">
                               <div className="relative w-full">
                                   <select
                                       value={selectedElement.styles.fontFamily || ''}
                                       onChange={e => setEditedTemplate(p => ({
                                           ...p, 
                                           elements: p.elements.map(el => el.id === selectedElement.id ? {
                                               ...el, 
                                               styles: { ...el.styles, fontFamily: e.target.value || undefined }
                                           } : el)
                                       }))}
                                       className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6"
                                   >
                                       <option value="">По умолчанию</option>
                                       {FONT_FAMILIES.map(font => (
                                           <option key={font.name} value={font.value}>{font.name}</option>
                                       ))}
                                   </select>
                                   <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Icon icon="mdi:chevron-down" className="w-4 h-4 text-gray-400"/>
                                   </div>
                               </div>
                                <button 
                                   onClick={() => setEditedTemplate(p => {
                                       const newElements = [...p.elements];
                                       const elIndex = newElements.findIndex(el => el.id === selectedElement.id);
                                       if (elIndex > -1) {
                                           const newStyles = { ...newElements[elIndex].styles };
                                           delete newStyles.fontFamily;
                                           newElements[elIndex] = { ...newElements[elIndex], styles: newStyles };
                                       }
                                       return {...p, elements: newElements};
                                   })}
                                   title="Сбросить" 
                                   className="p-1 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors flex-shrink-0"
                               >
                                   <Icon icon="mdi:close" className="w-4 h-4" />
                               </button>
                           </div>
                        </LabeledInput>
                    </Section>
                 )}
                 {['value', 'temperature'].includes(selectedElement.id) && (
                     <Section title="Данные">
                        <LabeledInput label="Знаков после ," ><NumberInput value={selectedElement.styles.decimalPlaces} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, styles: {...e.styles, decimalPlaces: v}} : e)}))} min={0} max={5} /></LabeledInput>
                     </Section>
                 )}
                 {selectedElement.id === 'icon' && (
                    <Section title="Стили иконки">
                        <LabeledInput label="Цвет (Вкл.)"><input type="color" value={selectedElement.styles.onColor || '#3B82F6'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, onColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                        <LabeledInput label="Цвет (Выкл.)"><input type="color" value={selectedElement.styles.offColor || '#9CA3AF'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, offColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                    </Section>
                 )}
                 {selectedElement.id === 'chart' && (
                    <Section title="Настройки графика">
                        <LabeledInput label="Период">
                           <NumberInput 
                               value={selectedElement.styles.chartTimeRange}
                               onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, styles: {...e.styles, chartTimeRange: v}} : e)}))} 
                               min={1}
                           />
                        </LabeledInput>
                         <LabeledInput label="Единица">
                            <select 
                                value={selectedElement.styles.chartTimeRangeUnit || 'hours'}
                                onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, chartTimeRangeUnit: e.target.value as any}} : el)}))}
                                className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="minutes">Минуты</option>
                                <option value="hours">Часы</option>
                                <option value="days">Дни</option>
                            </select>
                         </LabeledInput>
                         <LabeledInput label="Тип">
                            <select 
                                value={selectedElement.styles.chartType || 'gradient'}
                                onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, chartType: e.target.value as any}} : el)}))}
                                className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="gradient">Градиент</option>
                                <option value="line">Линия</option>
                            </select>
                         </LabeledInput>
                    </Section>
                 )}
                {selectedElement.id === 'target-temperature' && (
                    <Section title="Стили термостата">
                        <LabeledInput label="Цвет (Цель)"><input type="color" value={selectedElement.styles.idleLabelColor || '#9CA3AF'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, idleLabelColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                        <LabeledInput label="Цвет (Нагрев)"><input type="color" value={selectedElement.styles.heatingLabelColor || '#F97316'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, heatingLabelColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                        <LabeledInput label="Цвет (Охлаждение)"><input type="color" value={selectedElement.styles.coolingLabelColor || '#3B82F6'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, coolingLabelColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                    </Section>
                )}
                 {selectedElement.id === 'linked-entity' && (
                     <Section title="Связанное устройство">
                         <LabeledInput label="ID устройства"><input type="text" placeholder="e.g. sensor.temperature" value={selectedElement.styles.linkedEntityId ?? ''} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, linkedEntityId: e.target.value}} : el)}))} className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/></LabeledInput>
                         <LabeledInput label="Показывать значение">
                            <button 
                                onClick={() => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, showValue: !el.styles.showValue}} : el)}))}
                                className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${selectedElement.styles.showValue ? 'bg-blue-600' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${selectedElement.styles.showValue ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </LabeledInput>
                        {selectedElement.styles.showValue && (
                            <LabeledInput label="Знаков после ," >
                                <NumberInput value={selectedElement.styles.decimalPlaces} onChange={v => setEditedTemplate(p => ({...p, elements: p.elements.map(e => e.id === selectedElement.id ? {...e, styles: {...e.styles, decimalPlaces: v}} : e)}))} min={0} max={5} />
                            </LabeledInput>
                        )}
                        <Section title="Стили иконки">
                            <LabeledInput label="Цвет (Вкл.)"><input type="color" value={selectedElement.styles.onColor || '#3B82F6'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, onColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                            <LabeledInput label="Цвет (Выкл.)"><input type="color" value={selectedElement.styles.offColor || '#9CA3AF'} onChange={e => setEditedTemplate(p => ({...p, elements: p.elements.map(el => el.id === selectedElement.id ? {...el, styles: {...el.styles, offColor: e.target.value}} : el)}))} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/></LabeledInput>
                        </Section>
                     </Section>
                 )}
              </>)}
               {selectedSlot && (
                <>
                  <Section title="Положение и размер" defaultOpen={true}>
                    {!selectedSlot.visualStyle.showValue && (
                        <LabeledInput label="Размер иконки">
                            <input type="range" min="20" max="48" value={selectedSlot.iconSize} onChange={e => handleSlotUpdate(selectedSlot.id, { iconSize: parseInt(e.target.value, 10) })} className="w-full accent-blue-500" />
                        </LabeledInput>
                    )}
                  </Section>
                  <Section title="Отображение">
                    <LabeledInput label="Показывать значение">
                        <button 
                            onClick={() => handleSlotUpdate(selectedSlot.id, { visualStyle: { ...selectedSlot.visualStyle, showValue: !selectedSlot.visualStyle.showValue }})}
                            className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${selectedSlot.visualStyle.showValue ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${selectedSlot.visualStyle.showValue ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </LabeledInput>
                    {selectedSlot.visualStyle.showValue && (
                        <>
                            <LabeledInput label="Размер шрифта" suffix="px">
                                <NumberInput
                                    value={selectedSlot.visualStyle.fontSize}
                                    onChange={v => handleSlotUpdate(selectedSlot.id, { visualStyle: { ...selectedSlot.visualStyle, fontSize: v } })}
                                    min={8} max={100} placeholder="Авто"
                                />
                            </LabeledInput>
                            <LabeledInput label="Знаков после ," suffix=",">
                                <NumberInput
                                    value={selectedSlot.visualStyle.decimalPlaces}
                                    onChange={v => handleSlotUpdate(selectedSlot.id, { visualStyle: { ...selectedSlot.visualStyle, decimalPlaces: v } })}
                                    min={0} max={5} placeholder="Авто"
                                />
                            </LabeledInput>
                            <LabeledInput label="Единица изм.">
                                <input
                                    type="text"
                                    value={selectedSlot.visualStyle.unit || ''}
                                    onChange={e => handleSlotUpdate(selectedSlot.id, { visualStyle: { ...selectedSlot.visualStyle, unit: e.target.value }})}
                                    placeholder="°C, %..."
                                    className="w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </LabeledInput>
                        </>
                    )}
                  </Section>
                  <Section title="Поведение">
                    <LabeledInput label="Интерактивный"><button onClick={() => handleSlotUpdate(selectedSlot.id, { interactive: !selectedSlot.interactive })} className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${selectedSlot.interactive ? 'bg-blue-600' : 'bg-gray-600'}`}><span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${selectedSlot.interactive ? 'translate-x-5' : 'translate-x-1'}`} /></button></LabeledInput>
                  </Section>
                   <div className="pt-4 border-t border-gray-700/80">
                      <button
                        onClick={() => handleDeleteSlot(selectedSlot.id)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-colors"
                      >
                         <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                         Удалить индикатор
                      </button>
                    </div>
                </>
              )}
            </div>
            <div className="p-4 flex justify-end gap-4 bg-gray-900/50 rounded-b-2xl border-t border-gray-700/80">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                <button onClick={() => { handleSaveTemplate(editedTemplate); onClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
            </div>
          </aside>
      </div>
    </div>
  );
};

export default React.memo(TemplateEditorModal);