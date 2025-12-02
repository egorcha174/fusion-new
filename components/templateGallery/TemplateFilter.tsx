
import React from 'react';
import { useTemplateGalleryStore } from '../../store/templateGalleryStore';
import { Icon } from '@iconify/react';

const TemplateFilter: React.FC = () => {
  const { searchQuery, setSearchQuery, categoryFilter, setCategoryFilter } = useTemplateGalleryStore();

  const categories = [
    { id: 'all', label: 'Все' },
    { id: 'light', label: 'Свет' },
    { id: 'sensor', label: 'Сенсоры' },
    { id: 'climate', label: 'Климат' },
    { id: 'switch', label: 'Переключатели' },
    { id: 'custom', label: 'Кастомные' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-grow">
        <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Поиск шаблонов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pl-10 pr-4 py-2 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              (categoryFilter === cat.id || (cat.id === 'all' && !categoryFilter))
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateFilter;
