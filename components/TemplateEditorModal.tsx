import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, PanInfo } from 'framer-motion';
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
  name: 'Название', icon: 'Иконка', value: 'Значение', unit: 'Единица изм.', chart: 'График',
  status: 'Статус', slider: 'Слайдер', temperature: 'Текущая темп.',
  'target-temperature': 'Термостат (кольцо)', 'hvac-modes': 'Режимы климата',
  'linked-entity': 'Связанное устройство', battery: 'Уровень заряда', 'fan-speed-control': 'Скорость вентилятора'
};

const SortableLayerItem: React.FC<{
  element: CardElement; isSelected: boolean; onSelect: (e: React.MouseEvent) => void;
  onToggleVisibility: () => void; onDelete: () => void; onToggleLock: () => void;
}> = ({ element, isSelected, onSelect, onToggleVisibility, onDelete, onToggleLock }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: element.uniqueId, disabled: !!element.locked });
  
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} 
      className={`flex items-center justify-between p-2 mb-2 rounded-md border ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'} ${element.locked ? 'opacity-60' : ''}`} 
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <div {...listeners} className={`cursor-grab text-gray-400 ${element.locked ? 'cursor-not-allowed' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <Icon icon="mdi:drag" className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{ELEMENT_LABELS[element.id]}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${element.locked ? 'text-blue-500' : 'text-gray-400'}`}>
          <Icon icon={element.locked ? "mdi:pin" : "mdi:pin-outline"} className="w-4 h-4" />
        </button>
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

