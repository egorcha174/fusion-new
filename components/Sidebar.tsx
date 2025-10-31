
import React from 'react';
import { Room } from '../types';

type Page = 'dashboard' | 'settings';

interface SidebarProps {
  rooms: Room[];
  currentPage: Page;
  onNavigate: (page: Page, sectionId?: string) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

const NavItem: React.FC<{
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ isActive, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full h-12 px-4 rounded-lg text-left transition-colors duration-200 ${
      isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
    }`}
  >
    <div className="w-6 h-6">{icon}</div>
    <span className="ml-4 font-medium">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({
  rooms,
  currentPage,
  onNavigate,
  isEditMode,
  onToggleEditMode,
}) => {
  return (
    <aside
      className="fixed top-0 left-0 h-full bg-gray-800/80 backdrop-blur-lg ring-1 ring-white/10 text-white flex flex-col transition-all duration-300 ease-in-out w-64"
    >
      <div className="flex items-center justify-between h-20 px-4">
        <h1 className="text-xl font-bold">Home UI</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavItem
          isActive={currentPage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          icon={<svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>}
          label="Дашборд"
        />
        <div className="pt-2">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Комнаты</h3>
             <div className="mt-2 space-y-1">
             {rooms.map(room => (
                <button
                    key={room.id}
                    onClick={() => onNavigate('dashboard', room.id)}
                    className="flex items-center w-full h-10 px-4 rounded-lg text-sm text-left text-gray-400 hover:bg-gray-700/50 hover:text-white"
                >
                    {room.name}
                </button>
            ))}
             </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <NavItem
          isActive={isEditMode}
          onClick={onToggleEditMode}
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>}
          label={isEditMode ? 'Готово' : 'Редактировать'}
        />
        <NavItem
          isActive={currentPage === 'settings'}
          onClick={() => onNavigate('settings')}
          icon={<svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226.55-.223 1.159-.223 1.71 0 .55.223 1.02.684 1.11 1.226l.08.481c.09.52.448.97.923 1.185.474.214.99.214 1.464 0 .474-.214.833-.665.923-1.185l.08-.48c.09-.543.56-1.004 1.11-1.227.55-.223 1.159-.223 1.71 0 .55.223 1.02.684 1.11 1.227l.08.48c.09.52.448.97.923 1.185.474.214.99.214 1.464 0 .474-.214.833-.665.923-1.185l.08-.481a2.625 2.625 0 10-5.25 0l.08.48c.09.52.448.97.923 1.185.474.214.99.214 1.464 0 .474-.214.833-.665.923-1.185l.08-.48a2.625 2.625 0 10-5.25 0l.08.481c.09.52.448.97.923 1.185.474.214.99.214 1.464 0 .474-.214.833-.665.923-1.185l.08-.481z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          label="Настройки"
        />
      </div>
    </aside>
  );
};

export default Sidebar;
