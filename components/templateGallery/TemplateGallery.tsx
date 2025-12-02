


import React from 'react';
import { useTemplateGalleryStore } from '../../store/templateGalleryStore';
import { useAppStore } from '../../store/appStore';
import TemplateFilter from './TemplateFilter';
import TemplateCard from './TemplateCard';
import { Icon } from '@iconify/react';

const TemplateGallery: React.FC = () => {
  const { getFilteredTemplates } = useTemplateGalleryStore();
  const { setCurrentPage, setSettingsOpen } = useAppStore();
  const templates = getFilteredTemplates();

  return (
    <div className="container mx-auto min-h-screen p-6">
      <div className="flex items-center gap-4 mb-8">
         <button 
            onClick={() => {
                setCurrentPage('dashboard');
                setSettingsOpen(true);
            }}
            className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ring-1 ring-black/5 dark:ring-white/10"
         >
             <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-700 dark:text-gray-300" />
         </button>
         <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Галерея шаблонов</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Выберите готовый дизайн для ваших карточек</p>
         </div>
      </div>

      <TemplateFilter />

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map(template => (
            <TemplateCard key={template.id} template={template} />
            ))}
        </div>
      ) : (
          <div className="text-center py-20">
              <Icon icon="mdi:view-grid-off-outline" className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Шаблоны не найдены</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Попробуйте изменить параметры поиска</p>
          </div>
      )}
    </div>
  );
};

export default TemplateGallery;