const SingleElementEditor: React.FC<{
    element: CardElement; template: CardTemplate; onChange: (updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => void; snapToGrid: boolean;
}> = ({ element, template, onChange, snapToGrid }) => {
    const GRID_STEP = 5;

    const updateStyle = (key: keyof ElementStyles, value: any) => onChange({ styles: { [key]: value } });
    const handleClearStyle = (key: keyof ElementStyles) => {
      const newStyles = { ...element.styles }; delete newStyles[key]; onChange({ styles: newStyles });
    };
    
    const handleNumericChange = (updateFunc: (val: number | undefined) => void, value: string, shouldSnap: boolean, allowUndefined = false, min: number | null = null) => {
        if (value.trim() === '' && allowUndefined) { updateFunc(undefined); return; }
        let numValue = parseFloat(value);
        if (isNaN(numValue)) { if (value.trim() === '' && !allowUndefined) { numValue = 0; } else { return; } }
        if(min !== null) numValue = Math.max(min, numValue);
        updateFunc((shouldSnap && snapToGrid) ? Math.round(numValue / GRID_STEP) * GRID_STEP : numValue);
    };

    return (
        <div className="space-y-4 p-1">
            <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-[10px] text-gray-400">Центр X (%)</span><input type="number" value={element.position.x} onChange={e => handleNumericChange((val) => onChange({ position: { ...element.position, x: val! } }), e.target.value, true)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Центр Y (%)</span><input type="number" value={element.position.y} onChange={e => handleNumericChange((val) => onChange({ position: { ...element.position, y: val! } }), e.target.value, true)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Ширина (%)</span><input type="number" min="0" value={element.size.width} onChange={e => handleNumericChange((val) => onChange({ size: { ...element.size, width: val! } }), e.target.value, true, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Высота (%)</span><input type="number" min="0" value={element.size.height} onChange={e => handleNumericChange((val) => onChange({ size: { ...element.size, height: val! } }), e.target.value, true, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                </div>
            </div>
            {/* Other properties remain the same */}
        </div>
    );
};

const AlignmentTools: React.FC<{ onAlign: (type: string) => void }> = ({ onAlign }) => {
  const buttons = [
    { type: 'align-left', icon: 'mdi:format-align-left' }, { type: 'align-h-center', icon: 'mdi:format-align-center' }, { type: 'align-right', icon: 'mdi:format-align-right' },
    { type: 'align-top', icon: 'mdi:format-align-top' }, { type: 'align-v-center', icon: 'mdi:format-align-middle' }, { type: 'align-bottom', icon: 'mdi:format-align-bottom' },
    { type: 'distribute-h', icon: 'mdi:format-horizontal-align-center' }, { type: 'distribute-v', icon: 'mdi:format-vertical-align-center' }
  ];
  return (
    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md grid grid-cols-4 gap-1">
      {buttons.map(btn => (
        <button key={btn.type} onClick={() => onAlign(btn.type)} className="p-1.5 bg-white dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon={btn.icon} className="w-4 h-4 mx-auto" /></button>
      ))}
    </div>
  );
};

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ templateToEdit, onClose }) => {
  const { handleSaveTemplate, colorScheme } = useAppStore();
  const [template, setTemplate] = useState<CardTemplate>(() => JSON.parse(JSON.stringify(templateToEdit)));
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  
  const sensors = useSensors(useSensor(PointerSensor));
  const previewRef = useRef<HTMLDivElement>(null);
  const dragStartPositions = useRef<Map<string, { x: number, y: number }>>(new Map());

  const handleDragEndLayers = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setTemplate(p => ({ ...p, elements: arrayMove(p.elements, p.elements.findIndex(e => e.uniqueId === active.id), p.elements.findIndex(e => e.uniqueId === over.id)) }));
    }
  };

  const handleAddElement = (id: CardElementId) => {
    const el: CardElement = { id, uniqueId: nanoid(), visible: true, position: { x: 50, y: 50 }, size: { width: 30, height: 20 }, zIndex: template.elements.length + 1, styles: { fontSize: 14 }, sizeMode: 'card' };
    setTemplate(p => ({ ...p, elements: [...p.elements, el] }));
    setSelectedElementIds([el.uniqueId]);
  };

  const handleRemoveElements = () => {
    setTemplate(p => ({ ...p, elements: p.elements.filter(e => !selectedElementIds.includes(e.uniqueId)) }));
    setSelectedElementIds([]);
  };

  const updateElements = (ids: string[], updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => {
    setTemplate(p => ({ ...p, elements: p.elements.map(e => ids.includes(e.uniqueId) ? { ...e, ...updates, styles: { ...e.styles, ...(updates as any).styles } } : e) }));
  };

  const handleToggleVisibility = (id: string) => {
    setTemplate(p => ({ ...p, elements: p.elements.map(e => e.uniqueId === id ? { ...e, visible: !e.visible } : e) }));
  };
  
  const handleToggleLock = (ids: string[]) => {
      const isAnyLocked = template.elements.some(el => ids.includes(el.uniqueId) && el.locked);
      updateElements(ids, { locked: !isAnyLocked });
  };

  const handleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (template.elements.find(el => el.uniqueId === id)?.locked) return;
    if (e.shiftKey) {
      setSelectedElementIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
    } else {
      setSelectedElementIds([id]);
    }
  };

  const handleDragStart = (el: CardElement) => {
    dragStartPositions.current.clear();
    const selectedAndUnlocked = template.elements.filter(e => selectedElementIds.includes(e.uniqueId) && !e.locked);
    if (!selectedAndUnlocked.some(e => e.uniqueId === el.uniqueId)) { // If dragging an unselected item
        setSelectedElementIds([el.uniqueId]);
        dragStartPositions.current.set(el.uniqueId, el.position);
    } else { // Dragging a selection
        selectedAndUnlocked.forEach(e => dragStartPositions.current.set(e.uniqueId, e.position));
    }
  };

  const handleDrag = (info: PanInfo) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const deltaX = (info.offset.x / rect.width) * 100;
    const deltaY = (info.offset.y / rect.height) * 100;
    
    setTemplate(p => ({ ...p, elements: p.elements.map(el => {
      const startPos = dragStartPositions.current.get(el.uniqueId);
      return startPos ? { ...el, position: { x: startPos.x + deltaX, y: startPos.y + deltaY } } : el;
    })}));
  };
  
  const handleDragEnd = () => {
    if (snapToGrid) {
        setTemplate(p => ({ ...p, elements: p.elements.map(el => {
            if (dragStartPositions.current.has(el.uniqueId)) {
                return { ...el, position: { x: Math.round(el.position.x / 5) * 5, y: Math.round(el.position.y / 5) * 5 }};
            }
            return el;
        })}));
    }
    dragStartPositions.current.clear();
  };

  const handleAlign = (type: string) => {
    const selected = template.elements.filter(el => selectedElementIds.includes(el.uniqueId) && !el.locked);
    if (selected.length < 2) return;

    const bounds = selected.map(el => ({ id: el.uniqueId, left: el.position.x - el.size.width / 2, right: el.position.x + el.size.width / 2, top: el.position.y - el.size.height / 2, bottom: el.position.y + el.size.height / 2, hCenter: el.position.x, vCenter: el.position.y, width: el.size.width, height: el.size.height }));
    const anchor = bounds[0];

    let newElements = [...template.elements];

    switch(type) {
        case 'align-left': { const target = Math.min(...bounds.map(b => b.left)); newElements = newElements.map(el => selected.some(s => s.uniqueId === el.uniqueId) ? {...el, position: {...el.position, x: target + el.size.width / 2}} : el); break; }
        case 'align-right': { const target = Math.max(...bounds.map(b => b.right)); newElements = newElements.map(el => selected.some(s => s.uniqueId === el.uniqueId) ? {...el, position: {...el.position, x: target - el.size.width / 2}} : el); break; }
        case 'align-h-center': { const target = anchor.hCenter; newElements = newElements.map(el => selected.some(s => s.uniqueId === el.uniqueId) ? {...el, position: {...el.position, x: target}} : el); break; }
        case 'align-top': { const target = Math.min(...bounds.map(b => b.top)); newElements = newElements.map(el => selected.some(s => s.uniqueId === el.uniqueId) ? {...el, position: {...el.position, y: target + el.size.height / 2}} : el); break; }
        case 'align-bottom': { const target = Math.max(...bounds.map(b => b.bottom)); newElements = newElements.map(el => selected.some(s => s.uniqueId === el.uniqueId) ? {...el, position: {...el.position, y: target - el.size.height / 2}} : el); break; }
        case 'align-v-center': { const target = anchor.vCenter; newElements = newElements.map(el => selected.some(s => s.uniqueId === el.uniqueId) ? {...el, position: {...el.position, y: target}} : el); break; }
        case 'distribute-h': { const sorted = bounds.sort((a,b) => a.left - b.left); const min = sorted[0].left; const max = sorted[sorted.length-1].right; const totalWidth = sorted.reduce((sum, b) => sum + b.width, 0); const spacing = (max - min - totalWidth) / (sorted.length - 1); let currentX = min; newElements = newElements.map(el => { const b = sorted.find(s => s.id === el.uniqueId); if(b) { const newX = currentX + b.width/2; currentX += b.width + spacing; return {...el, position: {...el.position, x: newX}}; } return el; }); break; }
        case 'distribute-v': { const sorted = bounds.sort((a,b) => a.top - b.top); const min = sorted[0].top; const max = sorted[sorted.length-1].bottom; const totalHeight = sorted.reduce((sum, b) => sum + b.height, 0); const spacing = (max - min - totalHeight) / (sorted.length - 1); let currentY = min; newElements = newElements.map(el => { const b = sorted.find(s => s.id === el.uniqueId); if(b) { const newY = currentY + b.height/2; currentY += b.height + spacing; return {...el, position: {...el.position, y: newY}}; } return el; }); break; }
    }
    
    setTemplate(p => ({...p, elements: newElements }));
  };

  const selectedElement = useMemo(() => template.elements.find(e => e.uniqueId === selectedElementIds[0]), [selectedElementIds, template.elements]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setSelectedElementIds([])}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-72 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Слои</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLayers}>
                        <SortableContext items={template.elements.map(e => e.uniqueId)} strategy={verticalListSortingStrategy}>
                            {template.elements.map(el => <SortableLayerItem key={el.uniqueId} element={el} isSelected={selectedElementIds.includes(el.uniqueId)} onSelect={(e) => handleSelect(e, el.uniqueId)} onToggleVisibility={() => handleToggleVisibility(el.uniqueId)} onDelete={() => { handleRemoveElements(); setSelectedElementIds([el.uniqueId]); }} onToggleLock={() => handleToggleLock([el.uniqueId])} />)}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Center Preview */}
            <div ref={previewRef} className="flex-1 bg-gray-100 dark:bg-gray-900 p-8 flex items-center justify-center relative overflow-hidden grid-background">
                <DeviceCard device={useMemo(() => ({ id:'p', name:'Превью', status:'Вкл', state:'on', type:template.deviceType as any, haDomain:'', attributes:{}, brightness:80, temperature:22, targetTemperature:24, hvacAction:'heating' }), [template.deviceType])} template={template} cardWidth={template.width || 1} cardHeight={template.height || 1} allKnownDevices={new Map()} customizations={{}} isEditMode={false} isPreview={true} onDeviceToggle={()=>{}} onTemperatureChange={()=>{}} onBrightnessChange={()=>{}} onHvacModeChange={()=>{}} onPresetChange={()=>{}} onFanSpeedChange={()=>{}} onEditDevice={()=>{}} haUrl="" signPath={async p=>({path:p})} colorScheme={colorScheme.light} isDark={false} />
                {template.elements.map(el => el.visible && (
                    <motion.div key={el.uniqueId}
                        className={`absolute border-2 cursor-grab active:cursor-grabbing ${selectedElementIds.includes(el.uniqueId) ? 'border-blue-500 z-50 bg-blue-500/10' : 'border-transparent hover:border-blue-300/50'} ${el.locked ? 'cursor-not-allowed' : ''}`}
                        style={{ left: `${el.position.x}%`, top: `${el.position.y}%`, width: `${el.size.width}%`, height: `${el.size.height}%`, transform: 'translate(-50%, -50%)' }}
                        onClick={(e) => handleSelect(e, el.uniqueId)}
                        drag={!el.locked} onDragStart={() => handleDragStart(el)} onDrag={(e,i) => handleDrag(i)} onDragEnd={handleDragEnd} dragMomentum={false}
                    >
                        {el.locked && <Icon icon="mdi:pin" className="absolute -top-1 -right-1 text-white bg-blue-500 rounded-full p-0.5 w-4 h-4" />}
                    </motion.div>
                ))}
            </div>

            {/* Right Sidebar */}
            <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                {selectedElementIds.length > 0 ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{selectedElementIds.length > 1 ? `${selectedElementIds.length} элемента` : ELEMENT_LABELS[selectedElement!.id]}</h3>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleToggleLock(selectedElementIds)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"><Icon icon="mdi:pin" className="w-4 h-4" /></button>
                                <button onClick={handleRemoveElements} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-500"><Icon icon="mdi:trash-can-outline" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto no-scrollbar space-y-4">
                            {selectedElementIds.length > 1 && <AlignmentTools onAlign={handleAlign} />}
                            {selectedElementIds.length === 1 && selectedElement && <SingleElementEditor element={selectedElement} template={template} onChange={(u) => updateElements([selectedElement.uniqueId], u)} snapToGrid={snapToGrid} />}
                        </div>
                    </>
                ) : (
                    <div className="p-4 text-center text-sm text-gray-500">Выберите элемент для редактирования.</div>
                )}
            </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div> {/* Placeholder */} </div>
          <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">Отмена</button>
              <button onClick={()=>{handleSaveTemplate(template); onClose();}} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorModal;
