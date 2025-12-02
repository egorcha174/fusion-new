import React, { useRef, useState } from 'react';

interface SubMenuItemProps {
    children: React.ReactNode;
    title: string;
}

const SubMenuItem: React.FC<SubMenuItemProps> = ({ children, title }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const [submenuClasses, setSubmenuClasses] = useState('left-full top-[-5px]');

    const handleMouseEnter = () => {
        if (!itemRef.current) return;
        
        const parentMenu = itemRef.current.closest('[role="menu"]');
        if (!parentMenu) return;
        const parentRect = parentMenu.getBoundingClientRect();
        
        const SUBMENU_WIDTH_ESTIMATE = 160; 
        
        const itemRect = itemRef.current.getBoundingClientRect();
        const SUBMENU_HEIGHT_ESTIMATE = (React.Children.count(children) * 32) + 16; 

        let classes = '';

        if (parentRect.right + SUBMENU_WIDTH_ESTIMATE > window.innerWidth) {
            classes += 'right-full ';
        } else {
            classes += 'left-full ';
        }

        if (itemRect.top + SUBMENU_HEIGHT_ESTIMATE > window.innerHeight) {
            classes += 'bottom-0 ';
        } else {
            classes += 'top-[-5px] ';
        }

        setSubmenuClasses(classes);
    };

    return (
        <div
            ref={itemRef}
            className="relative group/menu"
            onMouseEnter={handleMouseEnter}
        >
            <div className="px-3 py-1.5 rounded-md cursor-default flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-700/80">
                {title}
                <span className="text-xs ml-4">▶</span>
            </div>
            <div className={`absolute z-10 hidden group-hover/menu:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 min-w-[150px] ${submenuClasses}`}>
                {children}
            </div>
        </div>
    );
};

export default SubMenuItem;
