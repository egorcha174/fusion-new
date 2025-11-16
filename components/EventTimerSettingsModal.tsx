import React, { useState, useEffect } from 'react';
import { EventTimerWidget } from '../types';
import { useAppStore } from '../store/appStore';
// FIX: Changed import for parseISO to a subpath import to fix module resolution error.
import { format } from 'date-fns';
import { parseISO } from 'date-fns/parseISO';

interface EventTimerSettingsModalProps {
    widgetId: string;
    onClose: () => void;
}

const LabeledInput: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
        {children}
    </div>
);

const EventTimerSettingsModal: React.FC<EventTimerSettingsModalProps> = ({ widgetId, onClose }) => {
    const { eventTimerWidgets, updateCustomWidget } = useAppStore();
    const widget = eventTimerWidgets.find(w => w.id === widgetId);

    const [name, setName] = useState('');
    const [cycleDays, setCycleDays] = useState(14);
    const [buttonText, setButtonText] = useState('Сброс');
    const [lastResetDate, setLastResetDate] = useState<string | null>(null);
    const [fillColors, setFillColors] = useState<[string, string, string]>(['#22c55e', '#f59e0b', '#ef4444']);
    const [animation, setAnimation] = useState<'smooth' | 'wave'>('smooth');
    const [showName, setShowName] = useState(false);

    useEffect(() => {
        if (widget) {
            setName(widget.name);
            setCycleDays(widget.cycleDays);
            setButtonText(widget.buttonText);
            setLastResetDate(widget.lastResetDate);
            setFillColors(widget.fillColors || ['#22c55e', '#f59e0b', '#ef4444']);
            setAnimation(widget.animation || 'smooth');
            setShowName(widget.showName || false);
        }
    }, [widget]);

    if (!widget) return null;

    const handleSave = () => {
        updateCustomWidget(widget.id, {
            name: name.trim() || "Безымянный таймер",
            cycleDays: cycleDays > 0 ? cycleDays : 1,
            buttonText: buttonText.trim() || "Сброс",
            lastResetDate,
            fillColors,
            animation,
            showName,
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-black/5 dark:ring-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настроить виджет-таймер</h2>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                    <LabeledInput label="Название">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </LabeledInput>
                     <LabeledInput label="Текст кнопки сброса">
                        <input type="text" value={buttonText} onChange={e => setButtonText(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </LabeledInput>
                    <LabeledInput label="Интервал (дней)">
                        <input type="number" min="1" value={cycleDays} onChange={e => setCycleDays(parseInt(e.target.value, 10) || 1)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </LabeledInput>
                    <LabeledInput label="Дата последнего события">
                        <input type="date" value={formattedDate} onChange={e => setLastResetDate(e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]" />
                    </LabeledInput>
                    <LabeledInput label="Анимация заливки">
                         <select value={animation} onChange={e => setAnimation(e.target.value as 'smooth' | 'wave')} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                            <option value="smooth">Плавная</option>
                            <option value="wave">Волна</option>
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