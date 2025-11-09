
import React, { useEffect, useRef, useState } from 'react';
import { ColorPickerContextData } from '../types';

const FONT_FAMILIES = [
    { name: 'Системный', value: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"` },
    { name: 'San Francisco (SF Pro)', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { name: 'С засечками', value: 'Georgia, serif' },
    { name: 'Моноширинный', value: 'monospace' },
];

const ColorPickerContextMenu: React.FC<{ data: ColorPickerContextData, onClose: () => void }> = ({ data, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: data.x, y: data.y });
    
    // Adjust position to stay within viewport
    useEffect(() => {
        if (menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            let newX = data.x;
            if (data.x + menuRect.width > window.innerWidth) {
                newX = window.innerWidth - menuRect.width - 10;
            }
            let newY = data.y;
            if (data.y + menuRect.height > window.innerHeight) {
                newY = window.innerHeight - menuRect.height - 10;
            }
            setPosition({ x: newX, y: newY });
        }
    }, [data.x, data.y]);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        data.onUpdate('color', e.target.value);
    };

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        data.onUpdate('fontFamily', e.target.value);
    };
    
    const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
        data.onUpdate('fontSize', value);
    };
    
    const handleResetFont = (type: 'Family' | 'Size') => {
        data.onUpdate(type === 'Family' ? 'fontFamily' : 'fontSize', undefined);
    };


    return (
        <div className="fixed inset-0 z-[60]" onMouseDown={onClose}>
            <div
                ref={menuRef}
                className="fixed z-50 bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl ring-1 ring-white/10 p-4 text-sm text-gray-200 w-64 space-y-4 fade-in"
                style={{ top: position.y, left: position.x }}
                onMouseDown={e => e.stopPropagation()}
            >
                <div>
                    <h3 className="font-bold text-base text-white">Редактор стиля</h3>
                    <p className="text-xs text-gray-400 truncate" title={data.targetName}>{data.targetName}</p>
                </div>
                
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Цвет</h4>
                    <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg">
                        <span className="text-sm">{data.initialValue.toUpperCase()}</span>
                        <input
                            type="color"
                            value={data.initialValue}
                            onChange={handleColorChange}
                            className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                        />
                    </div>
                </div>

                {data.isTextElement && (
                    <div className="space-y-3 pt-3 border-t border-gray-700/50">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Типографика</h4>
                        <div>
                            <div className="flex items-center justify-between">
                               <label htmlFor="font-family" className="text-sm text-gray-300">Шрифт</label>
                               <button onClick={() => handleResetFont('Family')} className="text-xs text-gray-500 hover:text-white">Сбросить</button>
                            </div>
                            <select
                                id="font-family"
                                value={data.initialFontFamily || ''}
                                onChange={handleFontFamilyChange}
                                className="mt-1 w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">По умолчанию</option>
                                {FONT_FAMILIES.map(font => (
                                    <option key={font.name} value={font.value}>{font.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="font-size" className="text-sm text-gray-300">Размер</label>
                                <button onClick={() => handleResetFont('Size')} className="text-xs text-gray-500 hover:text-white">Сбросить</button>
                            </div>
                            <div className="relative">
                                <input
                                    id="font-size"
                                    type="number"
                                    placeholder="Авто"
                                    value={data.initialFontSize ?? ''}
                                    onChange={handleFontSizeChange}
                                    className="mt-1 w-full bg-gray-900/80 text-gray-100 border border-gray-600 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">px</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(ColorPickerContextMenu);