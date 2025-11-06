
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { CardTemplate, Device, DeviceType, CardElementId, CardElement } from '../types';
import DeviceCard from './DeviceCard';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  useDraggable,
  UniqueIdentifier,
  DragOverlay
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: element.id, data: { type: 'layer' }});
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
      status: 'Статус'
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

// --- Draggable Element Overlay ---
const DraggableElementOverlay: React.FC<{
  element: CardElement;
  isSelected: boolean;
  onSelect: (id: CardElementId) => void;
}> = ({ element, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: element.id,
    data: { type: 'element' },
    disabled: !element.visible,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(element.id); }}
      className="absolute group cursor-move transition-all duration-100"
      style={{
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        width: `${element.size.width}%`,
        height: `${element.size.height}%`,
        zIndex: element.zIndex + 10,
        outline: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(59, 130, 246, 0.3)',
        outlineOffset: '2px',
        display: element.visible ? 'block' : 'none',
        visibility: isDragging ? 'hidden' : 'visible',
      }}
    >
      {isSelected && (
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


// --- Main Modal Component ---
interface TemplateEditorModalProps {
  template: CardTemplate;
  onSave: (newTemplate: CardTemplate) => void;
  onClose: () => void;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ template, onSave, onClose }) => {
  const [editedTemplate, setEditedTemplate] = useState<CardTemplate>(template);
  const [selectedElementId, setSelectedElementId] = useState<CardElementId | null>(null);
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [dragStartData, setDragStartData] = useState<{ element: CardElement, startPos: {x:number, y:number} } | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 2 } }));

  const sampleDevice: Device = {
    id: 'sensor.sample_temperature',
    name: 'Температура в кабинете',
    status: '25.9',
    type: DeviceType.Sensor,
    unit: '°C',
    history: Array.from({ length: 20 }, (_, i) => 25 + Math.sin(i / 3) + (Math.random() - 0.5)),
    haDomain: 'sensor',
  };

  const selectedElement = useMemo(() =>
    editedTemplate.elements.find(el => el.id === selectedElementId)
  , [selectedElementId, editedTemplate.elements]);


  const handleElementUpdate = (elementId: CardElementId, updates: Partial<CardElement>) => {
      setEditedTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(el => el.id === elementId ? { ...el, ...updates } : el)
      }));
  };
  
  const handleStyleChange = (key: 'backgroundColor', value: any) => {
    setEditedTemplate(prev => ({ ...prev, styles: { ...prev.styles, [key]: value } }));
  };
  
  const handleSave = () => onSave(editedTemplate);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id);
    setActiveDragData(active.data.current);

    const type = active.data.current?.type;
    const elementId = (active.data.current?.elementId || active.id) as CardElementId;
    const element = editedTemplate.elements.find(el => el.id === elementId);

    if (element && (type === 'element' || type === 'resize')) {
        const previewRect = previewRef.current?.getBoundingClientRect();
        if (!previewRect) return;

        setDragStartData({
            element: { ...element },
            startPos: { 
                x: (element.position.x / 100) * previewRect.width,
                y: (element.position.y / 100) * previewRect.height
            }
        });
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event;
    if (!dragStartData) return;
    const { element: startElement } = dragStartData;
    const type = active.data.current?.type;
    const previewRect = previewRef.current?.getBoundingClientRect();
    if (!previewRect) return;
    
    let newPosition = { ...startElement.position };
    let newSize = { ...startElement.size };

    if (type === 'element') {
        const newPixelX = dragStartData.startPos.x + delta.x;
        const newPixelY = dragStartData.startPos.y + delta.y;
        
        newPosition.x = (Math.round(newPixelX / SNAP_GRID_SIZE) * SNAP_GRID_SIZE / previewRect.width) * 100;
        newPosition.y = (Math.round(newPixelY / SNAP_GRID_SIZE) * SNAP_GRID_SIZE / previewRect.height) * 100;
    
    } else if (type === 'resize') {
        const handle = active.data.current?.handle;
        
        const startWidthPixels = (startElement.size.width / 100) * previewRect.width;
        const startHeightPixels = (startElement.size.height / 100) * previewRect.height;
        const startXPixels = (startElement.position.x / 100) * previewRect.width;
        const startYPixels = (startElement.position.y / 100) * previewRect.height;

        let newWidthPixels = startWidthPixels;
        let newHeightPixels = startHeightPixels;
        let newXPixels = startXPixels;
        let newYPixels = startYPixels;

        if (handle.includes('right')) {
            newWidthPixels = startWidthPixels + delta.x;
        }
        if (handle.includes('bottom')) {
            newHeightPixels = startHeightPixels + delta.y;
        }
        if (handle.includes('left')) {
            newWidthPixels = startWidthPixels - delta.x;
            newXPixels = startXPixels + delta.x;
        }
        if (handle.includes('top')) {
            newHeightPixels = startHeightPixels - delta.y;
            newYPixels = startYPixels + delta.y;
        }
        
        // Snapping
        const snappedWidth = Math.max(SNAP_GRID_SIZE, Math.round(newWidthPixels / SNAP_GRID_SIZE) * SNAP_GRID_SIZE);
        const snappedHeight = Math.max(SNAP_GRID_SIZE, Math.round(newHeightPixels / SNAP_GRID_SIZE) * SNAP_GRID_SIZE);
        const snappedX = Math.round(newXPixels / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
        const snappedY = Math.round(newYPixels / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;

        newPosition.x = (snappedX / previewRect.width) * 100;
        newPosition.y = (snappedY / previewRect.height) * 100;
        newSize.width = (snappedWidth / previewRect.width) * 100;
        newSize.height = (snappedHeight / previewRect.height) * 100;

        // Correct position if width/height changed from left/top handles
        if (handle.includes('left')) {
            const widthDiffPixels = snappedWidth - startWidthPixels;
            newPosition.x = ((startXPixels - widthDiffPixels) / previewRect.width) * 100;
        }
        if (handle.includes('top')) {
            const heightDiffPixels = snappedHeight - startHeightPixels;
            newPosition.y = ((startYPixels - heightDiffPixels) / previewRect.height) * 100;
        }
    }
    
    // Clamp values between 0 and 100
    newPosition.x = Math.max(0, Math.min(100 - newSize.width, newPosition.x));
    newPosition.y = Math.max(0, Math.min(100 - newSize.height, newPosition.y));
    newSize.width = Math.max(5, Math.min(100 - newPosition.x, newSize.width));
    newSize.height = Math.max(5, Math.min(100 - newPosition.y, newSize.height));

    handleElementUpdate(startElement.id, { position: newPosition, size: newSize });
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const type = active.data.current?.type;

    if (type === 'layer' && over && active.id !== over.id) {
        setEditedTemplate(prev => {
            const oldIndex = prev.elements.findIndex(e => e.id === active.id);
            const newIndex = prev.elements.findIndex(e => e.id === over.id);
            const reorderedElements = arrayMove(prev.elements, oldIndex, newIndex);
            // Re-assign zIndex based on new order (top of list = higher zIndex)
            const updatedZIndexes = reorderedElements.map((el, index) => ({
                ...el,
                zIndex: reorderedElements.length - index
            }));
            return { ...prev, elements: updatedZIndexes };
        });
    }

    setActiveDragId(null);
    setActiveDragData(null);
    setDragStartData(null);
  };
  
  const defaultBackgroundColor = 'rgb(31 41 55 / 0.8)';
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-6xl h-[80vh] ring-1 ring-white/10 flex" onClick={e => e.stopPropagation()}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>

        {/* Center: Preview */}
        <div className="w-1/2 bg-gray-900/50 p-8 flex flex-col items-center justify-center" onClick={() => setSelectedElementId(null)}>
          <div ref={previewRef} className="w-[300px] h-[300px] transition-all duration-300 relative">
            <div 
              className="absolute inset-0 bg-center" 
              style={{ backgroundImage: `
                linear-gradient(rgba(100,116,139,0.2) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100,116,139,0.2) 1px, transparent 1px)
              `, backgroundSize: `${SNAP_GRID_SIZE * 2}px ${SNAP_GRID_SIZE * 2}px`}} 
            />
            <DeviceCard
              device={sampleDevice}
              template={editedTemplate}
              onTemperatureChange={()=>{}} onBrightnessChange={()=>{}} onPresetChange={()=>{}} onCameraCardClick={()=>{}}
              isEditMode={false} onEditDevice={()=>{}} haUrl="" signPath={async()=>({path:''})} getCameraStreamUrl={async()=>''}
            />
            {/* --- Interactive Overlays --- */}
            {editedTemplate.elements.map(element => (
                <DraggableElementOverlay
                  key={element.id}
                  element={element}
                  isSelected={selectedElementId === element.id}
                  onSelect={setSelectedElementId}
                />
            ))}
          </div>
        </div>
        
        {/* Right Side: Controls */}
        <div className="w-1/2 flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Редактор шаблона (Сенсор)</h2>
            <p className="text-sm text-gray-400">Изменения применяются ко всем сенсорам.</p>
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Слои</label>
              <p className="text-xs text-gray-400 mb-2">Перетащите, чтобы изменить порядок (верхний слой имеет приоритет).</p>
              <div className="space-y-2">
                <SortableContext items={editedTemplate.elements.map(e => e.id)}>
                   {editedTemplate.elements.map(el => (
                      <SortableLayerItem key={el.id} element={el} isSelected={selectedElementId === el.id} onSelect={() => setSelectedElementId(el.id)} />
                   ))}
                </SortableContext>
              </div>
            </div>

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
                    {(selectedElement.id === 'name' || selectedElement.id === 'value') && (
                         <div className="flex items-center justify-between">
                            <label htmlFor="fontSize" className="text-sm text-gray-200">Размер шрифта</label>
                            <div className="flex items-center gap-2">
                               <input type="range" id="fontSize" min="10" max="64" value={selectedElement.styles.fontSize || 16} 
                                   onChange={(e) => handleElementUpdate(selectedElement.id, { styles: { ...selectedElement.styles, fontSize: parseInt(e.target.value) } })}
                                   className="w-32 accent-blue-500" />
                               <span className="text-xs text-gray-400 w-8 text-right">{selectedElement.styles.fontSize}px</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="space-y-4">
                 <h3 className="text-base font-semibold text-white">Общие стили</h3>
                 <div className="flex items-center justify-between">
                    <label htmlFor="bgColor" className="text-sm text-gray-200">Цвет фона</label>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStyleChange('backgroundColor', defaultBackgroundColor)} title="Сбросить цвет" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a5.002 5.002 0 008.057 4.918 1 1 0 011.885.666A7.002 7.002 0 012.199 14.101V17a1 1 0 01-2 0v-5a1 1 0 011-1h5a1 1 0 010 2H4.008z" clipRule="evenodd" /></svg>
                        </button>
                        <input type="color" id="bgColor" value={editedTemplate.styles.backgroundColor} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                </div>
            </div>

          </div>

          <div className="p-6 flex justify-end gap-4 bg-gray-800/50 rounded-b-2xl border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
            {(() => {
              if (!activeDragId || activeDragData?.type !== 'element') return null;

              const activeElement = editedTemplate.elements.find(el => el.id === activeDragId);
              if (!activeElement) return null;
              
              const previewRect = previewRef.current?.getBoundingClientRect();
              const width = previewRect ? (activeElement.size.width / 100) * previewRect.width : 0;
              const height = previewRect ? (activeElement.size.height / 100) * previewRect.height : 0;
              
              return (
                <div
                  className="bg-blue-500/20 ring-2 ring-blue-500 rounded-sm opacity-75"
                  style={{ width, height }}
                />
              );
            })()}
        </DragOverlay>

        </DndContext>
      </div>
    </div>
  );
};

export default TemplateEditorModal;
