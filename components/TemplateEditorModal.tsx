

import React, { useState, useRef, useMemo } from 'react';
import { CardTemplate, Device, DeviceType, CardElementId, CardElement, DeviceSlot } from '../types';
import DeviceCard from './DeviceCard';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ContextMenu from './ContextMenu';
import { nanoid } from 'nanoid';

const SNAP_GRID_SIZE = 4; // pixels

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
      className={`absolute w-3 h-3 bg-white border border-blue-600 rounded-full -m-1.5 ${cursorClass}`}
      style={{
        top: position.includes('top') ? 0 : '100%',
        left: position.includes('left') ? 0 : '100%',
      }}
    />
  );
};

// --- Sortable Layer Item ---
const SortableLayerItem: React.FC<{
  element: CardElement;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ element, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: `layer-${element.id}`, // Unique ID for sorting
    data: { type: 'layer' }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const elementLabels: Record<CardElementId, string> = {
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
      'linked-entity': 'Связанное устройство'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/50 ring-1 ring-blue-400' : 'bg-gray-700/50 hover:bg-gray-700'}`}
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </div>
        <span className="text-sm">{elementLabels[element.id]}</span>
      </div>
    </div>
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
    id: `element-${element.id}`, // Unique ID for dragging
    data: { type: 'element', elementId: element.id },
    disabled: !element.visible,
  });
  
  const style: React.CSSProperties = {
    left: `${element.position.x}%`,
    top: `${element.position.y}%`,
    width: `${element.size.width}%`,
    height: `${element.size.height}%`,
    zIndex: isSelected ? element.zIndex + 11 : element.zIndex + 10, // Bring selected to front
    outline: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(59, 130, 246, 0.3)',
    outlineOffset: '2px',
    display: element.visible ? 'block' : 'none',
  };

  if (isDragging) {
    // Apply transform for visual feedback during drag
    style.transform = CSS.Transform.toString({
        x: transform?.x || 0,
        y: transform?.y || 0,
        scaleX: 1,
        scaleY: 1
    });
    style.zIndex = 9999; // Ensure dragged item is on top of everything
  }


  return (
    <div
      id={`element-${element.id}`}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(element.id, e.ctrlKey || e.metaKey); }}
      className={`absolute group cursor-move ${isDragging ? '' : 'transition-all duration-100'}`}
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
        width: `${slot.iconSize}px`,
        height: `${slot.iconSize}px`,
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
            className={`flex items-center justify-center rounded-full cursor-move transition-all duration-100 ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : ''}`}
        >
            <div
                className="w-full h-full bg-white/20 border-2 border-dashed border-white/50 rounded-full flex items-center justify-center"
            >
                <span className="text-white/50 text-xs font-bold">+</span>
            </div>
        </div>
    );
};


