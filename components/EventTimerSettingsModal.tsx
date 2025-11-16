import React, { useState, useEffect, useMemo } from 'react';
import { EventTimerWidget, Device, DeviceType, ColorThemeSet } from '../types';
import { useAppStore } from '../store/appStore';
// FIX: Changed import for parseISO to a subpath import to fix module resolution error.
import { format } from 'date-fns';
import { parseISO } from 'date-fns/parseISO';
import EventTimerWidgetCard from './EventTimerWidgetCard';

interface EventTimerSettingsModalProps {
    widgetId: string;
    onClose: () => void;
    currentColorScheme: ColorThemeSet;
}

const LabeledInput: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
        {children}
    </div>
);

const EventTimerSettingsModal: React.FC<EventTimerSettingsModalProps> = ({ widgetId, onClose, currentColorScheme }) => {
    const { eventTimerWidgets, updateCustomWidget } = useAppStore();
    const widget = eventTimerWidgets.find(w => w.id === widgetId);

    const [name, setName] = useState('');
    const [cycleDays, setCycleDays] = useState(14);
    const [lastResetDate, setLastResetDate] = useState<string | null>(null);
    const [fillColors, setFillColors] = useState<[string, string, string]>(['#22c55e', '#f59e0b', '#ef4444']);
    const [animation, setAnimation] = useState<'smooth' | 'wave' | 'bubbles' | 'none'>('smooth');
    const [showName, setShowName] = useState(false);
    const [nameFontSize, setNameFontSize] = useState<number | undefined>();
    const [namePosition, setNamePosition] = useState({ x: 50, y: 15 });
    const [daysRemainingFontSize, setDaysRemainingFontSize] = useState<number | undefined>();
    const [daysRemainingPosition, setDaysRemainingPosition] = useState({ x: 50, y: 50 });

    useEffect(() => {
        if (widget) {
            setName(widget.name);
            setCycleDays(widget.cycleDays);
            setLastResetDate(widget.lastResetDate);
            setFillColors(widget.fillColors || ['#22c55e', '#f59e0b', '#ef4444']);
            setAnimation(widget.animation || 'smooth');
            setShowName(widget.showName || false);
            setNameFontSize(widget.nameFontSize);
            setNamePosition(widget.namePosition || { x: 50, y: 15 });
            setDaysRemainingFontSize(widget.daysRemainingFontSize);
            setDaysRemainingPosition(widget.daysRemainingPosition || { x: 50, y: 50 });
        }
    }, [widget]);
    
    const previewDevice = useMemo<Device>(() => {
        const fillPercentage = 75; // Sample fill for a good-looking preview
        const daysPassed = Math.floor((cycleDays * fillPercentage) / 100);
        const daysRemaining = Math.max(0, cycleDays - daysPassed);

        return {
            id: `preview-${widgetId}`,
            name: name,
            status: `Осталось ${daysRemaining} дн.`,
            type: DeviceType.EventTimer,
            haDomain: 'internal',
            fillPercentage: fillPercentage,
            daysRemaining: daysRemaining,
            state: 'active',
            widgetId: widgetId,
            buttonText: 'Сброс',
            fillColors: fillColors,
            animation: animation,
            showName: showName,
            nameFontSize,
            namePosition,
            daysRemainingFontSize,
            daysRemainingPosition,
        };
    }, [
        widgetId, name, cycleDays, fillColors, animation, showName,
        nameFontSize, namePosition, daysRemainingFontSize, daysRemainingPosition
    ]);


    if (!widget) return null;

    const handleSave = () => {
        updateCustomWidget(widget.id, {
            name: name.trim() || "Безымянный таймер",
            cycleDays: cycleDays > 0 ? cycleDays : 1,
            lastResetDate,
            fillColors,
            animation,
            showName,
            nameFontSize,
            namePosition,
            daysRemainingFontSize,
            daysRemainingPosition,
        });
        onClose();
    };
    
    const handleColorChange = (index: number, color: string) => {
        const newColors: [string, string, string] = [...fillColors];
        newColors[index] = color;
        setFillColors(newColors);
    };

    const formattedDate = lastResetDate ? format(parseISO(lastResetDate), 'yyyy-MM-dd') : '';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-2xl ring-1 ring-black/5 dark:ring-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настроить виджет-таймер</h2>
                </div>
                <div className="flex">
                    <div className="w-1/2 p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar border-r border-gray-200 dark:border-gray-700">
                        <LabeledInput label="Название">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </LabeledInput>
                        <LabeledInput label="Интервал (дней)">
                            <input type="number" min="1" value={cycleDays} onChange={e => setCycleDays(parseInt(e.target.value, 10) || 1)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </LabeledInput>
                        <LabeledInput label="Дата последнего события">
                            <input type="date" value={formattedDate} onChange={e => setLastResetDate(e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]" />
                        </LabeledInput>
                        <LabeledInput label="Анимация заливки">
                            <select value={animation} onChange={e => setAnimation(e.target.value as 'smooth' | 'wave' | 'bubbles' | 'none')} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                <option value="smooth">Плавная</option>
                                <option value="wave">Волна</option>
                                <option value="bubbles">Пузырьки</option>
                                <option value="none">Нет</option>
                            </select>
                        </LabeledInput>
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Показывать название</label>
                            <button
                            onClick={() => setShowName(!showName)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showName ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}
                            >
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showName ? 'translate-x-6' : 'translate-x-1'}`}/>
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цвета градиента</label>
                            <div className="flex items-center justify-between gap-4">
                            {['Начало', 'Середина', 'Конец'].map((label, index) => (
                                <div key={index} className="flex flex-col items-center">
                                    <input type="color" value={fillColors[index]} onChange={e => handleColorChange(index, e.target.value)} className="w-12 h-12 p-0 border-none rounded-md cursor-pointer bg-transparent"/>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>
                                </div>
                            ))}
                            <div className="flex-1 h-12 rounded-md" style={{ background: `linear-gradient(to right, ${fillColors[0]}, ${fillColors[1]}, ${fillColors[2]})` }}/>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Расположение элементов</h3>
                            
                            <div className="space-y-2 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Название</p>
                                <LabeledInput label="Размер шрифта (px)">
                                    <input type="number" placeholder="Авто (18px)" value={nameFontSize ?? ''} onChange={e => setNameFontSize(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </LabeledInput>
                                <div className="grid grid-cols-2 gap-2">
                                    <LabeledInput label="Позиция X (%)">
                                        <input type="number" min="0" max="100" value={namePosition.x} onChange={e => setNamePosition(p => ({ ...p, x: parseInt(e.target.value) || 0 }))} className="w-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </LabeledInput>
                                    <LabeledInput label="Позиция Y (%)">
                                        <input type="number" min="0" max="100" value={namePosition.y} onChange={e => setNamePosition(p => ({ ...p, y: parseInt(e.target.value) || 0 }))} className="w-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </LabeledInput>
                                </div>
                            </div>

                            <div className="space-y-2 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg mt-3">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Оставшиеся дни</p>
                                <LabeledInput label="Размер шрифта (px)">
                                    <input type="number" placeholder="Авто (88px)" value={daysRemainingFontSize ?? ''} onChange={e => setDaysRemainingFontSize(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </LabeledInput>
                                <div className="grid grid-cols-2 gap-2">
                                    <LabeledInput label="Позиция X (%)">
                                        <input type="number" min="0" max="100" value={daysRemainingPosition.x} onChange={e => setDaysRemainingPosition(p => ({ ...p, x: parseInt(e.target.value) || 0 }))} className="w-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </LabeledInput>
                                    <LabeledInput label="Позиция Y (%)">
                                        <input type="number" min="0" max="100" value={daysRemainingPosition.y} onChange={e => setDaysRemainingPosition(p => ({ ...p, y: parseInt(e.target.value) || 0 }))} className="w-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </LabeledInput>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-1/2 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-r-2xl">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">Предпросмотр</p>
                        <div className="w-[250px] h-[250px]">
                            <EventTimerWidgetCard device={previewDevice} colorScheme={currentColorScheme} />
                        </div>
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

export default EventTimerSettingsModal;