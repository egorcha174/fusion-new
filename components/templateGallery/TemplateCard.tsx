
import React from 'react';
import { GalleryTemplate } from '../../config/galleryTemplates';
import { Icon } from '@iconify/react';

interface TemplateCardProps {
  template: GalleryTemplate;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const handleInstall = () => {
      // Placeholder for future logic
      alert(`Шаблон "${template.name}" будет добавлен в вашу библиотеку в следующем обновлении!`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">
      <div className="h-32 bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center relative">
         <Icon icon={template.previewIcon} className="w-16 h-16 text-gray-400 dark:text-gray-500" />
         <div className="absolute top-2 right-2 bg-black/20 dark:bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
             {template.deviceType}
         </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-gray-900 dark:text-white">{template.name}</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-grow">
            {template.description}
        </p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400">v{template.version} • {template.author}</span>
            <button 
                onClick={handleInstall}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
                <Icon icon="mdi:download" className="w-3 h-3" />
                Установить
            </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
