








import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tab, ColorThemeSet } from '../types';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';


interface SortableTabProps {
    tab: Tab;
    isActive: boolean;
    isEditMode: boolean;
    onSelect: () => void;
    onEdit: () => void;
    colorScheme: ColorThemeSet;
}

/**
 * Компонент вкладки, поддерживающий перетаскивание (Drag-and-Drop) в режиме редактирования.
 * Использует хуки из библиотеки @dnd-kit/sortable.
 */
const SortableTab: React.FC<SortableTabProps> = ({ tab, isActive, isEditMode, onSelect, onEdit, colorScheme }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id, disabled: !isEditMode });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1, // Поднимаем перетаскиваемую вкладку наверх
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <button
                onClick={onSelect}
                className={`relative group whitespace-nowrap px-4 py-2 text-lg font-semibold transition-colors`}
                style={{ color: isActive ? colorScheme.activeTabTextColor : colorScheme.tabTextColor }}
            >
                {/* В режиме редактирования, `listeners` вешается на текст, чтобы сделать его "ручкой" для перетаскивания */}
                {isEditMode ? <span {...listeners} className="cursor-move">{tab.name}</span> : tab.name}
                {isActive && (
                    <div 
                        className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" 
                        style={{ backgroundColor: colorScheme.tabIndicatorColor }}
                    />
                )}
                {isEditMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                )}
            </button>
        </div>
    );
};

/**
 * Верхняя панель (хедер) приложения.
 * Содержит навигацию по вкладкам, поиск, меню настроек и переключатель режима редактирования.
 */
const DashboardHeader: React.FC = () => {
    const {
        tabs, activeTabId, setActiveTabId, handleTabOrderChange,
        isEditMode, setIsEditMode, setCurrentPage, handleAddTab, setEditingTab,
        currentPage, searchTerm, setSearchTerm, theme, setTheme, colorScheme
    } = useAppStore();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Используем PointerSensor для drag-and-drop, активирующийся после смещения на 5px.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Определяем текущую цветовую схему на основе настроек темы и системных предпочтений.
    const isSystemDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
    const isDark = useMemo(() => theme === 'night' || (theme === 'auto' && isSystemDark), [theme, isSystemDark]);
    const currentColorScheme = useMemo(() => isDark ? colorScheme.dark : colorScheme.light, [isDark, colorScheme]);

    // Обработчик завершения перетаскивания вкладки.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = tabs.findIndex((t) => t.id === active.id);
            const newIndex = tabs.findIndex((t) => t.id === over.id);
            handleTabOrderChange(arrayMove(tabs, oldIndex, newIndex)); // Вызываем действие для изменения порядка в хранилище.
        }
    };

    const handleTabChange = (tabId: string) => {
        setActiveTabId(tabId);
        setCurrentPage('dashboard');
    }

    const showSearchBar = currentPage === 'dashboard' || currentPage === 'all-devices' || currentPage === 'all-entities';

    // Функция для рендеринга пунктов меню (используется и для десктопа, и для мобильной версии).
    const renderMenuItems = () => (
        <div className="py-1">
            <button onClick={() => { setIsEditMode(!isEditMode); setIsMenuOpen(false); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span>{isEditMode ? 'Готово' : 'Редактировать'}</span>
            </button>
            <button onClick={() => { setCurrentPage('all-entities'); setIsMenuOpen(false); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${currentPage === 'all-entities' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                 <Icon icon="mdi:format-list-bulleted-type" className="h-5 w-5" />
                <span>Все сущности</span>
            </button>
            <button onClick={() => { setCurrentPage('all-devices'); setIsMenuOpen(false); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${currentPage === 'all-devices' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                 <Icon icon="mdi:chip" className="h-5 w-5" />
                <span>Все устройства</span>
            </button>
            <button onClick={() => { setCurrentPage('settings'); setIsMenuOpen(false); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${currentPage === 'settings' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Настройки</span>
            </button>
        </div>
    );
    
    const headerBackgroundColor = isDark 
    ? `rgba(28, 28, 30, ${currentColorScheme.panelOpacity ?? 0.75})` 
    : `rgba(240, 245, 255, ${currentColorScheme.panelOpacity ?? 0.7})`;

    return (
        <header 
            className="relative z-30 flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700/50 gap-4 backdrop-blur-xl"
            style={{ backgroundColor: headerBackgroundColor }}
        >
            {/* Кнопка "бургер" для мобильных устройств */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
                <div className="overflow-x-auto whitespace-nowrap no-scrollbar">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
                            <nav className="flex items-center">
                            {tabs.map(tab => (
                                <SortableTab key={tab.id} tab={tab} isActive={tab.id === activeTabId && currentPage === 'dashboard'} isEditMode={isEditMode} onSelect={() => handleTabChange(tab.id)} onEdit={() => setEditingTab(tab)} colorScheme={currentColorScheme} />
                            ))}
                             {isEditMode && (
                                <div className="flex items-center flex-shrink-0">
                                    <button onClick={handleAddTab} className="ml-2 px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-400 dark:hover:bg-gray-600">+</button>
                                </div>
                            )}
                            </nav>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Поле поиска, скрывается на маленьких экранах */}
            <div className="flex-1 min-w-0 hidden sm:block">
                {showSearchBar && (
                    <div className="relative max-w-xs w-full ml-auto">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg></span>
                        <input type="search" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                    </div>
                )}
            </div>

            {/* Меню "три точки" для десктопа */}
            <div className="relative flex-shrink-0 hidden lg:block">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
                {isMenuOpen && (
                     <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 ring-1 ring-black/5 dark:ring-white/10">
                        {renderMenuItems()}
                    </div>
                )}
            </div>
            
            {/* Выезжающее меню для мобильных устройств */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute top-0 left-0 h-full bg-white dark:bg-gray-800 w-64 p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/10 fade-in" onClick={e => e.stopPropagation()}>
                         <h2 className="text-xl font-bold mb-4">Меню</h2>
                         {renderMenuItems()}
                    </div>
                </div>
            )}
        </header>
    );
};

export default React.memo(DashboardHeader);