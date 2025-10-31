
import React from 'react';

interface HeaderProps {
    isEditMode: boolean;
    onToggleEditMode: () => void;
    onNavigateToSettings: () => void;
}

const HeaderButton: React.FC<{onClick?: () => void, isActive?: boolean, children: React.ReactNode}> = ({ onClick, isActive, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600/90'
        }`}
    >
        {children}
    </button>
);


const Header: React.FC<HeaderProps> = ({ isEditMode, onToggleEditMode, onNavigateToSettings }) => {
    return (
        <header className="fixed top-0 left-64 right-0 h-16 bg-gray-800/80 backdrop-blur-lg ring-1 ring-white/10 z-30 flex items-center px-6">
            <div className="flex items-center gap-4 w-full">
                <HeaderButton onClick={onToggleEditMode} isActive={isEditMode}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>{isEditMode ? 'Готово' : 'Редактирование интерфейса'}</span>
                </HeaderButton>

                <HeaderButton>
                    <span>&lt;/&gt; Код</span>
                </HeaderButton>

                <div className="flex-1 flex justify-center">
                     <input type="text" placeholder="Поиск" className="bg-gray-700/80 w-1/3 max-w-xs px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <HeaderButton onClick={onNavigateToSettings}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Настройки</span>
                </HeaderButton>

                <HeaderButton>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                </HeaderButton>
            </div>
        </header>
    );
};

export default Header;
