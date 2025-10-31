
import React from 'react';
import { Room, Page } from '../types';

interface SidebarProps {
  rooms: Room[];
  currentPage: Page;
  onNavigate: (page: Page, sectionId?: string) => void;
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
}) => {
  return (
    <aside
      className="fixed top-0 left-0 h-full bg-gray-800/80 backdrop-blur-lg ring-1 ring-white/10 text-white flex flex-col transition-all duration-300 ease-in-out w-64"
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Header content can go here if needed in the future */}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavItem
          isActive={currentPage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>}
          label="Дашборд"
        />
        <NavItem
          isActive={currentPage === 'all-devices'}
          onClick={() => onNavigate('all-devices')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>}
          label="Все устройства"
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
    </aside>
  );
};

export default Sidebar;
