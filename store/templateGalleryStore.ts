
import { create } from 'zustand';
import { GALLERY_TEMPLATES, GalleryTemplate } from '../config/galleryTemplates';

interface TemplateGalleryState {
  templates: GalleryTemplate[];
  searchQuery: string;
  categoryFilter: string | null;
}

interface TemplateGalleryActions {
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  getFilteredTemplates: () => GalleryTemplate[];
}

export const useTemplateGalleryStore = create<TemplateGalleryState & TemplateGalleryActions>((set, get) => ({
  templates: GALLERY_TEMPLATES,
  searchQuery: '',
  categoryFilter: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category === 'all' ? null : category }),

  getFilteredTemplates: () => {
    const { templates, searchQuery, categoryFilter } = get();
    return templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter ? t.deviceType === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  },
}));
