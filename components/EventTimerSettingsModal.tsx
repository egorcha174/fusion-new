import React, { useState } from 'react';
import { EventTimerWidget } from '../types';
import { useAppStore } from '../store/appStore';

interface EventTimerSettingsModalProps {
    widget: EventTimerWidget;
    onClose: () => void;
}

const EventTimerSettingsModal: React.FC<EventTimerSettingsModalProps> = ({ widget, onClose }) => {
    // FIX: Correctly destructure the `updateCustomWidget` action which is now implemented in the store.
    const { updateCustomWidget } = useAppStore();
    const [name, setName] = useState(widget.name);
    const [cycleDays, setCycleDays] = useState(widget.cycleDays);
    const [buttonText, setButtonText] = useState(widget.buttonText);

    const handleSave = () => {
        updateCustomWidget(widget.id, {
            name: name.trim() || "Безымянный таймер",
            cycleDays: cycleDays > 0 ? cycleDays : 1,
            buttonText: buttonText.trim() || "Сброс",
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-black/5 dark:ring-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настроить виджет-таймер</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="widgetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название</label>
                        <input id="widgetName" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="cycleDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Интервал (дней)</label>
                        <input id="cycleDays" type="number" min="1" value={cycleDays} onChange={e => setCycleDays(parseInt(e.target.value, 10))} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="buttonText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Текст кнопки сброса</label>
                        <input id="buttonText" type="text" value={buttonText} onChange={e => setButtonText(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
