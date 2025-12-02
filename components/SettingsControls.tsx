import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { ColorScheme } from '../types';

// --- Helper Components ---

export const Section: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean, description?: string }> = ({ title, children, defaultOpen = false, description }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left group">
        <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        <Icon icon="mdi:chevron-down" className={`w-6 h-6 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
    </div>
  );
};

export const LabeledInput: React.FC<{ label: string, children: React.ReactNode, description?: string }> = ({ label, children, description }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</label>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
        {children}
    </div>
);

export const ColorInput: React.FC<{ 
    label: string; 
    path: string; 
    value: string; 
    onUpdate: (path: string, value: any) => void;
}> = ({ label, path, value, onUpdate }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <label className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</label>
        <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-mono text-gray-400 uppercase">{value}</span>
            <input type="color" value={value || '#000000'} onChange={e => onUpdate(path, e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent shadow-sm"/>
        </div>
    </div>
);

export const RangeInput: React.FC<{ 
    label: string; 
    path: string; 
    value: number; 
    min: number; 
    max: number; 
    step: number; 
    unit?: string;
    onUpdate: (path: string, value: any) => void;
}> = ({ label, path, value, min, max, step, unit, onUpdate }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <label className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</label>
        <div className="flex items-center gap-2">
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onUpdate(path, parseFloat(e.target.value))} className="w-full accent-blue-500"/>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-12 text-right">{value}{unit}</span>
        </div>
    </div>
);

export const ThemeEditor: React.FC<{ 
    themeType: 'light' | 'dark',
    colorScheme: ColorScheme,
    onUpdate: (path: string, value: any) => void;
}> = ({ themeType, colorScheme, onUpdate }) => {
    const scheme = colorScheme[themeType];
    const pathPrefix = themeType;
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image')) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                onUpdate(`${themeType}.dashboardBackgroundImage`, reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-4">
            <Section title="Фон дашборда" defaultOpen={true}>
                <LabeledInput label="Тип фона">
                    <select value={scheme.dashboardBackgroundType} onChange={e => onUpdate(`${pathPrefix}.dashboardBackgroundType`, e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="color">Сплошной цвет</option>
                        <option value="gradient">Градиент</option>
                        <option value="image">Изображение</option>
                    </select>
                </LabeledInput>
                {scheme.dashboardBackgroundType === 'image' ? (
                    <>
                        <LabeledInput label="Загрузить фон"><input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-gray-500 dark:text-gray-400"/></LabeledInput>
                        <RangeInput onUpdate={onUpdate} label="Размытие" path={`${pathPrefix}.dashboardBackgroundImageBlur`} value={scheme.dashboardBackgroundImageBlur || 0} min={0} max={50} step={1} unit="px" />
                        <RangeInput onUpdate={onUpdate} label="Яркость" path={`${pathPrefix}.dashboardBackgroundImageBrightness`} value={scheme.dashboardBackgroundImageBrightness || 100} min={0} max={200} step={5} unit="%" />
                    </>
                ) : (
                     <>
                        <ColorInput onUpdate={onUpdate} label="Цвет 1" path={`${pathPrefix}.dashboardBackgroundColor1`} value={scheme.dashboardBackgroundColor1} />
                        {scheme.dashboardBackgroundType === 'gradient' && <ColorInput onUpdate={onUpdate} label="Цвет 2" path={`${pathPrefix}.dashboardBackgroundColor2`} value={scheme.dashboardBackgroundColor2 || '#ffffff'} />}
                     </>
                )}
            </Section>
             <Section title="Прозрачность">
                <RangeInput onUpdate={onUpdate} label="Карточки" path={`${pathPrefix}.cardOpacity`} value={scheme.cardOpacity || 1} min={0} max={1} step={0.05} />
                <RangeInput onUpdate={onUpdate} label="Панели" path={`${pathPrefix}.panelOpacity`} value={scheme.panelOpacity || 1} min={0} max={1} step={0.05} />
            </Section>
            <Section title="Карточки">
                <RangeInput onUpdate={onUpdate} label="Скругление углов" path={`${pathPrefix}.cardBorderRadius`} value={scheme.cardBorderRadius ?? 16} min={0} max={24} step={1} unit="px" />
                <ColorInput onUpdate={onUpdate} label="Фон (Выкл)" path={`${pathPrefix}.cardBackground`} value={scheme.cardBackground} />
                <ColorInput onUpdate={onUpdate} label="Фон (Вкл)" path={`${pathPrefix}.cardBackgroundOn`} value={scheme.cardBackgroundOn} />
                <hr className="my-4 border-gray-200 dark:border-gray-700"/>
                <RangeInput onUpdate={onUpdate} label="Ширина рамки" path={`${pathPrefix}.cardBorderWidth`} value={scheme.cardBorderWidth ?? 0} min={0} max={5} step={1} unit="px" />
                <ColorInput onUpdate={onUpdate} label="Цвет рамки (Выкл)" path={`${pathPrefix}.cardBorderColor`} value={scheme.cardBorderColor || '#000000'} />
                <ColorInput onUpdate={onUpdate} label="Цвет рамки (Вкл)" path={`${pathPrefix}.cardBorderColorOn`} value={scheme.cardBorderColorOn || '#ffffff'} />
                 <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Иконки</h4>
                    <LabeledInput label="Форма фона">
                        <select value={scheme.iconBackgroundShape || 'circle'} onChange={e => onUpdate(`${pathPrefix}.iconBackgroundShape`, e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                            <option value="circle">Круг</option>
                            <option value="rounded-square">Скругленный квадрат</option>
                        </select>
                    </LabeledInput>
                     <ColorInput onUpdate={onUpdate} label="Фон иконки (Вкл)" path={`${pathPrefix}.iconBackgroundColorOn`} value={scheme.iconBackgroundColorOn || ''} />
                     <ColorInput onUpdate={onUpdate} label="Фон иконки (Выкл)" path={`${pathPrefix}.iconBackgroundColorOff`} value={scheme.iconBackgroundColorOff || ''} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700 pb-1 mb-2 mt-4">Текст (Выкл)</h4>
                <ColorInput onUpdate={onUpdate} label="Название" path={`${pathPrefix}.nameTextColor`} value={scheme.nameTextColor} />
                <ColorInput onUpdate={onUpdate} label="Статус" path={`${pathPrefix}.statusTextColor`} value={scheme.statusTextColor} />
                <ColorInput onUpdate={onUpdate} label="Значение" path={`${pathPrefix}.valueTextColor`} value={scheme.valueTextColor} />
                <ColorInput onUpdate={onUpdate} label="Ед. изм." path={`${pathPrefix}.unitTextColor`} value={scheme.unitTextColor} />
                 <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pt-2 border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">Текст (Вкл)</h4>
                <ColorInput onUpdate={onUpdate} label="Название" path={`${pathPrefix}.nameTextColorOn`} value={scheme.nameTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Статус" path={`${pathPrefix}.statusTextColorOn`} value={scheme.statusTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Значение" path={`${pathPrefix}.valueTextColorOn`} value={scheme.valueTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Ед. изм." path={`${pathPrefix}.unitTextColorOn`} value={scheme.unitTextColorOn} />
            </Section>
             <Section title="Элементы интерфейса">
                <ColorInput onUpdate={onUpdate} label="Текст вкладок" path={`${pathPrefix}.tabTextColor`} value={scheme.tabTextColor} />
                <ColorInput onUpdate={onUpdate} label="Активная вкладка" path={`${pathPrefix}.activeTabTextColor`} value={scheme.activeTabTextColor} />
                <ColorInput onUpdate={onUpdate} label="Индикатор вкладки" path={`${pathPrefix}.tabIndicatorColor`} value={scheme.tabIndicatorColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет часов" path={`${pathPrefix}.clockTextColor`} value={scheme.clockTextColor} />
            </Section>
            <Section title="Термостат">
                <ColorInput onUpdate={onUpdate} label="Ручка" path={`${pathPrefix}.thermostatHandleColor`} value={scheme.thermostatHandleColor} />
                <ColorInput onUpdate={onUpdate} label="Текст цели" path={`${pathPrefix}.thermostatDialTextColor`} value={scheme.thermostatDialTextColor} />
                <ColorInput onUpdate={onUpdate} label="Подпись цели" path={`${pathPrefix}.thermostatDialLabelColor`} value={scheme.thermostatDialLabelColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет нагрева" path={`${pathPrefix}.thermostatHeatingColor`} value={scheme.thermostatHeatingColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет охлаждения" path={`${pathPrefix}.thermostatCoolingColor`} value={scheme.thermostatCoolingColor} />
            </Section>
            <Section title="Виджет Погоды">
                <RangeInput onUpdate={onUpdate} label="Размер иконки (сейчас)" path={`${pathPrefix}.weatherIconSize`} value={scheme.weatherIconSize || 96} min={32} max={128} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Размер иконок (прогноз)" path={`${pathPrefix}.weatherForecastIconSize`} value={scheme.weatherForecastIconSize || 48} min={24} max={96} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (темп. сейчас)" path={`${pathPrefix}.weatherCurrentTempFontSize`} value={scheme.weatherCurrentTempFontSize || 36} min={16} max={72} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (описание)" path={`${pathPrefix}.weatherCurrentDescFontSize`} value={scheme.weatherCurrentDescFontSize || 14} min={10} max={24} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (день)" path={`${pathPrefix}.weatherForecastDayFontSize`} value={scheme.weatherForecastDayFontSize || 12} min={8} max={20} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (макс. темп.)" path={`${pathPrefix}.weatherForecastMaxTempFontSize`} value={scheme.weatherForecastMaxTempFontSize || 18} min={12} max={32} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (мин. темп.)" path={`${pathPrefix}.weatherForecastMinTempFontSize`} value={scheme.weatherForecastMinTempFontSize || 14} min={10} max={24} step={1} unit="px" />
            </Section>
        </div>
    );
};