// --- Main Modal Component ---
interface TemplateEditorModalProps {
  templateToEdit: CardTemplate;
  onSave: (newTemplate: CardTemplate) => void;
  onClose: () => void;
  allKnownDevices: Map<string, Device>;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ templateToEdit, onSave, onClose, allKnownDevices }) => {
  const [editedTemplate, setEditedTemplate] = useState<CardTemplate>({
    ...templateToEdit,
    width: templateToEdit.width || 1,
    height: templateToEdit.height || 1,
  });
  const [selectedElementIds, setSelectedElementIds] = useState<CardElementId[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const defaultBackgroundColor = 'rgb(31 41 55 / 0.8)';
  const defaultOnBackgroundColor = '#E5E7EB';
  const defaultIconOnColor = '#3B82F6';
  const defaultIconOffColor = '#9CA3AF';
  
  const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 3.33a6.67 6.67 0 1 0 1.87 10.15M12.5 3.33a6.67 6.67 0 0 0-4.83 2.17M12.5 3.33v3.34h-3.34" />
    </svg>
  );

  const sampleDevice: Device = useMemo(() => {
    const baseBoiler = {
        id: 'switch.boiler',
        name: 'Бойлер',
        status: 'Включено',
        type: DeviceType.Switch,
        state: 'on',
        haDomain: 'switch',
    };
    
    const allKnownDevices = new Map<string, Device>();
    allKnownDevices.set(baseBoiler.id, baseBoiler);

    if (templateToEdit.deviceType === 'climate') {
      return {
        id: 'climate.living_room',
        name: 'Гостиная',
        status: 'Охлаждение до 22°',
        type: DeviceType.Thermostat,
        temperature: 24,
        targetTemperature: 22,
        minTemp: 16,
        maxTemp: 30,
        hvacModes: ['off', 'cool', 'heat', 'auto'],
        hvacAction: 'cooling',
        presetMode: 'comfort',
        presetModes: ['none', 'away', 'comfort', 'eco', 'sleep'],
        state: 'cool',
        haDomain: 'climate',
      };
    }
    if (templateToEdit.deviceType === 'light') {
      return {
        id: 'light.sample_dimmable',
        name: 'Лампа в гостиной',
        status: 'Включено',
        type: DeviceType.DimmableLight,
        brightness: 80,
        state: 'on',
        haDomain: 'light',
      };
    }
    if (templateToEdit.deviceType === 'switch') {
        return {
            id: 'switch.sample_outlet',
            name: 'Розетка на кухне',
            status: 'Включено',
            type: DeviceType.Switch,
            state: 'on',
            haDomain: 'switch',
        };
    }
    // Default to sensor
    return {
      id: 'sensor.sample_temperature',
      name: 'Температура в кабинете',
      status: '25.9',
      type: DeviceType.Sensor,
      unit: '°C',
      history: Array.from({ length: 20 }, (_, i) => 25 + Math.sin(i / 3) + (Math.random() - 0.5)),
      state: '25.9',
      haDomain: 'sensor',
    };
  }, [templateToEdit.deviceType]);
  
  const sampleAllKnownDevices = useMemo(() => {
    const deviceMap = new Map<string, Device>();
    const boilerDevice: Device = {
        id: 'switch.boiler',
        name: 'Бойлер',
        status: 'Включено',
        type: DeviceType.Switch,
        state: 'on',
        haDomain: 'switch',
    };
    deviceMap.set(boilerDevice.id, boilerDevice);
    deviceMap.set(sampleDevice.id, sampleDevice);
    return deviceMap;
  }, [sampleDevice]);


  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const selectedElement = useMemo(() =>
    editedTemplate.elements.find(el => el.id === selectedElementId)
  , [selectedElementId, editedTemplate.elements]);
  
  const selectedSlot = useMemo(() =>
    editedTemplate.deviceSlots?.find(s => s.id === selectedSlotId)
  , [selectedSlotId, editedTemplate.deviceSlots]);


  const handleElementUpdate = (elementId: CardElementId, updates: Partial<CardElement>) => {
      setEditedTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(el => el.id === elementId ? { ...el, ...updates } : el)
      }));
  };
  
  const handleStyleChange = (key: 'backgroundColor' | 'onBackgroundColor' | 'name', value: any) => {
    if (key === 'name') {
        setEditedTemplate(prev => ({ ...prev, name: value }));
    } else {
        setEditedTemplate(prev => ({ ...prev, styles: { ...prev.styles, [key]: value } }));
    }
  };
  
  const handleDimensionChange = (key: 'width' | 'height', value: number) => {
    if (isNaN(value) || value < 1) return;
    setEditedTemplate(prev => ({
        ...prev,
        [key]: value,
    }));
  };

  const handleSave = () => {
    if (!editedTemplate.name.trim()) {
        alert("Имя шаблона не может быть пустым.");
        return;
    }
    onSave(editedTemplate);
  }

  const handleSelect = (type: 'element' | 'slot', id: string, isMultiSelect: boolean = false) => {
      setContextMenu(null);
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


  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetElementDiv = (e.target as HTMLElement).closest('[id^="element-"]');
    const clickedElementId = targetElementDiv?.id.replace('element-', '') as CardElementId | undefined;

    // If the user right-clicks an element that is NOT currently selected,
    // and they are NOT holding ctrl/meta, make it the SOLE selection.
    // This makes single-element context menus more intuitive.
    if (clickedElementId && !selectedElementIds.includes(clickedElementId) && !e.ctrlKey && !e.metaKey) {
        setSelectedElementIds([clickedElementId]);
         // Show menu immediately after selection
        setContextMenu({ x: e.clientX, y: e.clientY });
        return;
    }
    
    // If the click was not on an element, or on an already selected one, proceed.
    // Show menu only if there is a selection and the click was on an element.
    if (selectedElementIds.length > 0 && targetElementDiv) {
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    } else {
      // Click was on canvas background
      setContextMenu(null);
      setSelectedElementIds([]);
      setSelectedSlotId(null);
    }
  };
  
  const handleAlignment = (action: string) => {
    if (selectedElementIds.length < 2) return;

    setEditedTemplate(prev => {
        const newElements = prev.elements.map(el => ({ 
            ...el, 
            position: {...el.position}, 
            size: {...el.size} 
        }));
        
        const selectedElements = newElements.filter(el => selectedElementIds.includes(el.id));
        if (selectedElements.length < 2) return prev;

        switch(action) {
            case 'align-left': {
                const minX = Math.min(...selectedElements.map(el => el.position.x));
                selectedElements.forEach(el => el.position.x = minX);
                break;
            }
            case 'align-right': {
                const maxRight = Math.max(...selectedElements.map(el => el.position.x + el.size.width));
                selectedElements.forEach(el => el.position.x = maxRight - el.size.width);
                break;
            }
            case 'align-top': {
                const minY = Math.min(...selectedElements.map(el => el.position.y));
                selectedElements.forEach(el => el.position.y = minY);
                break;
            }
            case 'align-bottom': {
                const maxBottom = Math.max(...selectedElements.map(el => el.position.y + el.size.height));
                selectedElements.forEach(el => el.position.y = maxBottom - el.size.height);
                break;
            }
            case 'align-center-vertical': {
                const avgCenterX = selectedElements.reduce((sum, el) => sum + el.position.x + el.size.width / 2, 0) / selectedElements.length;
                selectedElements.forEach(el => el.position.x = avgCenterX - el.size.width / 2);
                break;
            }
            case 'align-center-horizontal': {
                const avgCenterY = selectedElements.reduce((sum, el) => sum + el.position.y + el.size.height / 2, 0) / selectedElements.length;
                selectedElements.forEach(el => el.position.y = avgCenterY - el.size.height / 2);
                break;
            }
            case 'distribute-horizontal': {
                const sorted = [...selectedElements].sort((a, b) => a.position.x - b.position.x);
                const first = sorted[0];
                const last = sorted[sorted.length - 1];
                const totalSpan = (last.position.x + last.size.width) - first.position.x;
                const totalElementWidth = sorted.reduce((sum, el) => sum + el.size.width, 0);
                const gap = (totalSpan - totalElementWidth) / (sorted.length - 1);
                let currentX = first.position.x + first.size.width + gap;
                for (let i = 1; i < sorted.length - 1; i++) {
                    sorted[i].position.x = currentX;
                    currentX += sorted[i].size.width + gap;
                }
                break;
            }
            case 'distribute-vertical': {
                const sorted = [...selectedElements].sort((a, b) => a.position.y - b.position.y);
                const first = sorted[0];
                const last = sorted[sorted.length - 1];
                const totalSpan = (last.position.y + last.size.height) - first.position.y;
                const totalElementHeight = sorted.reduce((sum, el) => sum + el.size.height, 0);
                const gap = (totalSpan - totalElementHeight) / (sorted.length - 1);
                let currentY = first.position.y + first.size.height + gap;
                for (let i = 1; i < sorted.length - 1; i++) {
                    sorted[i].position.y = currentY;
                    currentY += sorted[i].size.height + gap;
                }
                break;
            }
        }
        
        return { ...prev, elements: newElements };
    });
    setContextMenu(null);
  };
  
  const handleSingleElementAlignment = (action: string) => {
    if (selectedElementIds.length !== 1) return;
    const elementId = selectedElementIds[0];

    setEditedTemplate(prev => {
        const newElements = prev.elements.map(el => ({ ...el, position: { ...el.position }, size: { ...el.size } }));
        const elementIndex = newElements.findIndex(el => el.id === elementId);
        if (elementIndex === -1) return prev;

        const element = newElements[elementIndex];
        const { size } = element;

        switch (action) {
            case 'align-single-left':
                element.position.x = 0;
                break;
            case 'align-single-right':
                element.position.x = 100 - size.width;
                break;
            case 'align-single-top':
                element.position.y = 0;
                break;
            case 'align-single-bottom':
                element.position.y = 100 - size.height;
                break;
            case 'align-single-center-horizontal': // Horizontal centering
                element.position.x = (100 - size.width) / 2;
                break;
            case 'align-single-center-vertical': // Vertical centering
                element.position.y = (100 - size.height) / 2;
                break;
        }
        return { ...prev, elements: newElements };
    });
    setContextMenu(null);
};

    const handleAddSlot = () => {
        if ((editedTemplate.deviceSlots?.length ?? 0) >= 4) return;
        const newSlot: DeviceSlot = {
            id: nanoid(),
            position: { x: 10, y: 80 },
            iconSize: 24,
            interactive: true,
            visualStyle: {
                type: 'color_glow',
                activeColor: '#32b8c6',
                inactiveColor: '#626c71',
                glowIntensity: 0.7,
                animationType: 'pulse',
            },
        };
        setEditedTemplate(prev => ({
            ...prev,
            deviceSlots: [...(prev.deviceSlots ?? []), newSlot],
        }));
        handleSelect('slot', newSlot.id);
    };

    const handleRemoveSlot = (slotId: string) => {
        setEditedTemplate(prev => ({
            ...prev,
            deviceSlots: prev.deviceSlots?.filter(s => s.id !== slotId),
        }));
        if (selectedSlotId === slotId) {
            setSelectedSlotId(null);
        }
    }

    const handleSlotUpdate = (slotId: string, updates: Partial<DeviceSlot>) => {
        setEditedTemplate(prev => ({
            ...prev,
            deviceSlots: prev.deviceSlots?.map(slot => slot.id === slotId ? { ...slot, ...updates } : slot)
        }));
    };
    
    const handleSlotVisualStyleUpdate = (slotId: string, updates: Partial<DeviceSlot['visualStyle']>) => {
        setEditedTemplate(prev => ({
            ...prev,
            deviceSlots: prev.deviceSlots?.map(slot => {
                if (slot.id === slotId) {
                    return { ...slot, visualStyle: { ...slot.visualStyle, ...updates } };
                }
                return slot;
            })
        }));
    };


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const type = active.data.current?.type;
    
    // --- Handle Layer Sorting ---
    if (type === 'layer' && over) {
        const activeId = active.id;
        const overId = over.id;
        if (activeId !== overId) {
            setEditedTemplate(prev => {
                const oldIndex = prev.elements.findIndex(e => `layer-${e.id}` === activeId);
                const newIndex = prev.elements.findIndex(e => `layer-${e.id}` === overId);
                if (oldIndex === -1 || newIndex === -1) return prev;
                
                const reorderedElements = arrayMove(prev.elements, oldIndex, newIndex);
                
                const updatedZIndexes = reorderedElements.map((el, index) => ({
                    ...el,
                    zIndex: reorderedElements.length - index
                }));
                return { ...prev, elements: updatedZIndexes };
            });
        }
        return; // Stop processing after sorting
    }
    
    const previewRect = previewRef.current?.getBoundingClientRect();
    if (!previewRect) return;
    
    // --- Handle Slot Drag ---
    if (type === 'slot') {
        const slotId = active.data.current?.slotId as string;
        setEditedTemplate(prev => {
            const slotIndex = prev.deviceSlots?.findIndex(s => s.id === slotId);
            if (slotIndex === undefined || slotIndex === -1 || !prev.deviceSlots) return prev;
            
            const slot = prev.deviceSlots[slotIndex];
            // Position is center, so we need to account for that when getting start pixels
            const startXPixels = (slot.position.x / 100) * previewRect.width;
            const startYPixels = (slot.position.y / 100) * previewRect.height;
            const newPixelX = startXPixels + delta.x;
            const newPixelY = startYPixels + delta.y;
            
            let newXPercent = (newPixelX / previewRect.width) * 100;
            let newYPercent = (newPixelY / previewRect.height) * 100;

            newXPercent = Math.max(0, Math.min(100, newXPercent));
            newYPercent = Math.max(0, Math.min(100, newYPercent));

            const newSlots = [...prev.deviceSlots];
            newSlots[slotIndex] = { ...slot, position: { x: newXPercent, y: newYPercent }};
            return { ...prev, deviceSlots: newSlots };
        });
    }

    // --- Handle Element Drag ---
    if (type === 'element') {
        const elementId = active.data.current?.elementId as CardElementId;
        setEditedTemplate(prev => {
            const elementIndex = prev.elements.findIndex(el => el.id === elementId);
            if (elementIndex === -1) return prev;
            
            const element = prev.elements[elementIndex];
            const startXPixels = (element.position.x / 100) * previewRect.width;
            const startYPixels = (element.position.y / 100) * previewRect.height;
            const newPixelX = startXPixels + delta.x;
            const newPixelY = startYPixels + delta.y;
            const snappedX = Math.round(newPixelX / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
            const snappedY = Math.round(newPixelY / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
            let newXPercent = (snappedX / previewRect.width) * 100;
            let newYPercent = (snappedY / previewRect.height) * 100;
            
            newXPercent = Math.max(0, Math.min(100 - element.size.width, newXPercent));
            newYPercent = Math.max(0, Math.min(100 - element.size.height, newYPercent));
            
            const newElements = [...prev.elements];
            newElements[elementIndex] = { ...element, position: { x: newXPercent, y: newYPercent }};
            return { ...prev, elements: newElements };
        });
    }
    
    // --- Handle Element Resize ---
    if (type === 'resize') {
        const elementId = active.data.current?.elementId as CardElementId;
        const handle = active.data.current?.handle as string;
        setEditedTemplate(prev => {
            const elementIndex = prev.elements.findIndex(el => el.id === elementId);
            if (elementIndex === -1) return prev;

            const element = prev.elements[elementIndex];
            let { position, size } = element;

            const startWidthPixels = (size.width / 100) * previewRect.width;
            const startHeightPixels = (size.height / 100) * previewRect.height;
            const startXPixels = (position.x / 100) * previewRect.width;
            const startYPixels = (position.y / 100) * previewRect.height;
            
            let newWidthPixels = startWidthPixels;
            let newHeightPixels = startHeightPixels;
            let newXPixels = startXPixels;
            let newYPixels = startYPixels;

            if (handle.includes('right')) newWidthPixels = startWidthPixels + delta.x;
            if (handle.includes('bottom')) newHeightPixels = startHeightPixels + delta.y;
            if (handle.includes('left')) {
                newWidthPixels = startWidthPixels - delta.x;
                newXPixels = startXPixels + delta.x;
            }
            if (handle.includes('top')) {
                newHeightPixels = startHeightPixels - delta.y;
                newYPixels = startYPixels + delta.y;
            }

            let newSize = {
                width: (Math.max(SNAP_GRID_SIZE * 2, newWidthPixels) / previewRect.width) * 100,
                height: (Math.max(SNAP_GRID_SIZE * 2, newHeightPixels) / previewRect.height) * 100,
            };
            let newPosition = {
                x: (newXPixels / previewRect.width) * 100,
                y: (newYPixels / previewRect.height) * 100,
            };
            
            newPosition.x = Math.max(0, Math.min(100 - newSize.width, newPosition.x));
            newPosition.y = Math.max(0, Math.min(100 - newSize.height, newPosition.y));
            newSize.width = Math.min(100 - newPosition.x, newSize.width);
            newSize.height = Math.min(100 - newPosition.y, newSize.height);

            const newElements = [...prev.elements];
            newElements[elementIndex] = { ...element, position: newPosition, size: newSize };
            return { ...prev, elements: newElements };
        });
    }
  };
  
  const handleAlignmentAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    handleAlignment(action);
  };
  
  const handleSingleElementAlignmentAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    handleSingleElementAlignment(action);
  };
  
  const isTextElement = selectedElement && ['name', 'status', 'value', 'unit', 'temperature'].includes(selectedElement.id);
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-6xl h-[90vh] ring-1 ring-white/10 flex" onClick={e => e.stopPropagation()}>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>

        {/* Center: Preview */}
        <div className="w-1/2 bg-gray-900/50 p-8 flex flex-col items-center justify-center" onClick={() => handleSelect('element', '')} onContextMenu={handleContextMenu}>
          <div 
            ref={previewRef} 
            className="w-full max-w-[400px] transition-all duration-300 relative"
            style={{
                aspectRatio: `${editedTemplate.width || 1} / ${editedTemplate.height || 1}`
            }}
          >
            <div 
              className="absolute inset-0 bg-center" 
              style={{ backgroundImage: `
                linear-gradient(rgba(100,116,139,0.2) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100,116,139,0.2) 1px, transparent 1px)
              `, backgroundSize: `${SNAP_GRID_SIZE * 2}px ${SNAP_GRID_SIZE * 2}px`}} 
            />
            <DeviceCard
              device={sampleDevice}
              allKnownDevices={sampleAllKnownDevices}
              customizations={{}}
              onDeviceToggle={() => {}}
              template={editedTemplate}
              onTemperatureChange={()=>{}} onBrightnessChange={()=>{}} onHvacModeChange={()=>{}} onPresetChange={()=>{}} onCameraCardClick={()=>{}}
              isEditMode={false} onEditDevice={()=>{}} haUrl="" signPath={async()=>({path:''})} getCameraStreamUrl={async()=>''}
            />
            {/* --- Interactive Overlays --- */}
            {editedTemplate.elements.map(element => (
                <DraggableCanvasElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElementIds.includes(element.id)}
                  onSelect={(id, multi) => handleSelect('element', id, multi)}
                  showResizeHandles={selectedElementIds.length === 1 && selectedElementIds[0] === element.id}
                />
            ))}
             {editedTemplate.deviceSlots?.map(slot => (
                <DraggableIndicatorSlot
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedSlotId === slot.id}
                    onSelect={() => handleSelect('slot', slot.id)}
                />
             ))}
          </div>
        </div>
        
        {/* Right Side: Controls */}
        <div className="w-1/2 flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Редактор шаблона</h2>
            <p className="text-sm text-gray-400">Изменения применяются ко всем устройствам, использующим этот шаблон.</p>
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
             <div>
                <label htmlFor="templateName" className="block text-sm font-medium text-gray-300 mb-2">Название шаблона</label>
                <input
                  id="templateName"
                  type="text"
                  value={editedTemplate.name}
                  onChange={e => handleStyleChange('name', e.target.value)}
                  className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="templateWidth" className="block text-sm font-medium text-gray-300 mb-2">Ширина (ячеек)</label>
                    <input
                        id="templateWidth"
                        type="number"
                        min="1"
                        max="10"
                        value={editedTemplate.width || 1}
                        onChange={e => handleDimensionChange('width', parseInt(e.target.value, 10))}
                        className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="templateHeight" className="block text-sm font-medium text-gray-300 mb-2">Высота (ячеек)</label>
                    <input
                        id="templateHeight"
                        type="number"
                        min="1"
                        max="10"
                        value={editedTemplate.height || 1}
                        onChange={e => handleDimensionChange('height', parseInt(e.target.value, 10))}
                        className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Слои элементов</label>
              <p className="text-xs text-gray-400 mb-2">Перетащите, чтобы изменить порядок (верхний слой имеет приоритет).</p>
              <div className="space-y-2">
                <SortableContext items={editedTemplate.elements.map(e => `layer-${e.id}`)}>
                   {editedTemplate.elements.map(el => (
                      <SortableLayerItem key={el.id} element={el} isSelected={selectedElementIds.includes(el.id)} onSelect={() => handleSelect('element', el.id)} />
                   ))}
                </SortableContext>
              </div>
            </div>

            {editedTemplate.deviceType === 'climate' && (
                <div className="pt-4 border-t border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Индикаторы устройств</label>
                     <div className="space-y-2 mb-4">
                        {(editedTemplate.deviceSlots || []).map((slot, index) => (
                            <div key={slot.id} onClick={() => handleSelect('slot', slot.id)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedSlotId === slot.id ? 'bg-blue-600/50 ring-1 ring-blue-400' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                                <p className="text-sm text-gray-200 font-medium">Слот #{index + 1}</p>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveSlot(slot.id); }} className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-red-500/20 transition-colors" title="Удалить слот">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                     </div>
                     <button onClick={handleAddSlot} disabled={(editedTemplate.deviceSlots?.length ?? 0) >= 4} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed">
                         Добавить индикатор
                     </button>
                </div>
            )}


            {selectedElement && (
                <div className="bg-gray-700/30 p-4 rounded-lg space-y-4">
                    <h3 className="text-base font-semibold text-white">Свойства элемента</h3>
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-200">Видимость</label>
                        <button onClick={() => handleElementUpdate(selectedElement.id, { visible: !selectedElement.visible })}
                            className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${selectedElement.visible ? 'bg-blue-600' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${selectedElement.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {selectedElement.id === 'linked-entity' && (
                       <div className="pt-4 border-t border-gray-700">
                          <label htmlFor="linkedEntityId" className="block text-sm font-medium text-gray-300 mb-2">ID Связанного устройства</label>
                           <input
                                id="linkedEntityId"
                                type="text"
                                placeholder="например, switch.boiler"
                                value={selectedElement.styles.linkedEntityId ?? ''}
                                onChange={(e) => {
                                    handleElementUpdate(selectedElement.id, {
                                        styles: { ...selectedElement.styles, linkedEntityId: e.target.value }
                                    });
                                }}
                                className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                           />
                       </div>
                    )}
                    {isTextElement && (
                        <div className="pt-4 border-t border-gray-700 space-y-4">
                            <div className="flex items-center justify-between">
                                <label htmlFor="fontSize" className="text-sm text-gray-200">Размер шрифта (px)</label>
                                <input
                                id="fontSize"
                                type="number"
                                min="8"
                                max="100"
                                placeholder="Авто"
                                value={selectedElement.styles.fontSize ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                    handleElementUpdate(selectedElement.id, {
                                    styles: { ...selectedElement.styles, fontSize: value }
                                    });
                                }}
                                className="w-24 bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-200">Выравнивание</label>
                                <div className="flex items-center bg-gray-900 rounded-lg p-1">
                                    {(['left', 'center', 'right'] as const).map((align) => (
                                    <button
                                        key={align}
                                        onClick={() => handleElementUpdate(selectedElement.id, { styles: { ...selectedElement.styles, textAlign: align }})}
                                        title={`Выровнять по ${align === 'left' ? 'левому краю' : align === 'center' ? 'центру' : 'правому краю'}`}
                                        className={`p-1 rounded-md transition-colors ${(selectedElement.styles.textAlign || 'left') === align ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        {align === 'left' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
                                        {align === 'center' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-2 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
                                        {align === 'right' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm7 4a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zm-7 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm7 4a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
                                    </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {['value', 'temperature'].includes(selectedElement.id) && (
                      <div className="flex items-center justify-between">
                        <label htmlFor="decimalPlaces" className="text-sm text-gray-200">Знаков после запятой</label>
                        <input
                          id="decimalPlaces"
                          type="number"
                          min="0"
                          max="5"
                          step="1"
                          value={selectedElement.styles.decimalPlaces ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                            handleElementUpdate(selectedElement.id, {
                              styles: { ...selectedElement.styles, decimalPlaces: value }
                            });
                          }}
                          className="w-20 bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {selectedElement.id === 'icon' && (
                        <div className="pt-2 border-t border-gray-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <label htmlFor="iconOnColor" className="text-sm text-gray-200">Цвет иконки (вкл.)</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleElementUpdate(selectedElement.id, { styles: { ...selectedElement.styles, onColor: defaultIconOnColor }})} title="Сбросить цвет" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                                        <ResetIcon />
                                    </button>
                                    <input
                                        type="color"
                                        id="iconOnColor"
                                        value={selectedElement.styles.onColor || defaultIconOnColor}
                                        onChange={(e) => handleElementUpdate(selectedElement.id, { styles: { ...selectedElement.styles, onColor: e.target.value }})}
                                        className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="iconOffColor" className="text-sm text-gray-200">Цвет иконки (выкл.)</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleElementUpdate(selectedElement.id, { styles: { ...selectedElement.styles, offColor: defaultIconOffColor }})} title="Сбросить цвет" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                                        <ResetIcon />
                                    </button>
                                    <input
                                        type="color"
                                        id="iconOffColor"
                                        value={selectedElement.styles.offColor || defaultIconOffColor}
                                        onChange={(e) => handleElementUpdate(selectedElement.id, { styles: { ...selectedElement.styles, offColor: e.target.value }})}
                                        className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {selectedSlot && (
                <div className="bg-gray-700/30 p-4 rounded-lg space-y-4">
                    <h3 className="text-base font-semibold text-white">Свойства индикатора</h3>
                    <div className="flex items-center justify-between">
                        <label htmlFor="iconSize" className="text-sm text-gray-200">Размер иконки ({selectedSlot.iconSize}px)</label>
                        <input id="iconSize" type="range" min="20" max="48" value={selectedSlot.iconSize} onChange={e => handleSlotUpdate(selectedSlot.id, { iconSize: parseInt(e.target.value, 10)})} className="w-1/2 accent-blue-500" />
                    </div>
                     <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-200">Интерактивный</label>
                        <button onClick={() => handleSlotUpdate(selectedSlot.id, { interactive: !selectedSlot.interactive })} className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${selectedSlot.interactive ? 'bg-blue-600' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${selectedSlot.interactive ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                     <div className="pt-4 border-t border-gray-700 space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Визуальный стиль</h4>
                        <select value={selectedSlot.visualStyle.type} onChange={e => handleSlotVisualStyleUpdate(selectedSlot.id, { type: e.target.value as any })} className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                            <option value="color">Цвет</option>
                            <option value="glow">Свечение</option>
                            <option value="animation">Анимация</option>
                            <option value="color_glow">Цвет + Свечение</option>
                            <option value="color_animation">Цвет + Анимация</option>
                        </select>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-200">Цвет (актив.)</label>
                            <input type="color" value={selectedSlot.visualStyle.activeColor} onChange={(e) => handleSlotVisualStyleUpdate(selectedSlot.id, { activeColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-200">Цвет (неактив.)</label>
                            <input type="color" value={selectedSlot.visualStyle.inactiveColor} onChange={(e) => handleSlotVisualStyleUpdate(selectedSlot.id, { inactiveColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                        </div>
                        {selectedSlot.visualStyle.type.includes('glow') && (
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-200">Интенсивность свечения</label>
                                <input type="range" min="0" max="1" step="0.1" value={selectedSlot.visualStyle.glowIntensity} onChange={e => handleSlotVisualStyleUpdate(selectedSlot.id, { glowIntensity: parseFloat(e.target.value)})} className="w-1/3 accent-blue-500" />
                            </div>
                        )}
                         {selectedSlot.visualStyle.type.includes('animation') && (
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-200">Тип анимации</label>
                                <select value={selectedSlot.visualStyle.animationType} onChange={e => handleSlotVisualStyleUpdate(selectedSlot.id, { animationType: e.target.value as any })} className="bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                    <option value="none">Нет</option>
                                    <option value="pulse">Пульс</option>
                                    <option value="rotate">Вращение</option>
                                </select>
                            </div>
                         )}
                     </div>
                </div>
            )}

            <div className="space-y-4">
                 <h3 className="text-base font-semibold text-white">Общие стили</h3>
                 <div className="flex items-center justify-between">
                    <label htmlFor="bgColor" className="text-sm text-gray-200">Цвет фона (выкл.)</label>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStyleChange('backgroundColor', defaultBackgroundColor)} title="Сбросить цвет" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                            <ResetIcon />
                        </button>
                        <input type="color" id="bgColor" value={editedTemplate.styles.backgroundColor} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                </div>
                 <div className="flex items-center justify-between">
                    <label htmlFor="onBgColor" className="text-sm text-gray-200">Цвет фона (вкл.)</label>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStyleChange('onBackgroundColor', defaultOnBackgroundColor)} title="Сбросить цвет" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                           <ResetIcon />
                        </button>
                        <input type="color" id="onBgColor" value={editedTemplate.styles.onBackgroundColor || defaultOnBackgroundColor} onChange={(e) => handleStyleChange('onBackgroundColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                 </div>
            </div>

          </div>

          <div className="p-6 flex justify-end gap-4 bg-gray-800/50 rounded-b-2xl border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>
        </DndContext>
      </div>
      
       {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={!!contextMenu}
          onClose={() => setContextMenu(null)}
        >
          {selectedElementIds.length > 1 ? (
            <>
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'align-left')}><span>⬅️</span><span>Выровнять по левому краю</span></div>
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'align-right')}><span>➡️</span><span>Выровнять по правому краю</span></div>
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'align-top')}><span>⬆️</span><span>Выровнять по верхнему краю</span></div>
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'align-bottom')}><span>⬇️</span><span>Выровнять по нижнему краю</span></div>
              <div className="h-px bg-gray-600/50 my-1" />
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'align-center-vertical')}><span>↕️</span><span>Выровнять по центру (верт)</span></div>
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'align-center-horizontal')}><span>↔️</span><span>Выровнять по центру (гориз)</span></div>
              <div className="h-px bg-gray-600/50 my-1" />
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'distribute-horizontal')}><span>📏</span><span>Распределить по горизонтали</span></div>
              <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleAlignmentAction(e, 'distribute-vertical')}><span>📏</span><span>Распределить по вертикали</span></div>
            </>
          ) : selectedElementIds.length === 1 ? (
             <>
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleSingleElementAlignmentAction(e, 'align-single-left')}><span>⬅️</span><span>По левому краю</span></div>
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleSingleElementAlignmentAction(e, 'align-single-right')}><span>➡️</span><span>По правому краю</span></div>
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleSingleElementAlignmentAction(e, 'align-single-top')}><span>⬆️</span><span>По верхнему краю</span></div>
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleSingleElementAlignmentAction(e, 'align-single-bottom')}><span>⬇️</span><span>По нижнему краю</span></div>
                <div className="h-px bg-gray-600/50 my-1" />
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleSingleElementAlignmentAction(e, 'align-single-center-horizontal')}><span>↔️</span><span>По центру (горизонталь)</span></div>
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer flex items-center gap-2" onClick={(e) => handleSingleElementAlignmentAction(e, 'align-single-center-vertical')}><span>↕️</span><span>По центру (вертикаль)</span></div>
             </>
          ) : null}
        </ContextMenu>
      )}
    </div>
  );
};

export default React.memo(TemplateEditorModal);